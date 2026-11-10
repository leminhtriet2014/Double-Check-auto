const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Pipeline } = require('./engine/pipeline');
const { FolderScanner } = require('./engine/folder_scanner');

const PORT = 3000;
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const CONFIG_DIR = path.resolve(__dirname, 'config');
const REPORTS_DIR = path.resolve(ROOT_DIR, 'reports');

let currentTask = null;
const eventClients = [];

function sendSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of eventClients) {
    try {
      res.write(payload);
    } catch (e) {}
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // SSE Stream
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    eventClients.push(res);
    req.on('close', () => {
      const idx = eventClients.indexOf(res);
      if (idx !== -1) eventClients.splice(idx, 1);
    });
    return;
  }

  // API: Get Folders
  if (pathname === '/api/folders' && req.method === 'GET') {
    try {
      const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
      const folders = [];
      for (const ent of entries) {
        if (ent.isDirectory() && !['node_modules', 'puppeteer_profile', 'downloads', 'reports', 'double_check_tool', '.git', '.gemini', 'evidence_09_nov'].includes(ent.name)) {
          const items = FolderScanner.scan(path.join(ROOT_DIR, ent.name));
          folders.push({
            name: ent.name,
            itemCount: items.length,
            items: items.map(i => ({ glid: i.glid, file: i.fileName }))
          });
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(folders));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Get Rules and Steps
  if (pathname === '/api/config' && req.method === 'GET') {
    const rules = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'rules.json'), 'utf8'));
    const steps = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'steps.json'), 'utf8'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rules, steps }));
    return;
  }

  // API: Update Rules or Steps
  if (pathname === '/api/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.rules) {
          fs.writeFileSync(path.join(CONFIG_DIR, 'rules.json'), JSON.stringify(payload.rules, null, 2), 'utf8');
        }
        if (payload.steps) {
          fs.writeFileSync(path.join(CONFIG_DIR, 'steps.json'), JSON.stringify(payload.steps, null, 2), 'utf8');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Configuration updated successfully' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Trigger Double Check for a Single Item (Real-time ItemMaster.php)
  if (pathname === '/api/check-item' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { glid } = JSON.parse(body);
        if (!glid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GLID / Item Code is required' }));
          return;
        }

        if (currentTask && currentTask.status === 'running') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Another task is currently running' }));
          return;
        }

        currentTask = { item: glid, status: 'running', startTime: new Date().toISOString() };
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'started', glid }));

        // Run async in background
        sendSSE({ type: 'start', item: glid, message: `Bắt đầu đối soát đơn hàng: ${glid}` });
        const pipeline = new Pipeline();
        const singleReportDir = path.join(REPORTS_DIR, 'single_checks');
        await pipeline.browserManager.connect();
        pipeline.checkSingleItem(glid, singleReportDir, (evt) => sendSSE(evt))
          .then((itemResult) => {
            currentTask.status = 'completed';
            currentTask.result = itemResult;
            sendSSE({ type: 'complete', item: glid, report: { results: [itemResult] }, message: `Hoàn tất đối soát item ${glid}!` });
            pipeline.browserManager.disconnect();
          })
          .catch((err) => {
            currentTask.status = 'failed';
            currentTask.error = err.message;
            sendSSE({ type: 'error', item: glid, error: err.message, message: `Lỗi: ${err.message}` });
            pipeline.browserManager.disconnect();
          });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Trigger Double Check on Folder
  if (pathname === '/api/check' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { folder } = JSON.parse(body);
        if (!folder) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Folder name is required' }));
          return;
        }

        if (currentTask && currentTask.status === 'running') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Another task is currently running' }));
          return;
        }

        currentTask = { folder, status: 'running', startTime: new Date().toISOString() };
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'started', folder }));

        // Run async in background
        sendSSE({ type: 'start', folder, message: `Bắt đầu đối soát thư mục: ${folder}` });
        const pipeline = new Pipeline();
        pipeline.runFolder(folder, (evt) => sendSSE(evt))
          .then((report) => {
            currentTask.status = 'completed';
            currentTask.report = report;
            sendSSE({ type: 'complete', folder, report, message: `Hoàn tất đối soát thư mục ${folder}!` });
          })
          .catch((err) => {
            currentTask.status = 'failed';
            currentTask.error = err.message;
            sendSSE({ type: 'error', folder, error: err.message, message: `Lỗi: ${err.message}` });
          });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Get Status
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(currentTask || { status: 'idle' }));
    return;
  }

  // API: List Available Reports
  if (pathname === '/api/reports' && req.method === 'GET') {
    try {
      if (!fs.existsSync(REPORTS_DIR)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }
      const entries = fs.readdirSync(REPORTS_DIR, { withFileTypes: true });
      const reports = [];
      for (const ent of entries) {
        if (ent.isDirectory()) {
          const sumFile = path.join(REPORTS_DIR, ent.name, 'summary.json');
          if (fs.existsSync(sumFile)) {
            const sumData = JSON.parse(fs.readFileSync(sumFile, 'utf8'));
            reports.push(sumData);
          }
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reports));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Serve Reports Static Files (HTML, PNG, JSON)
  if (pathname.startsWith('/reports/')) {
    const relPath = pathname.replace(/^\/reports\//, '');
    const filePath = path.join(REPORTS_DIR, relPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.json': 'application/json'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // Serve Public Web UI Assets
  let publicFile = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(PUBLIC_DIR, publicFile);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  AVERY DENNISON QA DOUBLE-CHECK TOOL`);
  console.log(`  Server is running at: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});

