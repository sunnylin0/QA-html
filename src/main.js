import './style.css'

const API_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

// State
let issues = [];
let currentFilter = 'All';

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

const modalFix = document.getElementById('modal-fix');
const closeModal = document.querySelector('.close-modal');
const fixForm = document.getElementById('fix-form');
const modalMeta = document.getElementById('modal-issue-info');

// View State
let currentView = 'card'; // 'card' or 'list'

// --- Initialization ---

if (!API_URL) {
    alert('設定錯誤：找不到 VITE_GOOGLE_APP_SCRIPT_URL 環境變數。\n請檢查 .env 檔案。');
}

// Restore saved reporter name
const savedReporter = localStorage.getItem('reporter');
if (savedReporter) {
    document.getElementById('reporter-input').value = savedReporter;
}

// --- Event Listeners ---

// View Toggle
btnViewCard.addEventListener('click', () => {
    currentView = 'card';
    btnViewCard.classList.add('active');
    btnViewList.classList.remove('active');
    issueGrid.className = 'view-card';
    renderIssues(); // Re-render to apply new view
});

btnViewList.addEventListener('click', () => {
    currentView = 'list';
    btnViewList.classList.add('active');
    btnViewCard.classList.remove('active');
    issueGrid.className = 'view-list';
    renderIssues(); // Re-render to apply new view
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

    // Save reporter name
    localStorage.setItem('reporter', data.reporter);

    const payload = {
        action: 'create',
        ...data
    };

    if (!API_URL) return;

    setLoading(true, '送出中...');
    try {
        // Send as plain string to avoid CORS preflight issues with GAS
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        alert('回報成功！');
        reportForm.reset();
        document.getElementById('reporter-input').value = localStorage.getItem('reporter') || ''; // restore name
    } catch (err) {
        console.error(err);
        alert('回報失敗，請檢查網路或後端連結。');
    } finally {
        setLoading(false);
    }
});

// List Actions
btnRefresh.addEventListener('click', fetchIssues);
searchInput.addEventListener('input', renderIssues);
statusFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderIssues();
});

// Modal
closeModal.addEventListener('click', () => modalFix.classList.add('hidden'));
window.addEventListener('click', (e) => {
    if (e.target === modalFix) modalFix.classList.add('hidden');
});

fixForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(fixForm);
    const data = Object.fromEntries(formData.entries()); // status, fixer, fixNote
    const issueId = fixForm.dataset.id;

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
        fetchIssues(); // Reload list
    } catch (err) {
        console.error(err);
        alert('更新失敗。');
    } finally {
        setLoading(false);
    }
});

// --- Functions ---

function switchTab(tab) {
    if (tab === 'report') {
        tabReport.classList.add('active');
        tabList.classList.remove('active');
        sectionReport.classList.add('active');
        sectionList.classList.remove('active');
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

async function fetchIssues() {
    if (!API_URL) return;
    setLoading(true);
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        issues = data; // Array of objects
        renderIssues();
    } catch (err) {
        console.error(err);
        loading.textContent = '載入失敗';
    } finally {
        // loading is handled by render or explicit hide
        if (!issues.length) setLoading(false);
    }
}

function renderIssues() {
    setLoading(false);
    issueGrid.innerHTML = '';

    const term = searchInput.value.toLowerCase();

    const filtered = issues.filter(issue => {
        // Status Filter
        if (currentFilter !== 'All' && issue.Status !== currentFilter) return false;

        // Search Filter
        const searchString = `${issue.Module} ${issue.Function} ${issue.Description} ${issue.Reporter}`.toLowerCase();
        return searchString.includes(term);
    });

    if (filtered.length === 0) {
        issueGrid.innerHTML = '<p style="text-align:center; color:#666; grid-column: 1/-1;">沒有符合的資料</p>';
        return;
    }

    filtered.forEach(issue => {
        const card = document.createElement('div');
        card.className = `issue-card status-${issue.Status}`;

        // Link Button logic
        let linkBtn = '';
        if (issue.Url && issue.Url.startsWith('http')) {
            linkBtn = `<a href="${issue.Url}" target="_blank" class="btn-link">開啟連結 ↗</a>`;
        }

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
      ${issue.Fixer ? `<div class="issue-meta" style="color:#059669">修正: ${issue.Fixer} (${issue.FixNote})</div>` : ''}
      
      <div class="issue-actions">
        ${linkBtn}
        <button class="btn-fix" onclick="openFixModal('${issue.ID}')">修正 / 狀態</button>
      </div>
    `;

        // Bind click event for this specific card's fix button to avoid global scope issues
        const fixBtn = card.querySelector('.btn-fix');
        fixBtn.addEventListener('click', () => openFixModal(issue));

        issueGrid.appendChild(card);
    });
}

function openFixModal(issue) {
    modalFix.classList.remove('hidden');
    fixForm.dataset.id = issue.ID;

    modalMeta.textContent = `正在編輯: ${issue.Module} - ${issue.Function} (ID: ${issue.ID})`;

    // Populate current values
    const statusSelect = document.getElementById('modal-status');
    statusSelect.value = issue.Status;

    document.getElementById('modal-fixer').value = issue.Fixer || '';
    document.getElementById('modal-fixNote').value = issue.FixNote || '';
}

function formatDate(ts) {
    if (!ts) return '';
    // Simple check if it's a date string
    return ts.split('T')[0];
}
