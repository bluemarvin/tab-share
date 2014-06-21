#!/bin/sh
FILE=tab-share.xpi
PLATFORM=`uname`
REALPLATFORM=$PLATFORM

build_usage()
{
  if [ "$REALPLATFORM" = "Darwin" ] ; then
    echo Will open in currently running Firefox browser by default.
  fi
  echo options:
  echo "   -a Install on Android device"
  echo "   -t <nightly|aurora|beta|release|[str]> Specifies target for android installs."
  echo "                                          Defaults to fennec_`whoami`"
}

while getopts aht: ARG
do
   case "$ARG" in
   a) PLATFORM="Android";;
   h) build_usage; exit 1;;
   t) TARGET=$OPTARG;;
   [?]) build_usage; exit 1;;
   esac
done

echo Install on platform $PLATFORM

rm -f $FILE
zip $FILE bootstrap.js install.rdf chrome.manifest content/rec*.png content/stop*.png

if [ "$PLATFORM" = "Darwin" ] ; then
  App=Firefox

  if [ -n "`ps ax | grep -i firefoxnightly | grep -v grep`" ] ; then
    App=FirefoxNightly
  elif [ -n "`ps ax | grep -i firefoxaurora | grep -v grep`" ] ; then
    App=FirefoxAurora
  fi
  echo Open $File in $App
  open -a $App ./$FILE
elif [ "$PLATFORM" = "Linux" ] ; then
  echo Need to support $PLATFORM
elif [ "$PLATFORM" = "Android" ] ; then
  SDCARD=/mnt/sdcard
  if [ -z "$ADB" ] ; then
    ADB=`which adb`
    echo Using adb: $ADB
  fi
  if [ -z "$ADB" ] ; then
    echo Unable to locate adb.
    exit 1
  fi

  case "$TARGET" in
    "")        TARGET=fennec_`whoami` ;;
    "aurora")  TARGET=fennec_aurora ;;
    "nightly") TARGET=fennec ;;
    "beta")    TARGET=firefox_beta ;;
    "release") TARGET=firefox ;;
    *) echo Unknown target option: $TARGET ;;
  esac

  echo Using target: $TARGET

  $ADB push $FILE $SDCARD/ && \
  $ADB shell am start -a android.intent.action.VIEW \
                      -c android.intent.category.DEFAULT \
                      -n org.mozilla.$TARGET/.App \
                      -d file://$SDCARD/$FILE && \
  echo Sucessfully installed $FILE
else
  echo Unsported platform: $PLATFORM
fi

