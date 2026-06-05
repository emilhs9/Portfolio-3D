// api/logs.js
import crypto from 'crypto';
import { getLogs, saveLogs } from './_db.js';

const SECRET = process.env.JWT_SECRET || 'asli-secret-key-2026';

export default async function handler(req, res) {
  // Authentication check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [user, expiresStr, signature] = decoded.split(':');
    const expires = parseInt(expiresStr, 10);
    if (user !== 'admin' || Date.now() > expires) {
      return res.status(401).json({ error: 'Token expired or invalid' });
    }
    const message = 'admin:' + expires;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(message).digest('hex');
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid token signature' });
    }
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  // Handle requests
  if (req.method === 'GET') {
    try {
      const logs = await getLogs();
      return res.status(200).json(logs);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  } 
  
  else if (req.method === 'DELETE') {
    try {
      const { all, timestamp } = req.query;

      if (all === 'true') {
        // Clear all logs
        await saveLogs([]);
        return res.status(200).json({ message: 'All logs cleared' });
      } 
      
      else if (timestamp) {
        // Delete a specific log by timestamp
        let logs = await getLogs();
        logs = logs.filter(log => log.timestamp !== timestamp);
        await saveLogs(logs);
        return res.status(200).json({ message: 'Log entry deleted' });
      }

      return res.status(400).json({ error: 'Missing parameters' });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to perform delete operation' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
