import React, { useState, useEffect } from 'react';
import { parseDateToInput, formatDateForSheet } from '../utils';

const FixModal = ({ issue, currentUser, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        status: 'New',
        fixer: '',
        fixNote: '',
        fixTime: '',
        timestamp: '' // Report Time (display only)
    });

    useEffect(() => {
        if (issue) {
            setFormData({
                status: issue.Status,
                fixer: issue.Fixer || (currentUser || ''),
                fixNote: issue.FixNote || '',
                fixTime: issue.FixTime ? parseDateToInput(issue.FixTime) : getDefaultFixTime(),
                timestamp: issue.Timestamp
            });
        }
    }, [issue, currentUser]);

    const getDefaultFixTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData, issue.ID);
    };

    if (!issue) return null;

    return (
        <div id="modal-fix" className="modal" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className.includes('modal')) onClose(); }}>
            <div className="modal-content">
                <span className="close-modal" onClick={onClose}>&times;</span>
                <h3>問題修正</h3>
                <h2 className="modal-subject">正在編輯: {issue.Module} - {issue.Function} (ID: {issue.ID})</h2>

                {/* URL Link */}
                {issue.Url && issue.Url.startsWith('http') && (
                    <div style={{ marginBottom: '1rem' }}>
                        <a href={issue.Url} target="_blank" className="btn-link" style={{ display: 'inline-block', width: 'auto', padding: '0.5rem 1rem' }}>
                            開啟連結 ↗
                        </a>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="group">
                            <label>狀態 (Status)</label>
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="New">New (未解決)</option>
                                <option value="Fixed">Fixed (已修正)</option>
                                <option value="Closed">Closed (已結案)</option>
                            </select>
                        </div>
                        <div className="group">
                            <label>回報時間 (Report Time)</label>
                            <input type="text" value={formData.timestamp || ''} disabled style={{ background: '#e5e7eb', cursor: 'not-allowed' }} />
                        </div>
                        <div className="group">
                            <label>修正時間 (Fix Time)</label>
                            <input type="datetime-local" name="fixTime" value={formData.fixTime} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="group">
                        <label>修正人員 (Fixer)</label>
                        <input type="text" name="fixer" placeholder="工程師姓名" required value={formData.fixer} onChange={handleChange} />
                    </div>
                    <div className="group">
                        <label>修正說明 (Fix Note)</label>
                        <textarea name="fixNote" rows="3" placeholder="請填寫處理方式..." value={formData.fixNote} onChange={handleChange}></textarea>
                    </div>

                    <button type="submit" className="btn-primary">更新狀態</button>
                </form>
            </div>
        </div>
    );
};

export default FixModal;
