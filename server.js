/**
 * Zero-dependency local development server for Bank Marketing Campaign Dashboard
 * Automatically serves static files and launches your default web browser.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function serveFile(req, res) {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  }

  // Sanitize path to prevent directory traversal
  const safeSuffix = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, safeSuffix);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found</title></head>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2>404 - File Not Found</h2>
          <p>The requested URL <code>${reqUrl}</code> was not found on this server.</p>
          <p><a href="/" style="color: #2563EB; font-weight: bold;">← Return to Bank Marketing Dashboard</a></p>
        </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function openBrowser(url) {
  const startCmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(startCmd, err => {
    if (err) {
      console.log(`💡 You can open your browser manually at: ${url}`);
    }
  });
}

function startServer(port) {
  const server = http.createServer(serveFile);

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('\n' + '='.repeat(64));
    console.log('🏦  Bank Marketing Campaign Analysis Dashboard');
    console.log('='.repeat(64));
    console.log(`🚀  Local Server running at: \x1b[36m${url}\x1b[0m`);
    console.log(`🌐  Network URL:             \x1b[36mhttp://127.0.0.1:${port}\x1b[0m`);
    console.log('✨  Opening in your default browser...');
    console.log('🛑  Press Ctrl+C to stop the server');
    console.log('='.repeat(64) + '\n');

    openBrowser(url);
  });
}

startServer(PORT);
