import React, { useEffect, useState } from "react";
import { getAllRecommendations, deleteRecommendation, archiveRecommendation } from "../api/recommendationApi";
import PageHeader from "../components/PageHeader";
import ErrorPage from "../components/ErrorPage";
import { useNotification } from "../components/NotificationProvider";
import { useNavigate } from "react-router-dom";
import styles from "./RecommendationList.module.css";

export default function RecommendationList() {
  const [recommendations, setRecommendations] = useState([]);
  const [prices, setPrices] = useState({});
  const [filter, setFilter] = useState('active'); // active, archived, all
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recToDelete, setRecToDelete] = useState(null);
  const notification = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, [filter]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const filterParam = filter === 'all' ? null : filter;
      const response = await getAllRecommendations(filterParam);
      setRecommendations(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
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

  const calculatePriceDiff = (ticker, buyBelow) => {
    if (!prices[ticker] || !prices[ticker].current_price) return null;
    const currentPrice = prices[ticker].current_price;
    const diff = currentPrice - buyBelow;
    const diffPercent = ((diff / buyBelow) * 100).toFixed(2);
    return { diff, diffPercent, isOpportunity: currentPrice <= buyBelow };
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
      <div className={styles.container}>
        <PageHeader 
          title="Stock Recommendations"
          subtitle="Track and monitor stock recommendations"
        />
        <div className={styles.loading}>Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader 
        title="Stock Recommendations"
        subtitle="Track and monitor stock recommendations"
      />

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.filters}>
          <button 
            className={`${styles.filterButton} ${filter === 'active' ? styles.active : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={`${styles.filterButton} ${filter === 'archived' ? styles.active : ''}`}
            onClick={() => setFilter('archived')}
          >
            Archived
          </button>
          <button 
            className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>
        <button 
          className={styles.addButton}
          onClick={() => navigate('/recommendations/new')}
        >
          + Add Recommendation
        </button>
      </div>

      {/* Recommendations Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Ticker</th>
              <th className={styles.tableHeaderCell}>Buy Below</th>
              <th className={styles.tableHeaderCell}>Current Price</th>
              <th className={styles.tableHeaderCell}>Opportunity</th>
              <th className={styles.tableHeaderCell}>Source</th>
              <th className={styles.tableHeaderCell}>Added On</th>
              <th className={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map(rec => {
              const priceDiff = calculatePriceDiff(rec.ticker, rec.buy_below);
              return (
                <tr key={rec.id} className={styles.tableRow}>
                  <td className={`${styles.tableCell} ${styles.tickerCell}`}>
                    <span className={styles.ticker}>{rec.ticker}</span>
                    {rec.sector && <span className={styles.sector}>{rec.sector}</span>}
                  </td>
                  <td className={styles.tableCell}>₹{rec.buy_below?.toLocaleString()}</td>
                  <td className={styles.tableCell}>
                    {prices[rec.ticker]?.current_price ? (
                      <span className={priceDiff?.isOpportunity ? styles.opportunityPrice : styles.regularPrice}>
                        ₹{prices[rec.ticker].current_price.toFixed(2)}
                      </span>
                    ) : (
                      <span className={styles.noPrice}>-</span>
                    )}
                  </td>
                  <td className={styles.tableCell}>
                    {priceDiff ? (
                      <div className={styles.opportunityCell}>
                        <span className={priceDiff.isOpportunity ? styles.opportunityBadge : styles.noOpportunityBadge}>
                          {priceDiff.isOpportunity ? '🎯 BUY' : '❌ HIGH'}
                        </span>
                        <span className={styles.priceDiff}>
                          {priceDiff.diffPercent > 0 ? '+' : ''}{priceDiff.diffPercent}%
                        </span>
                      </div>
                    ) : (
                      <span className={styles.noData}>-</span>
                    )}
                  </td>
                  <td className={styles.tableCell}>{rec.source || '-'}</td>
                  <td className={styles.tableCell}>{formatDate(rec.created_on)}</td>
                  <td className={styles.tableCell}>
                    <div className={styles.actionButtons}>
                      <button 
                        onClick={() => navigate(`/recommendations/edit/${rec.id}`)}
                        className={`${styles.actionButton} ${styles.editButton}`}
                      >
                        Edit
                      </button>
                      {rec.status === 'active' ? (
                        <button 
                          onClick={() => handleArchive(rec, true)}
                          className={`${styles.actionButton} ${styles.archiveButton}`}
                        >
                          Archive
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleArchive(rec, false)}
                          className={`${styles.actionButton} ${styles.unarchiveButton}`}
                        >
                          Unarchive
                        </button>
                      )}
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
