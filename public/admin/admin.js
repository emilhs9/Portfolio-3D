// admin.js - Advanced Dashboard Controller
document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const logsSection = document.getElementById('logs-section');
  const loginForm = document.getElementById('login-form');
  const errorMsg = document.getElementById('login-error');
  
  const logsTableBody = document.querySelector('#logs-table tbody');
  const refreshBtn = document.getElementById('refresh-btn');
  const clearBtn = document.getElementById('clear-btn');
  const exportBtn = document.getElementById('export-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  const searchInput = document.getElementById('search-input');
  const deviceFilter = document.getElementById('device-filter');
  
  const statTotal = document.getElementById('stat-total');
  const statUnique = document.getElementById('stat-unique');
  const statMobile = document.getElementById('stat-mobile');
  const statDesktop = document.getElementById('stat-desktop');

  let allLogs = [];

  const showSection = (section) => {
    loginSection.style.display = 'none';
    logsSection.style.display = 'none';
    section.style.display = 'block';
  };

  // Human-readable User Agent Parser
  const parseUA = (ua) => {
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    let deviceType = 'desktop'; // default
    let icon = '💻';

    // Device detection
    const lowerUA = ua.toLowerCase();
    if (lowerUA.includes('mobi') || lowerUA.includes('android') || lowerUA.includes('iphone') || lowerUA.includes('ipod')) {
      deviceType = 'mobile';
      icon = '📱';
    } else if (lowerUA.includes('ipad') || lowerUA.includes('tablet')) {
      deviceType = 'tablet';
      icon = '📟';
    }

    // OS detection
    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('iPhone OS')) os = 'iOS';
    else if (ua.includes('Android')) {
      const match = ua.match(/Android\s([0-9\.]+)/);
      os = match ? `Android ${match[1]}` : 'Android';
    }
    else if (ua.includes('Linux')) os = 'Linux';

    // Browser detection
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';

    return { os, browser, deviceType, icon };
  };

  const calculateStats = (logs) => {
    const total = logs.length;
    statTotal.textContent = total;

    // Unique IPs
    const uniqueIPs = new Set(logs.map(log => log.ip));
    statUnique.textContent = uniqueIPs.size;

    // Device count
    let mobileCount = 0;
    let desktopCount = 0;

    logs.forEach(log => {
      const parsed = parseUA(log.userAgent || log.ua || '');
      if (parsed.deviceType === 'mobile' || parsed.deviceType === 'tablet') {
        mobileCount++;
      } else {
        desktopCount++;
      }
    });

    const mobilePct = total > 0 ? Math.round((mobileCount / total) * 100) : 0;
    const desktopPct = total > 0 ? Math.round((desktopCount / total) * 100) : 0;

    statMobile.textContent = `${mobilePct}%`;
    statDesktop.textContent = `${desktopPct}%`;
  };

  const renderLogs = (logs) => {
    logsTableBody.innerHTML = '';
    
    if (logs.length === 0) {
      logsTableBody.innerHTML = `<tr><td colspan="6" class="table-loading">No visitors logged matching your filters.</td></tr>`;
      return;
    }

    logs.forEach((log, idx) => {
      const parsed = parseUA(log.userAgent || log.ua || '');
      const tr = document.createElement('tr');
      
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
      const ipStr = log.ip || 'unknown';
      const rawUA = log.userAgent || log.ua || 'unknown';

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${timeStr}</strong></td>
        <td><span class="ip-text">${ipStr}</span></td>
        <td>
          <span class="device-chip ${parsed.deviceType}">
            ${parsed.icon} ${parsed.os} (${parsed.browser})
          </span>
        </td>
        <td><div class="ua-text" title="${rawUA}">${rawUA}</div></td>
        <td style="text-align: center;">
          <button class="btn-delete-row" data-timestamp="${log.timestamp}" title="Delete this entry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      `;
      logsTableBody.appendChild(tr);
    });

    // Attach delete listeners
    document.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const timestamp = e.currentTarget.getAttribute('data-timestamp');
        if (confirm('Are you sure you want to delete this log entry?')) {
          await deleteLog(timestamp);
        }
      });
    });
  };

  const filterAndRender = () => {
    const searchVal = searchInput.value.toLowerCase();
    const deviceVal = deviceFilter.value;

    const filtered = allLogs.filter(log => {
      const parsed = parseUA(log.userAgent || log.ua || '');
      
      // Search matches
      const ip = (log.ip || '').toLowerCase();
      const ua = (log.userAgent || log.ua || '').toLowerCase();
      const time = log.timestamp ? new Date(log.timestamp).toLocaleString().toLowerCase() : '';
      const matchesSearch = ip.includes(searchVal) || ua.includes(searchVal) || time.includes(searchVal) || parsed.os.toLowerCase().includes(searchVal) || parsed.browser.toLowerCase().includes(searchVal);

      // Device matches
      let matchesDevice = true;
      if (deviceVal === 'desktop') {
        matchesDevice = parsed.deviceType === 'desktop';
      } else if (deviceVal === 'mobile') {
        matchesDevice = (parsed.deviceType === 'mobile' || parsed.deviceType === 'tablet');
      }

      return matchesSearch && matchesDevice;
    });

    renderLogs(filtered);
  };

  const fetchLogs = async (token) => {
    try {
      const res = await fetch('/api/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('adminToken');
          showSection(loginSection);
        }
        return;
      }
      allLogs = await res.json();
      calculateStats(allLogs);
      filterAndRender();
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  };

  const deleteLog = async (timestamp) => {
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`/api/logs?timestamp=${encodeURIComponent(timestamp)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLogs(token);
      } else {
        alert('Failed to delete log entry.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllLogs = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch('/api/logs?all=true', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchLogs(token);
      } else {
        alert('Failed to clear logs.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Event Listeners
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-pass').value;
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('adminToken', token);
        showSection(logsSection);
        fetchLogs(token);
      } else {
        errorMsg.style.display = 'block';
        setTimeout(() => errorMsg.style.display = 'none', 3000);
      }
    } catch (e) {
      console.error('Login error', e);
    }
  });

  refreshBtn.addEventListener('click', () => {
    const token = localStorage.getItem('adminToken');
    if (token) fetchLogs(token);
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('🚨 DANGER: Are you sure you want to delete ALL visitor log entries? This cannot be undone.')) {
      clearAllLogs();
    }
  });

  exportBtn.addEventListener('click', () => {
    if (allLogs.length === 0) return;
    
    // Construct CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Index,Timestamp,IP Address,Device Type,OS,Browser,Raw User Agent\n';
    
    allLogs.forEach((log, idx) => {
      const parsed = parseUA(log.userAgent || log.ua || '');
      const time = log.timestamp ? new Date(log.timestamp).toLocaleString() : '';
      const row = [
        idx + 1,
        `"${time}"`,
        `"${log.ip || ''}"`,
        `"${parsed.deviceType}"`,
        `"${parsed.os}"`,
        `"${parsed.browser}"`,
        `"${(log.userAgent || log.ua || '').replace(/"/g, '""')}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visitor_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    showSection(loginSection);
  });

  searchInput.addEventListener('input', filterAndRender);
  deviceFilter.addEventListener('change', filterAndRender);

  // Initial load check
  const storedToken = localStorage.getItem('adminToken');
  if (storedToken) {
    showSection(logsSection);
    fetchLogs(storedToken);
  } else {
    showSection(loginSection);
  }
});
