const http = require('http');
const fs = require('fs');
const path = require('path');
const outdir = path.resolve('.dbg');
const session = 'pages-api-500';
const port = 7778;
const envFile = path.join(outdir, `${session}.env`);
const logFile = path.join(outdir, `trae-debug-log-${session}.ndjson`);
fs.mkdirSync(outdir, { recursive: true });
fs.writeFileSync(envFile, `DEBUG_SERVER_URL=http://127.0.0.1:${port}/event\nDEBUG_SESSION_ID=${session}\n`);
fs.writeFileSync(logFile, '');
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method === 'GET' && req.url === '/health') { res.statusCode = 200; return res.end('ok'); }
  if (req.method === 'DELETE' && req.url === '/logs') { fs.writeFileSync(logFile, ''); res.statusCode = 204; return res.end(); }
  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body || '{}');
        if (!event.ts) event.ts = Date.now();
        fs.appendFileSync(logFile, `${JSON.stringify(event)}\n`);
        res.statusCode = 200;
        res.end('ok');
      } catch {
        res.statusCode = 400;
        res.end('bad json');
      }
    });
    return;
  }
  res.statusCode = 404;
  res.end('not found');
});
server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({ port, envFile, logFile }, null, 2));
});
