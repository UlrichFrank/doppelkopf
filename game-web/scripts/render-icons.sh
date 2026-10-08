#!/bin/sh
# Renders the PWA icons (PNG) from public/icons/icon.svg with headless Chrome.
# The PNGs are checked in; run this only after changing the SVG.
set -e
cd "$(dirname "$0")/../public/icons"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
for size in 512 192 180; do
  name="icon-$size.png"
  [ "$size" = 180 ] && name="apple-touch-icon.png"
  cat > /tmp/dk-icon.html <<HTML
<html><body style="margin:0"><img src="file://$PWD/icon.svg" width="$size" height="$size"></body></html>
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=$size,$size --screenshot="$PWD/$name" /tmp/dk-icon.html >/dev/null 2>&1
  echo "$name"
done
