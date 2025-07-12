// scripts/start-proxy.cjs
// Ensures the YouTube playlist proxy is running before the main UI starts

const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const PROXY_PORT = 4321;
const PROXY_PATH = path.resolve(__dirname, '../backend/youtubePlaylistProxy.cjs');

function isPortOpen(port, cb) {
  const socket = new net.Socket();
  socket.setTimeout(1000);
  socket.once('connect', function () {
    socket.destroy();
    cb(true);
  });
  socket.once('timeout', function () {
    socket.destroy();
    cb(false);
  });
  socket.once('error', function () {
    cb(false);
  });
  socket.connect(port, '127.0.0.1');
}

function startProxy() {
  isPortOpen(PROXY_PORT, (open) => {
    if (open) {
      console.log(`[Proxy Startup] Proxy already running on port ${PROXY_PORT}`);
      process.exit(0);
    } else {
      console.log(`[Proxy Startup] Starting proxy server at ${PROXY_PATH}...`);
      const child = spawn('node', [PROXY_PATH], {
        stdio: 'inherit',
        detached: true,
      });
      child.unref();
      // Give the proxy a moment to start
      setTimeout(() => {
        isPortOpen(PROXY_PORT, (started) => {
          if (started) {
            console.log(`[Proxy Startup] Proxy started successfully on port ${PROXY_PORT}`);
            process.exit(0);
          } else {
            console.error(`[Proxy Startup] Failed to start proxy on port ${PROXY_PORT}`);
            process.exit(1);
          }
        });
      }, 1500);
    }
  });
}

startProxy();
