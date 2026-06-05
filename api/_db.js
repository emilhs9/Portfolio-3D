// api/_db.js
import fs from 'fs';
import path from 'path';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Local fallback file path
const LOCAL_FILE_PATH = path.join(process.cwd(), 'visitor_logs.json');

// Helper to fetch/post to Vercel KV REST API without any dependencies
async function vercelKVRequest(command, args = []) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const url = `${KV_URL}/${command}/${args.join('/')}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.result;
  } catch (e) {
    console.error('Vercel KV Error:', e);
    return null;
  }
}

async function vercelKVSet(key, value) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const url = `${KV_URL}/set/${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.result;
  } catch (e) {
    console.error('Vercel KV Set Error:', e);
    return null;
  }
}

export async function getLogs() {
  // Try Vercel KV first
  if (KV_URL && KV_TOKEN) {
    const data = await vercelKVRequest('get', ['visitor_logs']);
    if (data) {
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  // Local fallback
  try {
    if (fs.existsSync(LOCAL_FILE_PATH)) {
      const data = fs.readFileSync(LOCAL_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading local logs file:', e);
  }
  return [];
}

export async function saveLogs(logs) {
  // Keep logs list to max 500 entries
  if (logs.length > 500) {
    logs = logs.slice(logs.length - 500);
  }

  // Try Vercel KV first
  if (KV_URL && KV_TOKEN) {
    await vercelKVSet('visitor_logs', JSON.stringify(logs));
    return;
  }

  // Local fallback
  try {
    fs.writeFileSync(LOCAL_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing local logs file:', e);
  }
}
