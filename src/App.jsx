import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ReportPage from './components/ReportPage';
import FixListPage from './components/FixListPage';
import LoginModal from './components/LoginModal';
import FixModal from './components/FixModal';

const API_URL = import.meta.env.VITE_GOOGLE_APP_SCRIPT_URL;

function App() {
    const [currentUser, setCurrentUser] = useState(localStorage.getItem('userName') || '');
    const [currentTab, setCurrentTab] = useState('report');
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('載入中...');

    // Fix Modal State
    const [fixModalOpen, setFixModalOpen] = useState(false);
    const [editingIssue, setEditingIssue] = useState(null);

    // Edit in Report Form State (for Copy/Edit from List)
    const [reportFormState, setReportFormState] = useState({ mode: 'create', data: null });

    useEffect(() => {
        if (!API_URL) {
            alert('設定錯誤：找不到 VITE_GOOGLE_APP_SCRIPT_URL 環境變數。');
        }
        fetchIssues(true);
    }, []);

    const fetchIssues = async (silent = false) => {
        if (!API_URL) return;
        if (!silent) {
            setLoading(true);
            setLoadingText('載入中...');
        }

        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            setIssues(data);
        } catch (err) {
            console.error(err);
            if (!silent) alert('載入失敗');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleLogin = (name) => {
        setCurrentUser(name);
        localStorage.setItem('userName', name);
    };

    const handleEditUser = () => {
        const newName = prompt('修改姓名:', currentUser);
        if (newName && newName.trim()) {
            handleLogin(newName.trim());
        }
    };

    const submitData = async (payload, text, onSuccess) => {
        if (!API_URL) return;
        setLoading(true);
        setLoadingText(text);
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.status === 'success') {
                await onSuccess(result);
            } else {
                alert('失敗: ' + result.message);
            }
        } catch (err) {
            console.error(err);
            alert('操作失敗');
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const handleReportSubmit = async (data) => {
        // Check if user changed name in form
        if (data.reporter && data.reporter !== currentUser) {
            handleLogin(data.reporter);
        }

        const payload = { ...data, action: data.action };
        const isEdit = data.action === 'update';

        await submitData(payload, isEdit ? '更新中...' : '送出中...', async () => {
            alert(isEdit ? '修改成功！' : '回報成功！');
            await fetchIssues(true);
            if (isEdit) {
                setReportFormState({ mode: 'create', data: null }); // Reset
                setCurrentTab('list');
            } else {
                // Reset handled in ReportPage via key? or callback
            }
        });
        return true; // Signal success
    };

    const handleFixSubmit = async (data, id) => {
        await submitData({ action: 'update', id, ...data }, '更新中...', async () => {
            alert('更新成功！');
            setFixModalOpen(false);
            setEditingIssue(null);
            await fetchIssues(true);
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除此筆回報嗎？(無法復原)')) return;
        await submitData({ action: 'delete', id }, '刪除中...', async () => {
            alert('刪除成功');
            await fetchIssues(true);
        });
    };

    const openFixModal = (issue) => {
        setEditingIssue(issue);
        setFixModalOpen(true);
    };

    const handleListAction = (action, issue) => {
        if (action === 'edit' || action === 'copy') {
            setReportFormState({ mode: action, data: issue });
            setCurrentTab('report');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (action === 'delete') {
            handleDelete(issue.ID);
        }
    };

    return (
        <div className="app-container">
            <Navbar
                currentUser={currentUser}
                currentTab={currentTab}
                onSwitchTab={setCurrentTab}
                onEditUser={handleEditUser}
            />

            <main>
                {currentTab === 'report' && (
                    <ReportPage
                        currentUser={currentUser}
                        recentIssues={[...issues].reverse().slice(0, 10)}
                        onSubmit={handleReportSubmit}
                        onListAction={handleListAction}
                        formState={reportFormState}
                        resetFormState={() => setReportFormState({ mode: 'create', data: null })}
                    />
                )}

                {currentTab === 'list' && (
                    <FixListPage
                        issues={issues}
                        onRefresh={() => fetchIssues()}
                        onOpenFix={openFixModal}
                    />
                )}
            </main>

            {/* Overlays */}
            {loading && (
                <div id="loading" style={{ display: 'block' }}>{loadingText}</div>
            )}

            {!currentUser && (
                <LoginModal onLogin={handleLogin} />
            )}

            {fixModalOpen && editingIssue && (
                <FixModal
                    issue={editingIssue}
                    currentUser={currentUser}
                    onClose={() => setFixModalOpen(false)}
                    onSubmit={handleFixSubmit}
                />
            )}
        </div>
    );
}

export default App;
