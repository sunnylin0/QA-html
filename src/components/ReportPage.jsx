import React, { useState, useEffect, useRef } from 'react';
import { parseDateToInput, formatDate } from '../utils';

const ReportPage = ({ currentUser, recentIssues, onSubmit, onListAction, formState, resetFormState }) => {
    const [formData, setFormData] = useState({
        module: '',
        functionName: '',
        code: '',
        url: '',
        reporter: '',
        description: '',
        timestamp: '',
        id: '',
        action: 'create'
    });

    // Init timestamp
    useEffect(() => {
        if (formState.mode === 'create' && !formState.data) {
            setNowToTimestamp();
            if (currentUser && !formData.reporter) {
                setFormData(prev => ({ ...prev, reporter: currentUser }));
            }
        } else if (formState.data) {
            // Pre-fill from List Action (Edit/Copy)
            const issue = formState.data;
            const isEdit = formState.mode === 'edit';
            setFormData({
                module: issue.Module || '',
                functionName: issue.Function || '',
                code: issue.Code || '',
                url: issue.Url || '',
                reporter: issue.Reporter || '',
                description: issue.Description || '',
                timestamp: issue.Timestamp ? parseDateToInput(issue.Timestamp) : '',
                id: isEdit ? issue.ID : '',
                action: isEdit ? 'update' : 'create'
            });
        }
    }, [formState, currentUser]);

    const setNowToTimestamp = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setFormData(prev => ({ ...prev, timestamp: now.toISOString().slice(0, 16) }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await onSubmit(formData);
        if (success) {
            resetForm();
        }
    };

    const resetForm = () => {
        setFormData({
            module: '',
            functionName: '',
            code: '',
            url: '',
            reporter: currentUser || '',
            description: '',
            timestamp: '',
            id: '',
            action: 'create'
        });
        setNowToTimestamp();
        resetFormState();
    };

    // Recent Search
    const [recentSearch, setRecentSearch] = useState('');
    const filteredRecent = recentIssues.filter(issue => {
        if (!recentSearch) return true;
        const term = recentSearch.toLowerCase();
        return `${issue.Module} ${issue.Function} ${issue.Description}`.toLowerCase().includes(term);
    });

    return (
        <section id="section-report" className="active">
            <div className="card">
                <h2>{formData.action === 'update' ? `修改問題回報 (ID: ${formData.id})` : '新增問題回報'}</h2>
                <form id="report-form" onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="group">
                            <label>模組 (Module)</label>
                            <input type="text" name="module" placeholder="例如: 其他管理" required value={formData.module} onChange={handleChange} />
                        </div>
                        <div className="group">
                            <label>功能名稱 (Function)</label>
                            <input type="text" name="functionName" placeholder="例如: 供應者評鑑" required value={formData.functionName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="row">
                        <div className="group">
                            <label>功能代號 (Code)</label>
                            <input type="text" name="code" placeholder="例如: P020208" required value={formData.code} onChange={handleChange} />
                        </div>
                        <div className="group">
                            <label>連結 (URL)</label>
                            <input type="url" name="url" placeholder="http://..." value={formData.url} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="row">
                        <div className="group">
                            <label>回報人員 (Reporter)</label>
                            <input type="text" name="reporter" id="reporter-input" placeholder="您的姓名" required value={formData.reporter} onChange={handleChange} />
                        </div>
                        <div className="group">
                            <label>時間 (Time)</label>
                            <input type="datetime-local" name="timestamp" id="timestamp-input" required value={formData.timestamp} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="group">
                        <label>問題描述 (Description)</label>
                        <textarea name="description" rows="5" placeholder="請詳細描述測試日期、問題內容..." required value={formData.description} onChange={handleChange}></textarea>
                    </div>

                    <div className="row" style={{ gap: '1rem' }}>
                        <button type="submit" className="btn-primary" id="btn-submit-report">
                            {formData.action === 'update' ? '確認修改' : (formState.mode === 'copy' ? '送出回報 (複製)' : '送出回報')}
                        </button>
                        {formData.action === 'update' || formState.mode === 'copy' ? (
                            <button type="button" className="btn-secondary" id="btn-cancel-edit" onClick={resetForm}>取消</button>
                        ) : null}
                    </div>
                </form>
            </div>

            {/* Recent Reports Section */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <h2>最近回報 (最後 10 筆)</h2>
                <div className="filter-bar" style={{ marginBottom: '1rem' }}>
                    <input
                        type="text"
                        id="recent-search"
                        placeholder="搜尋最近回報..."
                        style={{ flex: 1 }}
                        value={recentSearch}
                        onChange={(e) => setRecentSearch(e.target.value)}
                    />
                </div>
                <div id="recent-list">
                    {filteredRecent.length === 0 ? (
                        <p style={{ color: '#666', padding: '1rem' }}>無資料</p>
                    ) : (
                        filteredRecent.map((issue, idx) => (
                            <div key={idx} className="recent-item">
                                <div className="recent-info">
                                    <strong>{issue.Module} - {issue.Function}</strong> ({formatDate(issue.Timestamp)})<br />
                                    <span style={{ color: '#666', fontSize: '0.9em' }}>{issue.Description ? issue.Description.substring(0, 30) : ''}...</span>
                                </div>
                                <div className="recent-actions">
                                    <button className="btn-sm btn-copy" onClick={() => onListAction('copy', issue)}>複製</button>
                                    <button className="btn-sm btn-edit" onClick={() => onListAction('edit', issue)}>修改</button>
                                    <button className="btn-sm btn-del" onClick={() => onListAction('delete', issue)}>刪除</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default ReportPage;
