#!/bin/sh
# Xvfb 백그라운드 실행 후 DISPLAY 설정, Node 시작
Xvfb :99 -screen 0 1280x960x24 -ac +extension GLX +render -noreset &
sleep 1
export DISPLAY=:99
exec node src/server.js
