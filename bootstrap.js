const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");

function LOG(msg) {
  Services.console.logStringMessage("reb:" + msg);
}

function isFennec() {
  return Services.appinfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}";
}

let gBaseSocket = Cc["@mozilla.org/tcp-socket;1"].createInstance(Ci.nsIDOMTCPSocket);
let gCurrentSock = null;
let gVideoStream = null;

const kButtonId = "tab-share-ea99e696-aab4-44d6-b69e-2701863d2e1c";

function error(msg) {
  LOG("Error: " + msg);
}

function createSocket(window, pc, offer) {
  let target = "10.0.1.23";
//  let target = "localhost";
//  let target = "10.252.28.237";
  let socket = gBaseSocket.open(target, 8088, {useSecureTransport: false, binaryType: 'string'});

  socket.ondata = function(response) {
    LOG("response->\n" + response.data);
    pc.setRemoteDescription(
      new window.mozRTCSessionDescription({"type":"answer", "sdp":response.data}),
      function() {
        LOG("Set description");
        if (isFennec()) {
          window.NativeWindow.menu.update(gMenuItem, { name: "Stop Tab Stream" });
        }
      },
      error);
  };

  socket.onerror = function(err) {
    LOG("Failed sending string: " + JSON.stringify(err));
    gCurrentSock = null;
    if (gVideoStream) {
      gVideoStream.stop();
      gVideoStream = null;
    }
  };

  socket.onopen = function() {
    LOG("offer->\n" + offer.sdp);
    socket.send(offer.sdp, offer.sdp.length);
  };

  return socket;
}

function gum(window, stream) {
LOG("gum");
  gVideoStream = stream;

  let pc = new window.mozRTCPeerConnection;

  pc.addStream(stream);

  pc.createOffer(function(offer) {
    pc.setLocalDescription(new window.mozRTCSessionDescription(offer), function() {
LOG("Sending offer");
      gCurrentSock = createSocket(window, pc, offer);
    }, error);
  }, error);
}

let gMenuItem = null;

function streamFennecTab () {
  let window = Services.wm.getMostRecentWindow("navigator:browser");
  if (gVideoStream) {
    gVideoStream.stop();
    gVideoStream = null;
    gCurrentSock = null;
    window.NativeWindow.menu.update(gMenuItem, { name: "Start Tab Stream" });
  }
  else {
LOG("streamFennecTab");
    let tabSource = Cc["@mozilla.org/tab-source-service;1"].createInstance(Ci.nsITabSource);
    if (Services.androidBridge && Services.androidBridge.getTabStream) {
LOG("androidBridge.getTabStream");
      Services.androidBridge.getTabStream(window, tabSource, (stream) => gum(window, stream), error);
    }
    else {
      LOG("Error: androidBridge.getTabStream not defined.");
    }
  }
}

function startupFennec(window) {
  gMenuItem = window.NativeWindow.menu.add("Start Tab Stream",
                                           "chrome://tab-share/content/rec18.png",
                                           streamFennecTab());
}

function shutdownFennec(window) {

  if (gMenuItem) {
    window.NativeWindow.menu.remove(gMenuItem);
    gMenuItem = null;
  }
}

if (!isFennec()) {
  Cu.import("resource:///modules/CustomizableUI.jsm");
}

function startupDesktop(window) {
  let widgetSpec = {
    id: kButtonId,
    type: "button",
    removable: true,
    label: "Tab Share",
    tooltiptext: "Share Current Tab",
    onCreated: function(aNode) {
      aNode.setAttribute("image", "chrome://tab-share/content/rec18.png");
    },
    onCommand: function(aEvent) {
      if (gVideoStream) {
        gVideoStream.stop();
        gVideoStream = null;
        gCurrentSock = null;
      }
      else {
        let window = Services.wm.getMostRecentWindow("navigator:browser");
        window.navigator.mozGetUserMedia({video:true}, (stream) => gum(window, stream), error);
      }
    },
  };

  CustomizableUI.createWidget(widgetSpec);
  CustomizableUI.addWidgetToArea(kButtonId, "nav-bar");
}

function loadIntoWindow(window) {
  if (!window)
    return;

  if (isFennec()) {
    startupFennec(window);
  }
  else {
    startupDesktop(window);
  }
}

function unloadFromWindow(window) {
  if (!window)
    return;

  if (isFennec()) {
    shutdownFennec(window);
  }
  else {
    CustomizableUI.destroyWidget(kButtonId);
  }
}

var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let window = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    window.addEventListener("load", function() {
      window.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(window);
    }, false);
  },

  onCloseWindow: function(aWindow) {
  },

  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

function startup(aData, aReason) {
  // Load into any existing windows
  let list = Services.wm.getEnumerator("navigator:browser");
  while (list.hasMoreElements()) {
    let window = list.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(window);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN) {
    return;
  }

  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let list = Services.wm.getEnumerator("navigator:browser");
  while (list.hasMoreElements()) {
    let window = list.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(window);
  }

}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}
