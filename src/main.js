import './style.css'

const API_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

// Elements
const tabReport = document.getElementById('tab-report');
const tabList = document.getElementById('tab-list');
const sectionReport = document.getElementById('section-report');
const sectionList = document.getElementById('section-list');
const reportForm = document.getElementById('report-form');
const issueGrid = document.getElementById('issue-grid');
const loading = document.getElementById('loading');
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const btnViewCard = document.getElementById('btn-view-card');
const btnViewList = document.getElementById('btn-view-list');

// New Elements
const timestampInput = document.getElementById('timestamp-input');
const recentList = document.getElementById('recent-list');
const recentSearch = document.getElementById('recent-search');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnSubmitReport = document.getElementById('btn-submit-report');
const reportAction = document.getElementById('report-action');
const reportId = document.getElementById('report-id');

const modalFix = document.getElementById('modal-fix');
const closeModal = document.querySelector('.close-modal');
const fixForm = document.getElementById('fix-form');
const modalMeta = document.getElementById('modal-issue-info');

// Login Elements
const modalLogin = document.getElementById('modal-login');
const loginForm = document.getElementById('login-form');
const loginNameInput = document.getElementById('login-name');
const currentUserNameSpan = document.getElementById('current-user-name');

// Pagination Elements
const paginationControls = document.getElementById('pagination-controls');
const itemsPerPageSelect = document.getElementById('items-per-page');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const pageInfo = document.getElementById('page-info');

// View State
let currentView = 'card';
let issues = [];
let filteredIssues = []; // For pagination
let currentFilter = 'All';
let currentPage = 1;
let itemsPerPage = 10;
let currentUser = '';

// --- Initialization ---

if (!API_URL) {
    alert('設定錯誤：找不到 VITE_GOOGLE_APP_SCRIPT_URL 環境變數。\n請檢查 .env 檔案。');
}

// Check Login
const savedUser = localStorage.getItem('userName');
if (savedUser) {
    currentUser = savedUser;
    updateUserUI();
    modalLogin.style.display = 'none'; // Ensure hidden
} else {
    // Show Login
    modalLogin.style.display = 'flex';
}

// Set default timestamp
setNowToTimestamp();

// Fetch initial data
fetchIssues(true);

// --- Event Listeners ---

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = loginNameInput.value.trim();
    if (name) {
        currentUser = name;
        localStorage.setItem('userName', currentUser);
        updateUserUI();
        modalLogin.style.display = 'none';

        // Auto-fill forms if empty
        const reporterInput = document.getElementById('reporter-input');
        if (!reporterInput.value) reporterInput.value = currentUser;
    }
});

// Edit Name
currentUserNameSpan.addEventListener('click', () => {
    const newName = prompt('修改姓名:', currentUser);
    if (newName && newName.trim()) {
        currentUser = newName.trim();
        localStorage.setItem('userName', currentUser);
        updateUserUI();
    }
});

// View Toggle
btnViewCard.addEventListener('click', () => {
    currentView = 'card';
    btnViewCard.classList.add('active');
    btnViewList.classList.remove('active');
    issueGrid.className = 'view-card';
    renderIssues();
});

btnViewList.addEventListener('click', () => {
    currentView = 'list';
    btnViewList.classList.add('active');
    btnViewCard.classList.remove('active');
    issueGrid.className = 'view-list';
    renderIssues();
});

// Tabs
tabReport.addEventListener('click', () => switchTab('report'));
tabList.addEventListener('click', () => {
    switchTab('list');
    fetchIssues();
});

// Report Form
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(reportForm);
    const data = Object.fromEntries(formData.entries());

    data.timestamp = formatDateForSheet(data.timestamp);

    // We rely on currentUser, but ensure it's saved to local for next time
    localStorage.setItem('userName', currentUser);

    const payload = {
        action: data.action,
        ...data
    };

    if (!API_URL) return;

    const isEdit = data.action === 'update';
    setLoading(true, isEdit ? '更新中...' : '送出中...');

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.status === 'success') {
            alert(isEdit ? '修改成功！' : '回報成功！');
            resetReportForm();
            fetchIssues(true);
            if (isEdit) switchTab('list');
        } else {
            alert('失敗: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('操作失敗。');
    } finally {
        setLoading(false);
    }
});

btnCancelEdit.addEventListener('click', resetReportForm);

// List Actions
btnRefresh.addEventListener('click', fetchIssues);
searchInput.addEventListener('input', () => { currentPage = 1; renderIssues(); });
statusFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    currentPage = 1;
    renderIssues();
});

// Pagination Actions
itemsPerPageSelect.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderIssues(false, false); // Don't re-filter, just re-page
});

btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderIssues(false, false);
    }
});

btnNext.addEventListener('click', () => {
    const maxPage = Math.ceil(filteredIssues.length / itemsPerPage);
    if (currentPage < maxPage) {
        currentPage++;
        renderIssues(false, false);
    }
});


// Recent Search
recentSearch.addEventListener('input', () => renderRecentList());


// Modal
closeModal.addEventListener('click', () => modalFix.classList.add('hidden'));
window.addEventListener('click', (e) => {
    if (e.target === modalFix) modalFix.classList.add('hidden');
});

fixForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(fixForm);
    const data = Object.fromEntries(formData.entries());
    const issueId = fixForm.dataset.id;

    // Format fixTime
    if (data.fixTime) {
        data.fixTime = formatDateForSheet(data.fixTime);
    }

    if (!API_URL) return;

    setLoading(true, '更新中...');
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'update',
                id: issueId,
                ...data
            })
        });
        alert('更新成功！');
        modalFix.classList.add('hidden');
        fetchIssues();
    } catch (err) {
        console.error(err);
        alert('更新失敗。');
    } finally {
        setLoading(false);
    }
});

// --- Functions ---

function updateUserUI() {
    currentUserNameSpan.textContent = currentUser;

    // Auto-fill Reporter if empty (only in create mode ideally, or if match)
    const reporterInput = document.getElementById('reporter-input');
    // If input is empty, fill it. 
    if (reporterInput && reportAction.value === 'create' && !reporterInput.value) {
        reporterInput.value = currentUser;
    }
}

function setNowToTimestamp() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    timestampInput.value = now.toISOString().slice(0, 16);
}

function resetReportForm() {
    reportForm.reset();
    setNowToTimestamp();

    // Refill user name
    if (currentUser) {
        document.getElementById('reporter-input').value = currentUser;
    }

    reportAction.value = 'create';
    reportId.value = '';
    btnSubmitReport.textContent = '送出回報';
    btnCancelEdit.classList.add('hidden');
}

function switchTab(tab) {
    if (tab === 'report') {
        tabReport.classList.add('active');
        tabList.classList.remove('active');
        sectionReport.classList.add('active');
        sectionList.classList.remove('active');
        fetchIssues(true);
    } else {
        tabReport.classList.remove('active');
        tabList.classList.add('active');
        sectionReport.classList.remove('active');
        sectionList.classList.add('active');
    }
}

function setLoading(isLoading, text = '載入中...') {
    if (isLoading) {
        loading.textContent = text;
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

async function fetchIssues(onlyRecent = false) {
    if (!API_URL) return;
    if (!onlyRecent) setLoading(true);

    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        issues = data;

        if (onlyRecent || sectionReport.classList.contains('active')) {
            renderRecentList();
        }

        if (!onlyRecent || sectionList.classList.contains('active')) {
            renderIssues();
        }
    } catch (err) {
        console.error(err);
        if (!onlyRecent) loading.textContent = '載入失敗';
    } finally {
        if (!issues.length) setLoading(false);
    }
}

function renderRecentList() {
    const term = recentSearch.value.toLowerCase();
    let sorted = [...issues].reverse();

    if (term) {
        sorted = sorted.filter(issue =>
            `${issue.Module} ${issue.Function} ${issue.Description}`.toLowerCase().includes(term)
        );
    }

    const recent = sorted.slice(0, 10);

    recentList.innerHTML = '';
    if (recent.length === 0) {
        recentList.innerHTML = '<p style="color:#666; padding:1rem;">無資料</p>';
        return;
    }

    recent.forEach(issue => {
        const row = document.createElement('div');
        row.className = 'recent-item';
        row.innerHTML = `
            <div class="recent-info">
                <strong>${issue.Module} - ${issue.Function}</strong> (${formatDate(issue.Timestamp)})<br>
                <span style="color:#666; font-size:0.9em;">${issue.Description.substring(0, 30)}...</span>
            </div>
            <div class="recent-actions">
                <button class="btn-sm btn-copy">複製</button>
                <button class="btn-sm btn-edit">修改</button>
                <button class="btn-sm btn-del">刪除</button>
            </div>
        `;
        row.querySelector('.btn-copy').onclick = () => fillReportForm(issue, 'copy');
        row.querySelector('.btn-edit').onclick = () => fillReportForm(issue, 'edit');
        row.querySelector('.btn-del').onclick = () => deleteIssue(issue.ID);
        recentList.appendChild(row);
    });
}


function fillReportForm(issue, mode) {
    const map = {
        'module': issue.Module,
        'functionName': issue.Function,
        'code': issue.Code,
        'url': issue.Url,
        'reporter': issue.Reporter,
        'description': issue.Description
    };

    for (const [name, val] of Object.entries(map)) {
        const input = reportForm.querySelector(`[name="${name}"]`);
        if (input) input.value = val || '';
    }

    if (issue.Timestamp) {
        timestampInput.value = parseDateToInput(issue.Timestamp);
    }

    if (mode === 'copy') {
        reportAction.value = 'create';
        reportId.value = '';
        btnSubmitReport.textContent = '送出回報 (複製)';
        btnCancelEdit.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mode === 'edit') {
        reportAction.value = 'update';
        reportId.value = issue.ID;
        btnSubmitReport.textContent = '確認修改 - ID: ' + issue.ID;
        btnCancelEdit.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    switchTab('report');
}

async function deleteIssue(id) {
    if (!confirm('確定要刪除此筆回報嗎？(無法復原)')) return;
    setLoading(true, '刪除中...');
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', id: id })
        });
        alert('刪除成功');
        fetchIssues(true);
    } catch (err) {
        console.error(err);
        alert('刪除失敗');
    } finally {
        setLoading(false);
    }
}


function renderIssues(reFilter = true, resetPage = true) {
    setLoading(false);
    issueGrid.innerHTML = '';

    if (reFilter) {
        const term = searchInput.value.toLowerCase();
        filteredIssues = issues.filter(issue => {
            if (currentFilter !== 'All' && issue.Status !== currentFilter) return false;
            const searchString = `${issue.Module} ${issue.Function} ${issue.Description} ${issue.Reporter}`.toLowerCase();
            return searchString.includes(term);
        });
    }

    // Pagination Logic
    const totalItems = filteredIssues.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pagedItems = filteredIssues.slice(startIndex, endIndex);

    // Update Controls
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalItems} 筆)`;
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;
    paginationControls.classList.remove('hidden');

    if (pagedItems.length === 0) {
        issueGrid.innerHTML = '<p style="text-align:center; color:#666; grid-column: 1/-1;">沒有符合的資料</p>';
        return;
    }

    pagedItems.forEach(issue => {
        const card = document.createElement('div');
        card.className = currentView === 'list' ? `issue-card status-${issue.Status} view-list-item` : `issue-card status-${issue.Status}`;

        let linkBtn = '';
        if (issue.Url && issue.Url.startsWith('http')) {
            linkBtn = `<a href="${issue.Url}" target="_blank" class="btn-link">開啟連結 ↗</a>`;
        }

        // Determine Fix Time display
        const fixTimeDisplay = issue.FixTime ? formatDate(issue.FixTime) : '-';

        card.innerHTML = `
      <div class="card-header">
        <span class="badge">${issue.Module} - ${issue.Function} (${issue.Code})</span>
        <span class="badge status-badge ${issue.Status}">${issue.Status}</span>
      </div>
      <div class="issue-title">ID: ${issue.ID}</div>
      <div class="issue-meta">
        回報: ${issue.Reporter} | ${formatDate(issue.Timestamp)}
      </div>
      <div class="issue-desc">${issue.Description}</div>
      ${issue.Fixer ? `<div class="issue-meta" style="color:#059669">修正: ${issue.Fixer} (${issue.FixNote}) <br> 時間: ${fixTimeDisplay}</div>` : ''}
      
      <div class="issue-actions">
        ${linkBtn}
        <button class="btn-fix" onclick="openFixModal('${issue.ID}')">修正 / 狀態</button>
      </div>
    `;

        // Bind click
        const fixBtn = card.querySelector('.btn-fix');
        fixBtn.addEventListener('click', () => openFixModal(issue));

        issueGrid.appendChild(card);
    });
}

function openFixModal(issue) {
    modalFix.classList.remove('hidden');
    fixForm.dataset.id = issue.ID;

    modalMeta.textContent = `正在編輯: ${issue.Module} - ${issue.Function} (ID: ${issue.ID})`;

    document.getElementById('modal-status').value = issue.Status;
    document.getElementById('modal-timestamp').value = issue.Timestamp || ''; // Report Time
    const fixerInput = document.getElementById('modal-fixer');
    fixerInput.value = issue.Fixer || '';
    document.getElementById('modal-fixNote').value = issue.FixNote || '';

    // Auto-fill Fixer if empty
    if (!fixerInput.value && currentUser) {
        fixerInput.value = currentUser;
    }

    // Set FixTime input
    const fixTimeInput = document.getElementById('modal-fixTime');
    if (issue.FixTime) {
        fixTimeInput.value = parseDateToInput(issue.FixTime);
    } else {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        fixTimeInput.value = now.toISOString().slice(0, 16);
    }
}

function formatDate(ts) {
    if (!ts) return '';
    return ts.split('T')[0];
}

function parseDateToInput(tsStr) {
    // tsStr ex: 2024/05/20 09:30:15
    if (!tsStr) return '';
    const parts = tsStr.split(' ');
    if (parts.length >= 2) {
        const datePart = parts[0].replace(/\//g, '-');
        const timePart = parts[1].substring(0, 5);
        return `${datePart}T${timePart}`;
    }
    return '';
}

function formatDateForSheet(isoStr) {
    // isoStr ex: 2024-05-20T09:30
    // To: 2024/05/20 09:30:00
    if (!isoStr) return '';
    return isoStr.replace('T', ' ').replace('-', '/').replace('-', '/') + ':00';
}
