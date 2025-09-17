import React, { useEffect, useState } from "react";
import { getAllRecommendations, deleteRecommendation, archiveRecommendation } from "../../api/recommendationApi";
import PageHeader from "../../components/PageHeader";
import ErrorPage from "../../components/ErrorPage";
import { useNotification } from "../../components/NotificationProvider";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import styles from "./RecommendationList.module.css";

export default function RecommendationList() {
    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 700 : false);
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 700);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    const { theme } = useTheme();
    const [recommendations, setRecommendations] = useState([]);
    const [prices, setPrices] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [recToDelete, setRecToDelete] = useState(null);
    const [sortBy, setSortBy] = useState('ticker');
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
    const notification = useNotification();
    const navigate = useNavigate();

    useEffect(() => {
        loadRecommendations();
    }, []);

    const loadRecommendations = async () => {
        try {
            setLoading(true);
            const response = await getAllRecommendations();
            setRecommendations(response.data);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (recommendation) => {
        setRecToDelete(recommendation);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!recToDelete) return;

        try {
            await deleteRecommendation(recToDelete.id);
            notification.success(`Recommendation for ${recToDelete.ticker} deleted successfully!`);
            setRecommendations(prev => prev.filter(rec => rec.id !== recToDelete.id));
            setShowDeleteConfirm(false);
            setRecToDelete(null);
        } catch (err) {
            console.error('Failed to delete recommendation:', err);
            notification.error(err.message || 'Failed to delete recommendation');
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setRecToDelete(null);
    };

    const handleArchive = async (recommendation, archive = true) => {
        try {
            await archiveRecommendation(recommendation.id, archive);
            notification.success(`Recommendation ${archive ? 'archived' : 'unarchived'} successfully!`);
            loadRecommendations();
        } catch (err) {
            console.error('Failed to archive recommendation:', err);
            notification.error(err.message || 'Failed to archive recommendation');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d)) return "-";
        const dd = String(d.getDate()).padStart(2, '0');
        const mmm = d.toLocaleString('en-US', { month: 'short' });
        const yyyy = d.getFullYear();
        return `${dd} ${mmm} ${yyyy}`;
    };

    if (error && error.type === 'NETWORK_ERROR') {
        return (
            <ErrorPage
                title="Unable to Connect"
                message={error.message}
                onRetry={loadRecommendations}
            />
        );
    }

    if (loading) {
        return (
            <div className={`${styles.container} ${theme}`}>
                {/* <PageHeader
                    title="Stock Recommendations"
                    subtitle="Track and monitor stock recommendations"
                /> */}
                <div className={styles.loading}>Loading recommendations...</div>
            </div>
        );
    }


    // Sorting logic
    const sortedRecommendations = [...recommendations].sort((a, b) => {
        let valA, valB;
        switch (sortBy) {
            case 'ticker':
                valA = a.ticker?.toUpperCase() || '';
                valB = b.ticker?.toUpperCase() || '';
                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            case 'currentPrice':
                valA = a.currentPrice ?? 0;
                valB = b.currentPrice ?? 0;
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            case 'differencePercentage':
                valA = a.differencePercentage ?? 0;
                valB = b.differencePercentage ?? 0;
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            default:
                return 0;
        }
    });

    return (
        <div className={`${styles.container} ${theme}`}>
            {/* <PageHeader
                title="Stock Recommendations"
                subtitle="Track and monitor stock recommendations"
            /> */}
            {/* Action Bar */}
            <div className={styles.actionBar}>
                <div className={styles.filters}>
                    <label>Sort By:</label>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="ticker">Ticker</option>
                        <option value="currentPrice">Price</option>
                        <option value="differencePercentage">Opportunity</option>
                    </select>
                    <button
                        className={styles.filterSelect}
                        onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '▲' : '▼'}
                    </button>
                </div>
                <button
                    className={styles.addButton}
                    onClick={() => navigate('/recommendations/new')}
                >
                    + Add Recommendation
                </button>
            </div>

            {/* Mobile card list */}
            {isMobile ? (
                <div className={styles.mobileList}>
                    {[...sortedRecommendations]
                      .sort((a,b)=> (a.ticker||'').localeCompare(b.ticker||''))
                      .map(rec => {
                        const diffPct = rec.differencePercentage ?? null;
                        return (
                          <div key={rec.id} className={styles.mobileCard} onClick={() => navigate(`/recommendations/edit/${rec.id}`)}>
                            <div className={styles.mobileTopRow}>
                              <div className={styles.mobileTicker}>{rec.ticker}</div>
                              <button className={styles.editIconBtn} onClick={(e)=>{e.stopPropagation(); navigate(`/recommendations/edit/${rec.id}`);}}>✏️ Edit</button>
                            </div>
                            <div className={styles.mobileMeta}>Market Cap: <span className={styles.badge}>{rec.marketCap || '—'}</span></div>
                            <div className={styles.mobileRow}>
                              <div className={styles.left}>
                                <div>Buy Below: ₹{rec.buyBelow?.toLocaleString() || '-'}</div>
                                <div>Current: {rec.currentPrice ? `₹${rec.currentPrice.toFixed(2)}` : '-'}</div>
                              </div>
                              <div className={styles.right}>
                                <div className={diffPct!=null && diffPct>7 ? styles.opportunityBadge : styles.noOpportunityBadge}>
                                  {diffPct!=null ? `${diffPct>0?'+':''}${diffPct}%` : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                </div>
            ) : (
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th className={styles.tableHeaderCell}>Ticker</th>
                            <th className={styles.tableHeaderCell}>Market Cap</th>
                            <th className={styles.tableHeaderCell}>Buy Below</th>
                            <th className={styles.tableHeaderCell}>Current Price</th>
                            <th className={styles.tableHeaderCell}>Opportunity</th>
                            <th className={styles.tableHeaderCell}>Investment</th>
                            <th className={styles.tableHeaderCell}>Added On</th>
                            <th className={styles.tableHeaderCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRecommendations.map(rec => {
                            return (
                                <tr key={rec.id} className={styles.tableRow}>
                                    <td className={`${styles.tableCell} ${styles.tickerCell}`}>
                                        <span className={styles.ticker}>{rec.ticker}</span>
                                        {rec.sector && <span className={styles.sector}>{rec.sector}</span>}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {rec.marketCap ? (
                                            <span
                                                className={
                                                    rec.marketCap.toLowerCase().includes('large')
                                                        ? styles.marketCapLarge
                                                        : rec.marketCap.toLowerCase().includes('mid')
                                                        ? styles.marketCapMid
                                                        : styles.marketCapSmall
                                                }
                                            >
                                                {rec.marketCap.toUpperCase()}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className={styles.tableCell}>₹{rec.buyBelow?.toLocaleString()}</td>
                                    <td className={styles.tableCell}>
                                        {rec.currentPrice ? (
                                            <span className={rec.priceDifference > 0 ? styles.opportunityPrice : styles.regularPrice}>
                                                ₹{rec.currentPrice.toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className={styles.noPrice}>-</span>
                                        )}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {rec.priceDifference !== null ? (
                                            <td
                                                className={`${styles.tableCell} ${rec.differencePercentage > 7.0
                                                        ? styles.bgGreen
                                                        : rec.differencePercentage < 7.0 && rec.differencePercentage > 0
                                                            ? styles.bgRed
                                                            : ''
                                                    }`}
                                            >
                                                <div className={styles.opportunityCell}>
                                                    <span className={rec.differencePercentage > 7 ? styles.opportunityBadge : styles.noOpportunityBadge}>
                                                        {rec.differencePercentage > 7 ? `+ ${rec.differencePercentage}%` : `${rec.differencePercentage}%`}
                                                    </span>
                                                    <span className={styles.priceDiff}>
                                                        {rec.differencePercentage > 0 ? '+' : ''}
                                                        {rec.priceDifference.toFixed(2)}
                                                    </span>
                                                </div>
                                            </td>
                                        ) : (
                                            <span className={styles.noData}>-</span>
                                        )}
                                    </td>
                                    <td className={styles.tableCell}>{rec.totalInvested ? `₹${rec.totalInvested.toFixed(2)}` : '-'}</td>
                                    <td className={styles.tableCell}>{formatDate(rec.createdAt)}</td>
                                    <td className={styles.tableCell}>
                                        <div className={styles.actionButtons}>
                                            <button
                                                onClick={() => navigate(`/recommendations/edit/${rec.id}`)}
                                                className={`${styles.actionButton} ${styles.editButton}`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(rec)}
                                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            )}

            {recommendations.length === 0 && (
                <div className={styles.emptyState}>
                    <h3>No recommendations found</h3>
                    <p>Start by adding your first recommendation  to track your portfolio.</p>
                    <button
                        className={styles.addButton}
                        onClick={() => navigate('/recommendations/new')}
                    >
                        + Add First Recommendation
                    </button>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && recToDelete && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h3>Delete Recommendation</h3>
                        <p>
                            Are you sure you want to delete the recommendation for <strong>{recToDelete.ticker}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className={styles.modalActions}>
                            <button onClick={handleDeleteCancel} className={styles.cancelButton}>
                                Cancel
                            </button>
                            <button onClick={handleDeleteConfirm} className={styles.confirmDeleteButton}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
