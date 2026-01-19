import React, { useState } from 'react';
import { formatDate } from '../utils';

const FixListPage = ({ issues, onRefresh, onOpenFix }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentView, setCurrentView] = useState('card');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filter Logic
    const filteredIssues = issues.filter(issue => {
        if (statusFilter !== 'All' && issue.Status !== statusFilter) return false;
        const term = searchTerm.toLowerCase();
        const searchString = `${issue.ID} ${issue.Code} ${issue.Module} ${issue.Function} ${issue.Description} ${issue.Reporter} ${issue.Fixer} ${issue.FixNote}`.toLowerCase();
        return searchString.includes(term);
    });

    // Pagination Logic
    const totalItems = filteredIssues.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pagedItems = filteredIssues.slice(startIndex, endIndex);

    // Handlers
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterChange = (e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    return (
        <section id="section-list" className="active">
            <div className="filter-bar">
                <input
                    type="text"
                    id="search-input"
                    placeholder="搜尋關鍵字..."
                    value={searchTerm}
                    onChange={handleSearch}
                />
                <select id="status-filter" value={statusFilter} onChange={handleFilterChange}>
                    <option value="All">全部狀態</option>
                    <option value="New">未解決 (New)</option>
                    <option value="Fixed">已修正 (Fixed)</option>
                    <option value="Closed">已結案 (Closed)</option>
                </select>
                <div className="view-toggle">
                    <button
                        id="btn-view-card"
                        className={currentView === 'card' ? 'active' : ''}
                        title="卡片檢視"
                        onClick={() => setCurrentView('card')}
                    >▤</button>
                    <button
                        id="btn-view-list"
                        className={currentView === 'list' ? 'active' : ''}
                        title="清單檢視"
                        onClick={() => setCurrentView('list')}
                    >☰</button>
                </div>
                <button id="btn-refresh" onClick={onRefresh}>重新整理</button>
            </div>

            {/* Pagination Controls */}
            <div id="pagination-controls" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="page-size">
                    顯示
                    <select id="items-per-page" value={itemsPerPage} onChange={handleItemsPerPageChange}>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    筆 / 頁
                </div>
                <div className="page-nav" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                        id="btn-prev"
                        className="btn-sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >上一頁</button>
                    <span id="page-info">Page {currentPage} of {totalPages} ({totalItems} 筆)</span>
                    <button
                        id="btn-next"
                        className="btn-sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >下一頁</button>
                </div>
            </div>

            <div id="issue-grid" className={currentView === 'card' ? 'view-card' : 'view-list'}>
                {pagedItems.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', gridColumn: '1/-1' }}>沒有符合的資料</p>
                ) : (
                    pagedItems.map((issue) => {
                        const fixTimeDisplay = issue.FixTime ? formatDate(issue.FixTime) : '-';
                        return (
                            <div key={issue.ID} className={`issue-card status-${issue.Status} ${currentView === 'list' ? 'view-list-item' : ''}`}>
                                <div className="card-header">
                                    <span className="badge">{issue.Module} - {issue.Function} ({issue.Code})</span>
                                    <span className={`badge status-badge ${issue.Status}`}>{issue.Status}</span>
                                </div>
                                <div className="issue-title">ID: {issue.ID}</div>
                                <div className="issue-meta">
                                    回報: {issue.Reporter} | {formatDate(issue.Timestamp)}
                                </div>
                                <div className="issue-desc">{issue.Description}</div>
                                {issue.Fixer && (
                                    <div className="issue-meta" style={{ color: '#059669' }}>
                                        修正: {issue.Fixer} ({issue.FixNote}) <br /> 時間: {fixTimeDisplay}
                                    </div>
                                )}

                                <div className="issue-actions">
                                    {issue.Url && issue.Url.startsWith('http') && (
                                        <a href={issue.Url} target="_blank" className="btn-link">開啟連結 ↗</a>
                                    )}
                                    <button className="btn-fix" onClick={() => onOpenFix(issue)}>修正 / 狀態</button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </section>
    );
};

export default FixListPage;
