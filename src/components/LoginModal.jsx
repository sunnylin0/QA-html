import React, { useState } from 'react';

const LoginModal = ({ onLogin }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onLogin(name.trim());
        }
    };

    return (
        <div id="modal-login" className="modal" style={{ display: 'flex' }}>
            <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                <h3>歡迎使用 QA 系統</h3>
                <p style={{ marginBottom: '1.5rem', color: '#666' }}>請輸入您的姓名以繼續</p>
                <form onSubmit={handleSubmit}>
                    <div className="group">
                        <input
                            type="text"
                            placeholder="您的姓名 (例: 王小明)"
                            required
                            style={{ textAlign: 'center' }}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn-primary">進入系統</button>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;
