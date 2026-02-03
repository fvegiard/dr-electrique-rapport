#!/bin/bash

# Kill any existing sessions on :99 to clean up
pkill -f "Xvfb :99"
pkill -f "x11vnc -display :99"
pkill -f "websockify"

echo "🚀 Starting Virtual Display Environment..."

# 1. Start Xvfb (Virtual Framebuffer) on :99
Xvfb :99 -screen 0 1280x1024x24 &
XPID=$!
echo " - Xvfb started on :99 (PID $XPID)"
sleep 2

# 2. Start VNC Server connected to :99
x11vnc -display :99 -forever -nopw -bg -quiet -listen localhost -xkb
echo " - x11vnc started listening on 5900"

# 3. Start noVNC (Web Viewer) pointing to VNC port
# websockify translates WebSockets (Browser) to TCP (VNC)
/usr/share/novnc/utils/launch.sh --vnc localhost:5900 --listen 6081 &
echo " - noVNC web server started on port 6081"

echo "-----------------------------------------------------"
echo "✅ VISUAL SERVER READY!"
echo "👉 Open this URL in your regular browser: http://localhost:6081/vnc_lite.html"
echo "-----------------------------------------------------"
echo "Starting Playwright in 5 seconds in this virtual screen..."
sleep 5

# 4. Run Playwright in Headed mode BUT inside the virtual display
# This makes it visible in VNC but hidden from your desktop
export DISPLAY=:99
npx playwright test tests/parity-check.spec.ts --headed --project=chromium --reporter=line

# Cleanup on exit
kill $XPID
echo "Done."
