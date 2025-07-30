import React, { useEffect, useState } from "react";
import { getAllInvestments, deleteInvestment, closeInvestment } from "../../api/investmentApi";
import { getAllRecommendations } from "../../api/recommendationApi";
import PageHeader from "../../components/PageHeader";
import ErrorPage from "../../components/ErrorPage";
import { useNotification } from "../../components/NotificationProvider";
import { useNavigate } from "react-router-dom";
import styles from "./InvestmentList.module.css";

export default function InvestmentList() {
  const [investments, setInvestments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [closeForm, setCloseForm] = useState({ close_price: '', close_date: '' });
  const notification = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [investmentsRes] = await Promise.all([
        getAllInvestments()
      ]);
      setInvestments(investmentsRes.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInvestment) return;
    try {
      await deleteInvestment(selectedInvestment.id);
      notification.success(`Investment for ${selectedInvestment.ticker} deleted successfully!`);
      setInvestments(prev => prev.filter(inv => inv.id !== selectedInvestment.id));
      setShowDeleteConfirm(false);
      setSelectedInvestment(null);
    } catch (err) {
      notification.error(err.message || 'Failed to delete investment');
    }
  };

  const handleCloseInvestment = async (e) => {
    e.preventDefault();
    if (!selectedInvestment) return;
    try {
      await closeInvestment(selectedInvestment.id, closeForm);
      notification.success(`Investment closed successfully!`);
      loadData();
      setShowCloseModal(false);
      setSelectedInvestment(null);
      setCloseForm({ close_price: '', close_date: '' });
    } catch (err) {
      notification.error(err.message || 'Failed to close investment');
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

  const calculateMetrics = (investment) => {
    const currentPrice = investment.currentPrice || investment.avgBuyPrice;
    const investedAmount = investment.quantity * investment.avgBuyPrice;
    const currentValue = investment.quantity * currentPrice;
    const gainLoss = currentValue - investedAmount;
    const gainLossPercent = (gainLoss / investedAmount * 100).toFixed(2);
    return {
      investedAmount,
      currentValue,
      gainLoss,
      gainLossPercent,
      currentPrice
    };
  };

  const getLinkedRecommendation = (investment) => {
    return recommendations.find(rec => rec.ticker === investment.ticker);
  };

  const groupInvestments = () => {
    if (groupBy === 'ticker') {
      const grouped = investments.reduce((acc, inv) => {
        if (!acc[inv.ticker]) acc[inv.ticker] = [];
        acc[inv.ticker].push(inv);
        return acc;
      }, {});
      return grouped;
    }
    return { all: investments };
  };

  if (error && error.type === 'NETWORK_ERROR') {
    return (
      <ErrorPage
        title="Unable to Connect"
        message={error.message}
        onRetry={loadData}
      />
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <PageHeader 
          title="Long-Term Investments"
          subtitle="Track your investment portfolio"
        />
        <div className={styles.loading}>Loading investments...</div>
      </div>
    );
  }

  const groupedInvestments = groupInvestments();

  return (
    <div className={styles.container}>
      <PageHeader 
        title="Long-Term Investments"
        subtitle="Track and monitor your investment portfolio"
      />

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Status:</label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Group By:</label>
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="none">None</option>
              <option value="ticker">Ticker</option>
            </select>
          </div>
        </div>
        <button 
          className={styles.addButton}
          onClick={() => navigate('/investments/new')}
        >
          + Add Investment
        </button>
      </div>

      {/* Investments Display */}
      {Object.entries(groupedInvestments).map(([groupKey, groupInvestments]) => (
        <div key={groupKey} className={styles.investmentGroup}>
          {groupBy === 'ticker' && (
            <h3 className={styles.groupHeader}>
              {groupKey} ({groupInvestments.length} position{groupInvestments.length !== 1 ? 's' : ''})
            </h3>
          )}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.tableHeaderCell}>Ticker</th>
                  <th className={styles.tableHeaderCell}>Recommendation</th>
                  <th className={styles.tableHeaderCell}>Current Price</th>
                  <th className={styles.tableHeaderCell}>Qty</th>
                  <th className={styles.tableHeaderCell}>Buy Avg</th>
                  <th className={styles.tableHeaderCell}>Invested</th>
                  <th className={styles.tableHeaderCell}>Current Value</th>
                  <th className={styles.tableHeaderCell}>P&L</th>
                  <th className={styles.tableHeaderCell}>Invested On</th>
                  <th className={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupInvestments.map(investment => {
                  const metrics = calculateMetrics(investment);
                  return (
                    <tr key={investment.id} className={styles.tableRow}>
                  <td className={`${styles.tableCell} ${styles.tickerCell}`} colSpan={2} style={{ minWidth: 180 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={styles.ticker}>{investment.ticker}</span>
                            {investment.buyBelow > 0 && (
                              <span className={styles.linkedBadge} title={`From recommendation: Buy below ₹${investment.buyBelow}`}>Rec</span>
                            )}
                          </div>
                          <div></div>
                          <div style={{ fontSize: '0.60rem', color: '#bbb' }}>
                            {investment.sector || '—'} | {investment.marketCap || '—'}
                          </div>
                          <div style={{ fontSize: '0.60rem', color: '#bbb' }}>
                            {investment.notes || '—'}
                          </div>
                        </div>
                      </td>
                  <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>₹{investment.buyBelow ? investment.buyBelow.toFixed(2) : '-'}</span>
                      <span className={investment.differencePercentage >= 0 ? styles.profit : styles.loss}>
                        {investment.differencePercentage >= 0 ? '+' : ''}
                        {investment.differencePercentage}%
                      </span>
                    </div>
                  </td>
                  <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                    {investment.currentPrice ? (
                      <span className={styles.currentPrice}>
                        ₹{metrics.currentPrice.toFixed(2)}
                      </span>
                    ) : (
                      <span className={styles.noPrice}>-</span>
                    )}
                  </td>
                      <td className={styles.tableCell} style={{ textAlign: 'center' }}>{investment.quantity}</td>
                      <td className={styles.tableCell} style={{ textAlign: 'center' }}>₹{investment.avgBuyPrice?.toFixed(2)}</td>
                      <td className={styles.tableCell} style={{ textAlign: 'center' }}>₹{metrics.investedAmount.toLocaleString()}</td>
                      <td className={styles.tableCell} style={{ textAlign: 'center' }}>₹{metrics.currentValue.toLocaleString()}</td>
                      <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                        <div className={styles.pnlCell}>
                          <span className={metrics.gainLoss >= 0 ? styles.profit : styles.loss}>
                            {metrics.gainLoss >= 0 ? '+' : ''}₹{metrics.gainLoss.toLocaleString()}
                          </span>
                          <span className={`${styles.pnlPercent} ${metrics.gainLoss >= 0 ? styles.profit : styles.loss}`}>
                            ({metrics.gainLossPercent}%)
                          </span>
                        </div>
                      </td>
                      <td className={styles.tableCell} style={{ textAlign: 'center' }}>{formatDate(investment.entryDate)}</td>
                      
                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          {investment.status === 'open' && (
                            <button 
                              onClick={() => {
                                setSelectedInvestment(investment);
                                setCloseForm({ 
                                  close_price: metrics.currentPrice.toString(), 
                                  close_date: new Date().toISOString().split('T')[0] 
                                });
                                setShowCloseModal(true);
                              }}
                              className={`${styles.actionButton} ${styles.closeButton}`}
                            >
                              Close
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedInvestment(investment);
                              setShowDeleteConfirm(true);
                            }}
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
        </div>
      ))}

      {investments.length === 0 && (
        <div className={styles.emptyState}>
          <h3>No investments found</h3>
          <p>Start by adding your first investment to track your portfolio.</p>
          <button 
            className={styles.addButton}
            onClick={() => navigate('/investments/new')}
          >
            + Add First Investment
          </button>
        </div>
      )}

      {/* Close Investment Modal */}
      {showCloseModal && selectedInvestment && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Close Investment - {selectedInvestment.ticker}</h3>
            <form onSubmit={handleCloseInvestment}>
              <div className={styles.formGroup}>
                <label>Close Price (₹)</label>
                <input
                  type="number"
                  value={closeForm.close_price}
                  onChange={(e) => setCloseForm(prev => ({ ...prev, close_price: e.target.value }))}
                  className={styles.modalInput}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Close Date</label>
                <input
                  type="date"
                  value={closeForm.close_date}
                  onChange={(e) => setCloseForm(prev => ({ ...prev, close_date: e.target.value }))}
                  className={styles.modalInput}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCloseModal(false);
                    setSelectedInvestment(null);
                    setCloseForm({ close_price: '', close_date: '' });
                  }}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.closeInvestmentButton}>
                  Close Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedInvestment && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Delete Investment</h3>
            <p>
              Are you sure you want to delete the investment in <strong>{selectedInvestment.ticker}</strong>? 
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedInvestment(null);
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button onClick={handleDelete} className={styles.confirmDeleteButton}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

