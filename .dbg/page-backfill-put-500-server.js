const fs = require('fs');
const path = require('path');
const http = require('http');

const outDir = __dirname;
const logFile = path.join(outDir, 'trae-debug-log-page-backfill-put-500.ndjson');

fs.mkdirSync(outDir, { recursive: true });

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, logFile }));
    return;
  }

  if (req.method === 'GET' && req.url === '/logs') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '');
    return;
  }

  if (req.method === 'DELETE' && req.url === '/logs') {
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/event') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      fs.appendFileSync(logFile, `${body}\n`, 'utf8');
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(7777, '127.0.0.1', () => {
  process.stdout.write(`Debug collector listening on http://127.0.0.1:7777\n`);
});
