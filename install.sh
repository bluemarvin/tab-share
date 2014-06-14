#!/bin/sh
FILE=tab-share.xpi
SDCARD=/mnt/sdcard
rm $FILE
zip $FILE bootstrap.js install.rdf chrome.manifest content/rec*.png content/stop*.png
#adb push $FILE $SDCARD/
#adb shell am start -a android.intent.action.VIEW -n org.mozilla.fennec_`whoami`/.App -d file://$SDCARD/$FILE

App=Firefox

if [ -n "`ps ax | grep -i firefoxnightly | grep -v grep`" ] ; then
  App=FirefoxNightly
elif [ -n "`ps ax | grep -i firefoxaurora | grep -v grep`" ] ; then
  App=FirefoxAurora
fi

echo Open $File in $App

open -a $App ./$FILE
