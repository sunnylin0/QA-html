import './style.css'

const API_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

class ReportPage {
    constructor(app) {
        this.app = app;
        this.bindElements();
        this.bindEvents();
    }

    bindElements() {
        this.form = document.getElementById('report-form');
        this.timestampInput = document.getElementById('timestamp-input');
        this.reporterInput = document.getElementById('reporter-input');

        this.recentList = document.getElementById('recent-list');
        this.recentSearch = document.getElementById('recent-search');

        this.btnSubmit = document.getElementById('btn-submit-report');
        this.btnCancel = document.getElementById('btn-cancel-edit');
        this.reportAction = document.getElementById('report-action');
        this.reportId = document.getElementById('report-id');
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.recentSearch.addEventListener('input', () => this.renderRecentList());
        this.btnCancel.addEventListener('click', () => this.resetForm());
    }

    setTimestamp() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        if (this.timestampInput) this.timestampInput.value = now.toISOString().slice(0, 16);
    }

    autoFillReporter() {
        if (this.reporterInput && this.reportAction.value === 'create' && !this.reporterInput.value && this.app.currentUser) {
            this.reporterInput.value = this.app.currentUser;
        }
    }

    resetForm() {
        this.form.reset();
        this.setTimestamp();
        this.autoFillReporter();

        this.reportAction.value = 'create';
        this.reportId.value = '';
        this.btnSubmit.textContent = '送出回報';
        this.btnCancel.classList.add('hidden');
    }

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        data.timestamp = this.app.formatDateForSheet(data.timestamp);

        // Update local user logic (if name changed in form)
        if (data.reporter && this.app.currentUser !== data.reporter) {
            this.app.currentUser = data.reporter;
            localStorage.setItem('userName', data.reporter);
            this.app.updateUserUI();
        }

        const payload = { ...data, action: data.action };
        const isEdit = data.action === 'update';

        await this.app.submitData(payload, isEdit ? '更新中...' : '送出中...', async (res) => {
            if (res.status === 'success') {
                alert(isEdit ? '修改成功！' : '回報成功！');
                this.resetForm();
                await this.app.fetchIssues(true);
                if (isEdit) this.app.switchTab('list');
            } else {
                alert('失敗: ' + res.message);
            }
        });
    }

    renderRecentList() {
        const term = this.recentSearch.value.toLowerCase();
        let sorted = [...this.app.issues].reverse();

        if (term) {
            sorted = sorted.filter(issue =>
                `${issue.Module} ${issue.Function} ${issue.Description}`.toLowerCase().includes(term)
            );
        }

        const recent = sorted.slice(0, 10);
        this.recentList.innerHTML = '';

        if (recent.length === 0) {
            this.recentList.innerHTML = '<p style="color:#666; padding:1rem;">無資料</p>';
            return;
        }

        recent.forEach(issue => {
            const row = document.createElement('div');
            row.className = 'recent-item';
            row.innerHTML = `
                <div class="recent-info">
                    <strong>${issue.Module} - ${issue.Function}</strong> (${this.app.formatDate(issue.Timestamp)})<br>
                    <span style="color:#666; font-size:0.9em;">${issue.Description.substring(0, 30)}...</span>
                </div>
                <div class="recent-actions">
                    <button class="btn-sm btn-copy">複製</button>
                    <button class="btn-sm btn-edit">修改</button>
                    <button class="btn-sm btn-del">刪除</button>
                </div>
            `;
            row.querySelector('.btn-copy').onclick = () => this.fillForm(issue, 'copy');
            row.querySelector('.btn-edit').onclick = () => this.fillForm(issue, 'edit');
            row.querySelector('.btn-del').onclick = () => this.app.deleteIssue(issue.ID);
            this.recentList.appendChild(row);
        });
    }

    fillForm(issue, mode) {
        const map = {
            'module': issue.Module,
            'functionName': issue.Function,
            'code': issue.Code,
            'url': issue.Url,
            'reporter': issue.Reporter,
            'description': issue.Description
        };

        for (const [name, val] of Object.entries(map)) {
            const input = this.form.querySelector(`[name="${name}"]`);
            if (input) input.value = val || '';
        }

        if (issue.Timestamp) {
            this.timestampInput.value = this.app.parseDateToInput(issue.Timestamp);
        }

        if (mode === 'copy') {
            this.reportAction.value = 'create';
            this.reportId.value = '';
            this.btnSubmit.textContent = '送出回報 (複製)';
            this.btnCancel.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (mode === 'edit') {
            this.reportAction.value = 'update';
            this.reportId.value = issue.ID;
            this.btnSubmit.textContent = '確認修改 - ID: ' + issue.ID;
            this.btnCancel.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        this.app.switchTab('report');
    }
}

class FixListPage {
    constructor(app) {
        this.app = app;

        // State
        this.currentView = 'card';
        this.currentFilter = 'All';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredIssues = [];

        this.bindElements();
        this.bindEvents();
    }

    bindElements() {
        this.grid = document.getElementById('issue-grid');
        this.searchInput = document.getElementById('search-input');
        this.statusFilter = document.getElementById('status-filter');
        this.btnViewCard = document.getElementById('btn-view-card');
        this.btnViewList = document.getElementById('btn-view-list');
        this.btnRefresh = document.getElementById('btn-refresh');

        // Pagination
        this.paginationControls = document.getElementById('pagination-controls');
        this.itemsPerPageSelect = document.getElementById('items-per-page');
        this.btnPrev = document.getElementById('btn-prev');
        this.btnNext = document.getElementById('btn-next');
        this.pageInfo = document.getElementById('page-info');

        // Modal
        this.modalFix = document.getElementById('modal-fix');
        this.fixForm = document.getElementById('fix-form');
        this.closeModal = document.querySelector('.close-modal');
        this.modalMeta = document.getElementById('modal-issue-info');
    }

    bindEvents() {
        this.btnRefresh.addEventListener('click', () => this.app.fetchIssues());

        this.searchInput.addEventListener('input', () => { this.currentPage = 1; this.render(); });
        this.statusFilter.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.currentPage = 1;
            this.render();
        });

        this.itemsPerPageSelect.addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.render(false, false);
        });

        this.btnPrev.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render(false, false);
            }
        });

        this.btnNext.addEventListener('click', () => {
            const maxPage = Math.ceil(this.filteredIssues.length / this.itemsPerPage);
            if (this.currentPage < maxPage) {
                this.currentPage++;
                this.render(false, false);
            }
        });

        this.btnViewCard.addEventListener('click', () => {
            this.currentView = 'card';
            this.btnViewCard.classList.add('active');
            this.btnViewList.classList.remove('active');
            this.grid.className = 'view-card';
            this.render();
        });

        this.btnViewList.addEventListener('click', () => {
            this.currentView = 'list';
            this.btnViewList.classList.add('active');
            this.btnViewCard.classList.remove('active');
            this.grid.className = 'view-list';
            this.render();
        });

        // Modal Logic
        this.fixForm.addEventListener('submit', (e) => this.submitFix(e));
        this.closeModal.addEventListener('click', () => this.modalFix.classList.add('hidden'));
        window.addEventListener('click', (e) => {
            if (e.target === this.modalFix) this.modalFix.classList.add('hidden');
        });
    }

    render(reFilter = true) {
        this.app.setLoading(false);
        this.grid.innerHTML = '';

        if (reFilter) {
            const term = this.searchInput.value.toLowerCase();
            this.filteredIssues = this.app.issues.filter(issue => {
                if (this.currentFilter !== 'All' && issue.Status !== this.currentFilter) return false;
                const searchString = `${issue.ID} ${issue.Code} ${issue.Module} ${issue.Function} ${issue.Description} ${issue.Reporter} ${issue.Fixer} ${issue.FixNote}`.toLowerCase();
                return searchString.includes(term);
            });
        }

        const totalItems = this.filteredIssues.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, totalItems);
        const pagedItems = this.filteredIssues.slice(startIndex, endIndex);

        this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages} (${totalItems} 筆)`;
        this.btnPrev.disabled = this.currentPage === 1;
        this.btnNext.disabled = this.currentPage === totalPages;
        this.paginationControls.classList.remove('hidden');

        if (pagedItems.length === 0) {
            this.grid.innerHTML = '<p style="text-align:center; color:#666; grid-column: 1/-1;">沒有符合的資料</p>';
            return;
        }

        pagedItems.forEach(issue => {
            const card = document.createElement('div');
            card.className = this.currentView === 'list' ? `issue-card status-${issue.Status} view-list-item` : `issue-card status-${issue.Status}`;

            let linkBtn = '';
            if (issue.Url && issue.Url.startsWith('http')) {
                linkBtn = `<a href="${issue.Url}" target="_blank" class="btn-link">開啟連結 ↗</a>`;
            }

            const fixTimeDisplay = issue.FixTime ? this.app.formatDate(issue.FixTime) : '-';

            card.innerHTML = `
              <div class="card-header">
                <span class="badge">${issue.Module} - ${issue.Function} (${issue.Code})</span>
                <span class="badge status-badge ${issue.Status}">${issue.Status}</span>
              </div>
              <div class="issue-title">ID: ${issue.ID}</div>
              <div class="issue-meta">
                回報: ${issue.Reporter} | ${this.app.formatDate(issue.Timestamp)}
              </div>
              <div class="issue-desc">${issue.Description}</div>
              ${issue.Fixer ? `<div class="issue-meta" style="color:#059669">修正: ${issue.Fixer} (${issue.FixNote}) <br> 時間: ${fixTimeDisplay}</div>` : ''}
              
              <div class="issue-actions">
                ${linkBtn}
                <button class="btn-fix">修正 / 狀態</button>
              </div>
            `;

            card.querySelector('.btn-fix').addEventListener('click', () => this.openFixModal(issue));
            this.grid.appendChild(card);
        });
    }

    openFixModal(issue) {
        this.modalFix.classList.remove('hidden');
        this.fixForm.dataset.id = issue.ID;
        this.modalMeta.textContent = `正在編輯: ${issue.Module} - ${issue.Function} (ID: ${issue.ID})`;

        // URL Link Logic
        const urlContainer = document.getElementById('modal-url-container');
        urlContainer.innerHTML = '';
        if (issue.Url && issue.Url.startsWith('http')) {
            urlContainer.innerHTML = `<a href="${issue.Url}" target="_blank" class="btn-link" style="display:inline-block; width:auto; padding:0.5rem 1rem;">開啟連結 ↗</a>`;
        }

        document.getElementById('modal-status').value = issue.Status;
        document.getElementById('modal-timestamp').value = issue.Timestamp || '';
        const fixerInput = document.getElementById('modal-fixer');
        fixerInput.value = issue.Fixer || '';
        document.getElementById('modal-fixNote').value = issue.FixNote || '';

        // Auto-fill Fixer
        if (!fixerInput.value && this.app.currentUser) {
            fixerInput.value = this.app.currentUser;
        }

        const fixTimeInput = document.getElementById('modal-fixTime');
        if (issue.FixTime) {
            fixTimeInput.value = this.app.parseDateToInput(issue.FixTime);
        } else {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            fixTimeInput.value = now.toISOString().slice(0, 16);
        }
    }

    async submitFix(e) {
        e.preventDefault();
        const formData = new FormData(this.fixForm);
        const data = Object.fromEntries(formData.entries());
        const issueId = this.fixForm.dataset.id;

        if (data.fixTime) {
            data.fixTime = this.app.formatDateForSheet(data.fixTime);
        }

        await this.app.submitData({
            action: 'update',
            id: issueId,
            ...data
        }, '更新中...', async (res) => {
            alert('更新成功！');
            this.modalFix.classList.add('hidden');
            this.app.fetchIssues();
        });
    }
}

class QAApp {
    constructor() {
        if (!API_URL) alert('設定錯誤：找不到 VITE_GOOGLE_APP_SCRIPT_URL 環境變數。\n請檢查 .env 檔案。');

        this.currentUser = '';
        this.issues = [];
        this.loading = document.getElementById('loading');

        // Tab elements
        this.tabReport = document.getElementById('tab-report');
        this.tabList = document.getElementById('tab-list');
        this.sectionReport = document.getElementById('section-report');
        this.sectionList = document.getElementById('section-list');

        // Login elements
        this.modalLogin = document.getElementById('modal-login');
        this.loginForm = document.getElementById('login-form');
        this.loginNameInput = document.getElementById('login-name');
        this.currentUserNameSpan = document.getElementById('current-user-name');

        // Init Pages
        this.reportPage = new ReportPage(this);
        this.fixListPage = new FixListPage(this);

        this.init();
    }

    init() {
        this.checkLogin();
        this.bindGlobalEvents();
        this.fetchIssues(true);
    }

    checkLogin() {
        const savedUser = localStorage.getItem('userName');
        if (savedUser) {
            this.currentUser = savedUser;
            this.updateUserUI();
            this.modalLogin.style.display = 'none';
        } else {
            this.modalLogin.style.display = 'flex';
        }
    }

    bindGlobalEvents() {
        // Login Submit
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = this.loginNameInput.value.trim();
            if (name) {
                this.currentUser = name;
                localStorage.setItem('userName', this.currentUser);
                this.updateUserUI();
                this.modalLogin.style.display = 'none';
            }
        });

        // Edit Name
        this.currentUserNameSpan.addEventListener('click', () => {
            const newName = prompt('修改姓名:', this.currentUser);
            if (newName && newName.trim()) {
                this.currentUser = newName.trim();
                localStorage.setItem('userName', this.currentUser);
                this.updateUserUI();
            }
        });

        // Tab Switching
        this.tabReport.addEventListener('click', () => this.switchTab('report'));
        this.tabList.addEventListener('click', () => {
            this.switchTab('list');
            this.fetchIssues();
        });
    }

    updateUserUI() {
        this.currentUserNameSpan.textContent = this.currentUser;
        this.reportPage.autoFillReporter();
    }

    switchTab(tab) {
        if (tab === 'report') {
            this.tabReport.classList.add('active');
            this.tabList.classList.remove('active');
            this.sectionReport.classList.add('active');
            this.sectionList.classList.remove('active');
            this.fetchIssues(true);
        } else {
            this.tabReport.classList.remove('active');
            this.tabList.classList.add('active');
            this.sectionReport.classList.remove('active');
            this.sectionList.classList.add('active');
        }
    }

    setLoading(isLoading, text = '載入中...') {
        if (isLoading) {
            this.loading.textContent = text;
            this.loading.classList.remove('hidden');
        } else {
            this.loading.classList.add('hidden');
        }
    }

    async fetchIssues(onlyRecent = false) {
        if (!API_URL) return;
        if (!onlyRecent) this.setLoading(true);

        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            this.issues = data;

            if (onlyRecent || this.sectionReport.classList.contains('active')) {
                this.reportPage.renderRecentList();
            }

            if (!onlyRecent || this.sectionList.classList.contains('active')) {
                this.fixListPage.render(true);
            }
        } catch (err) {
            console.error(err);
            if (!onlyRecent) this.loading.textContent = '載入失敗';
        } finally {
            if (!this.issues.length) this.setLoading(false);
        }
    }

    async submitData(payload, loadingText, onSuccess) {
        if (!API_URL) return;
        this.setLoading(true, loadingText);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            await onSuccess(result);
        } catch (err) {
            console.error(err);
            alert('操作失敗');
        } finally {
            this.setLoading(false);
        }
    }

    async deleteIssue(id) {
        if (!confirm('確定要刪除此筆回報嗎？(無法復原)')) return;

        await this.submitData({
            action: 'delete',
            id: id
        }, '刪除中...', async () => {
            alert('刪除成功');
            this.fetchIssues(true);
        });
    }

    // --- Utilities ---
    formatDate(ts) {
        if (!ts) return '';
        return ts.split('T')[0];
    }

    parseDateToInput(tsStr) {
        if (!tsStr) return '';
        const parts = tsStr.split(' ');
        if (parts.length >= 2) {
            const datePart = parts[0].replace(/\//g, '-');
            const timePart = parts[1].substring(0, 5);
            return `${datePart}T${timePart}`;
        }
        return '';
    }

    formatDateForSheet(isoStr) {
        if (!isoStr) return '';
        return isoStr.replace('T', ' ').replace('-', '/').replace('-', '/') + ':00';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new QAApp();
});
