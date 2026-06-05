// api/auth.js
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'asli-secret-key-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'asli20090513';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const expires = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
      const message = 'admin:' + expires;
      const signature = crypto.createHmac('sha256', SECRET).update(message).digest('hex');
      const token = Buffer.from(message + ':' + signature).toString('base64');
      return res.status(200).json({ token });
    }
    return res.status(401).json({ error: 'Invalid password' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
