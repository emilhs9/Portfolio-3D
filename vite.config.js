import { defineConfig } from 'vite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const LOCAL_FILE_PATH = path.join(process.cwd(), 'visitor_logs.json');

// Helper to get local logs
function getLocalLogs() {
  try {
    if (fs.existsSync(LOCAL_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_FILE_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading local logs:', e);
  }
  return [];
}

// Helper to save local logs
function saveLocalLogs(logs) {
  try {
    if (logs.length > 500) {
      logs = logs.slice(logs.length - 500);
    }
    fs.writeFileSync(LOCAL_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing local logs:', e);
  }
}

export default defineConfig({
  root: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    port: 3001,
    host: true,
  },
  plugins: [
    {
      name: 'api-routes',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Parse url & queries manually
          const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const pathname = parsedUrl.pathname;
          
          if (pathname === '/api/auth' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { password } = JSON.parse(body);
                if (password === 'asli20090513') {
                  const SECRET = 'asli-secret-key-2026';
                  const expires = Date.now() + 2 * 60 * 60 * 1000;
                  const message = 'admin:' + expires;
                  const signature = crypto.createHmac('sha256', SECRET).update(message).digest('hex');
                  const token = Buffer.from(message + ':' + signature).toString('base64');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ token }));
                } else {
                  res.writeHead(401, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Invalid password' }));
                }
              } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Bad request' }));
              }
            });
            return;
          }

          if (pathname === '/api/log' && req.method === 'POST') {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            const userAgent = req.headers['user-agent'] || 'unknown';
            const timestamp = new Date().toISOString();
            
            const logs = getLocalLogs();
            logs.push({ timestamp, ip, userAgent });
            saveLocalLogs(logs);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/logs') {
            // Check auth
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }
            const token = authHeader.split(' ')[1];
            try {
              const decoded = Buffer.from(token, 'base64').toString('utf8');
              const [user, expiresStr, signature] = decoded.split(':');
              const expires = parseInt(expiresStr, 10);
              const SECRET = 'asli-secret-key-2026';
              const message = 'admin:' + expires;
              const expectedSignature = crypto.createHmac('sha256', SECRET).update(message).digest('hex');
              
              if (user !== 'admin' || Date.now() > expires || signature !== expectedSignature) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid or expired token' }));
                return;
              }
            } catch (e) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid token signature' }));
              return;
            }

            if (req.method === 'GET') {
              const logs = getLocalLogs();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(logs));
              return;
            } 
            
            else if (req.method === 'DELETE') {
              const all = parsedUrl.searchParams.get('all');
              const timestamp = parsedUrl.searchParams.get('timestamp');

              if (all === 'true') {
                saveLocalLogs([]);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'All logs cleared' }));
                return;
              } 
              
              else if (timestamp) {
                let logs = getLocalLogs();
                logs = logs.filter(log => log.timestamp !== timestamp);
                saveLocalLogs(logs);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Log entry deleted' }));
                return;
              }

              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing parameters' }));
              return;
            }
          }

          next();
        });
      }
    }
  ]
});
