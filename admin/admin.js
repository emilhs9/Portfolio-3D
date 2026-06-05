// admin/admin.js
// Simple client‑side admin panel logic

const loginSection = document.getElementById('login-section');
const logSection = document.getElementById('log-section');
const loginBtn = document.getElementById('login-button');
const passwordInput = document.getElementById('admin-password');
const errorMsg = document.getElementById('login-error');
const logBody = document.getElementById('log-body');

// Helper to store token in localStorage
const setToken = (token) => localStorage.setItem('adminToken', token);
const getToken = () => localStorage.getItem('adminToken');

const showLogs = async () => {
  const token = getToken();
  if (!token) {
    loginSection.style.display = 'flex';
    return;
  }
  // verify token by trying to fetch logs
  try {
    const res = await fetch('/api/logs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('unauthorized');
    const logs = await res.json();
    renderLogs(logs);
    loginSection.style.display = 'none';
    logSection.style.display = 'block';
  } catch (e) {
    // token invalid – ask to login again
    localStorage.removeItem('adminToken');
    loginSection.style.display = 'flex';
    logSection.style.display = 'none';
  }
};

const renderLogs = (logs) => {
  logBody.innerHTML = '';
  logs.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    const date = new Date(entry.ts);
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${date.toLocaleString()}</td>
      <td>${entry.ip}</td>
      <td>${entry.ua}</td>
    `;
    logBody.appendChild(tr);
  });
};

loginBtn.addEventListener('click', async () => {
  const password = passwordInput.value;
  errorMsg.style.display = 'none';
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setToken(data.token);
      await showLogs();
    } else {
      errorMsg.style.display = 'block';
    }
  } catch (e) {
    errorMsg.style.display = 'block';
  }
});

// Auto‑load on page open
showLogs();
