import React from 'react';

const Navbar = ({ currentUser, currentTab, onSwitchTab, onEditUser }) => {
    return (
        <header>
            <h1>QA 系統</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div id="user-info" style={{ fontSize: '0.9rem', color: '#555' }}>
                    Hi,{' '}
                    <span
                        id="current-user-name"
                        style={{ fontWeight: 'bold', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={onEditUser}
                    >
                        {currentUser || 'User'}
                    </span>
                </div>
                <nav>
                    <button
                        id="tab-report"
                        className={currentTab === 'report' ? 'active' : ''}
                        onClick={() => onSwitchTab('report')}
                    >
                        回報問題
                    </button>
                    <button
                        id="tab-list"
                        className={currentTab === 'list' ? 'active' : ''}
                        onClick={() => onSwitchTab('list')}
                    >
                        修正列表
                    </button>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
