// api/log.js
import { getLogs, saveLogs } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const timestamp = new Date().toISOString();
    
    // Load existing logs, add new log, save
    const logs = await getLogs();
    logs.push({ timestamp, ip, userAgent });
    await saveLogs(logs);

    return res.status(200).json({ message: 'Logged successfully' });
  } catch (e) {
    console.error('Logging API Error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
