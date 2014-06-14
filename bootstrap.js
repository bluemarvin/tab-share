const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource:///modules/CustomizableUI.jsm");

function LOG(msg) {
  Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService).logStringMessage(msg);
}

let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
let baseSocket = Cc["@mozilla.org/tcp-socket;1"].createInstance(Ci.nsIDOMTCPSocket);
let currentSock = undefined;
let videoStream = undefined;

const kButtonId = "tab-share-ea99e696-aab4-44d6-b69e-2701863d2e1c";

function error(msg) {
  LOG("ERROR: " + msg);
}

function createSocket(window, pc, offer) {
  let socket = baseSocket.open("localhost", 8088, {useSecureTransport: false, binaryType: 'string'});

  socket.ondata = function(response) {
    LOG("response->\n" + response.data);
    pc.setRemoteDescription(new window.mozRTCSessionDescription({"type":"answer", "sdp":response.data}), function() {
      LOG("Set description");
    }, error)
  };

  socket.onerror = function(err) {
    LOG("Failed sending string: " + err);
    currentSock = undefined;
  };

  socket.onopen = function() {
    LOG("offer->\n" + offer.sdp);
    socket.send(offer.sdp, offer.sdp.length);
  };

  return socket;
}

function gum(window, stream) {
  videoStream = stream;

  let pc = new window.mozRTCPeerConnection;

  pc.addStream(stream);

  pc.createOffer(function(offer) {
    pc.setLocalDescription(new window.mozRTCSessionDescription(offer), function() {
      currentSock = createSocket(window, pc, offer);
    }, error);
  }, error);
}

function startup(aData, aReason) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

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
      LOG("Great success!");
      if (videoStream) {
        videoStream.stop();
        videoStream = undefined;
        currentSock = undefined;
      }
      else {
        let window = wm.getMostRecentWindow("navigator:browser");
        window.navigator.mozGetUserMedia({video:true}, (stream) => gum(window, stream) , error);
      }
    },
  };

  CustomizableUI.createWidget(widgetSpec);
  CustomizableUI.addWidgetToArea(kButtonId, "nav-bar");
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN) {
    return;
  }

  CustomizableUI.destroyWidget(kButtonId);
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}
