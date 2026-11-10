let foldersData = [];
let eventSource = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadFolders();
  loadConfig();
  loadReports();
  initSSE();
});

// Tab Navigation
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPane = document.getElementById(tab.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

// Load Folders
async function loadFolders() {
  const select = document.getElementById('folderSelect');
  try {
    const res = await fetch('/api/folders');
    foldersData = await res.json();
    select.innerHTML = '<option value="">-- Chọn thư mục --</option>';
    foldersData.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.name;
      opt.textContent = `${f.name} (${f.itemCount} items)`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      const selected = foldersData.find(f => f.name === select.value);
      const metaBox = document.getElementById('folderDetails');
      if (selected) {
        metaBox.style.display = 'flex';
        document.getElementById('metaCount').textContent = selected.itemCount;
        document.getElementById('metaItems').textContent = selected.items.map(i => i.glid).join(', ');
      } else {
        metaBox.style.display = 'none';
      }
    });
  } catch (err) {
    console.error('Failed to load folders:', err);
    select.innerHTML = '<option value="">Lỗi khi quét thư mục</option>';
  }
}

// SSE Connection
function initSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/events');

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleSSEMessage(data);
    } catch (err) {}
  };
}

function handleSSEMessage(data) {
  const terminal = document.getElementById('logTerminal');
  const progressBar = document.getElementById('progressBar');
  const statusBadge = document.getElementById('taskStatusBadge');

  if (data.type === 'start') {
    terminal.textContent = `[${new Date().toLocaleTimeString()}] ${data.message}\n`;
    progressBar.style.width = '10%';
    statusBadge.textContent = 'Đang chạy...';
    statusBadge.className = 'badge badge-warning';
  } else if (data.type === 'log') {
    terminal.textContent += `[${new Date().toLocaleTimeString()}] ${data.message}\n`;
    terminal.scrollTop = terminal.scrollHeight;
  } else if (data.type === 'complete') {
    terminal.textContent += `\n[${new Date().toLocaleTimeString()}] ${data.message}\n`;
    progressBar.style.width = '100%';
    statusBadge.textContent = 'Hoàn tất!';
    statusBadge.className = 'badge badge-success';
    if (data.report && data.report.results) {
      renderResults(data.report.results);
    }
    loadReports();
  } else if (data.type === 'error') {
    terminal.textContent += `\n[${new Date().toLocaleTimeString()}] ${data.message}\n`;
    statusBadge.textContent = 'Lỗi!';
    statusBadge.className = 'badge badge-danger';
  }
}

// Run Check for Single Item (Real-time ItemMaster)
document.getElementById('btnCheckSingleItem').addEventListener('click', async () => {
  const glid = document.getElementById('singleItemInput').value.trim();
  if (!glid) {
    alert('Vui lòng nhập mã GLID hoặc Item Code!');
    return;
  }

  document.getElementById('progressSection').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('progressBar').style.width = '15%';
  document.getElementById('logTerminal').textContent = `Đang bắt đầu tra cứu real-time trên ItemMaster.php cho: ${glid}...\n`;

  try {
    const res = await fetch('/api/check-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glid })
    });
    if (!res.ok) {
      const err = await res.json();
      alert('Không thể bắt đầu: ' + (err.error || 'Lỗi không xác định'));
    }
  } catch (err) {
    alert('Lỗi kết nối tới server: ' + err.message);
  }
});

// Run Check for Folder
document.getElementById('btnRunCheck').addEventListener('click', async () => {
  const folder = document.getElementById('folderSelect').value;
  if (!folder) {
    alert('Vui lòng chọn thư mục cần đối soát!');
    return;
  }

  document.getElementById('progressSection').style.display = 'block';
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('progressBar').style.width = '5%';
  document.getElementById('logTerminal').textContent = 'Đang khởi động tiến trình...';

  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder })
    });
    if (!res.ok) {
      const err = await res.json();
      alert('Không thể bắt đầu: ' + (err.error || 'Lỗi không xác định'));
    }
  } catch (err) {
    alert('Lỗi kết nối tới server: ' + err.message);
  }
});

// Render Results
function renderResults(results) {
  const resultsSection = document.getElementById('resultsSection');
  const resultsList = document.getElementById('resultsList');
  const statsRow = document.getElementById('statsRow');
  resultsSection.style.display = 'block';

  const total = results.length;
  const matches = results.filter(r => r.status === 'MATCH').length;
  const mismatches = results.filter(r => r.status === 'MISMATCH').length;
  const checks = results.filter(r => r.status === 'CHECK').length;

  statsRow.innerHTML = `
    <span class="badge badge-success"><i class="fa-solid fa-check-circle"></i> Khớp: ${matches}/${total}</span>
    ${mismatches > 0 ? `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Lệch số/nội dung: ${mismatches}</span>` : ''}
    ${checks > 0 ? `<span class="badge badge-warning"><i class="fa-solid fa-circle-question"></i> Cần xác nhận: ${checks}</span>` : ''}
  `;

  resultsList.innerHTML = results.map(item => {
    let statusClass = 'badge-success';
    let statusText = '100% MATCH';
    if (item.status === 'MISMATCH') {
      statusClass = 'badge-danger';
      statusText = 'LỆCH DỮ LIỆU';
    } else if (item.status === 'CHECK') {
      statusClass = 'badge-warning';
      statusText = 'CẦN XÁC NHẬN';
    }

    const rows = (item.fields || []).map(f => {
      let fBadge = f.match === true ? '<span class="badge badge-success">MATCH</span>' :
                   f.match === false ? '<span class="badge badge-danger">MISMATCH</span>' :
                   '<span class="badge badge-warning">CHECK</span>';
      const numTag = f.isNum ? '<span class="badge" style="background:#e8f0fe;color:#1a73e8;font-size:10px;">SỐ</span>' : '';
      return `
        <tr style="${f.match === false ? 'background:#fff5f5;' : ''}">
          <td style="font-weight:600;">${f.name} ${numTag}</td>
          <td style="font-family:monospace;color:#1a73e8;">${f.img || ''}</td>
          <td style="font-family:monospace;color:#137333;">${f.spec || ''}</td>
          <td style="text-align:center;">${fBadge}</td>
          <td style="color:#5f6368;font-size:12px;">${f.note || ''}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="result-card">
        <div class="result-header">
          <div>
            <h3 style="font-size:16px;display:inline-block;margin-right:12px;">${item.itemCode || item.glid}</h3>
            <span style="color:#5f6368;font-size:13px;">GLID: <b>${item.glid}</b> &bull; Spec: <b>${item.specName || 'N/A'}</b></span>
          </div>
          <div class="result-actions">
            <span class="badge ${statusClass}">${statusText}</span>
            ${item.itemMasterScreen ? `<button class="btn btn-secondary btn-small" onclick="openPreview('${item.itemMasterScreen}', 'Ảnh Order Form (ItemMaster.php): ${item.glid}')"><i class="fa-solid fa-file-invoice"></i> Ảnh ItemMaster</button>` : ''}
            ${item.searchScreen ? `<button class="btn btn-secondary btn-small" onclick="openPreview('${item.searchScreen}', 'Ảnh Tìm Kiếm: ${item.glid}')"><i class="fa-solid fa-magnifying-glass"></i> Bằng chứng Drive</button>` : ''}
            ${item.reportImage ? `<button class="btn btn-primary btn-small" onclick="openPreview('${item.reportImage}', 'Phiếu Đối Soát: ${item.glid}')"><i class="fa-solid fa-image"></i> Phiếu đối soát</button>` : ''}
          </div>
        </div>
        <table class="comparison-table">
          <thead>
            <tr>
              <th style="width:18%;">Trường Dữ Liệu</th>
              <th style="width:22%;">Order Form (ItemMaster.php)</th>
              <th style="width:22%;">VN SPEC (Drive)</th>
              <th style="width:10%;text-align:center;">Trạng Thái</th>
              <th style="width:28%;">Ghi Chú</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');
}

// Load Reports Archive
async function loadReports() {
  const container = document.getElementById('reportsList');
  try {
    const res = await fetch('/api/reports');
    const reports = await res.json();
    if (!reports || reports.length === 0) {
      container.innerHTML = '<div class="empty-state">Chưa có báo cáo nào được lưu.</div>';
      return;
    }
    container.innerHTML = reports.map(r => `
      <div class="result-card" style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="font-size:18px;">Thư mục: ${r.folderName}</h3>
            <div style="font-size:13px;color:#5f6368;margin-top:4px;">
              Thời gian: ${new Date(r.timestamp).toLocaleString('vi-VN')} &bull; Tổng số items: <b>${r.totalItems}</b>
            </div>
          </div>
          <div style="display:flex;gap:12px;align-items:center;">
            <span class="badge badge-success">${r.matched} Matched</span>
            ${r.mismatched > 0 ? `<span class="badge badge-danger">${r.mismatched} Mismatches</span>` : ''}
            ${r.checks > 0 ? `<span class="badge badge-warning">${r.checks} Checks</span>` : ''}
            <a href="/reports/${r.folderName}/index.html" target="_blank" class="btn btn-primary btn-small">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Mở Báo Cáo HTML
            </a>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Lỗi tải danh sách báo cáo.</div>';
  }
}
document.getElementById('btnRefreshReports').addEventListener('click', loadReports);

// Load Config
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const { rules, steps } = await res.json();
    document.getElementById('rulesEditor').value = JSON.stringify(rules, null, 2);
    document.getElementById('stepsEditor').value = JSON.stringify(steps, null, 2);
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

// Save Config
document.getElementById('btnSaveConfig').addEventListener('click', async () => {
  try {
    const rules = JSON.parse(document.getElementById('rulesEditor').value);
    const steps = JSON.parse(document.getElementById('stepsEditor').value);
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules, steps })
    });
    const result = await res.json();
    if (result.success) {
      alert('Đã lưu cấu hình mới thành công! Các lượt chạy tiếp theo sẽ áp dụng quy tắc này.');
    } else {
      alert('Lỗi: ' + result.error);
    }
  } catch (err) {
    alert('JSON không hợp lệ: ' + err.message);
  }
});

// Modal Preview
function openPreview(src, title) {
  document.getElementById('modalTitle').textContent = title || 'Xem Bằng Chứng';
  // If path is local absolute, route through /reports/
  let url = src;
  if (src.includes('reports')) {
    const parts = src.split('reports');
    url = '/reports' + parts[parts.length - 1].replace(/\\/g, '/');
  }
  document.getElementById('modalImage').src = url;
  document.getElementById('previewModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('previewModal').style.display = 'none';
}

