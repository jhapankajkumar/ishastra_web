import React, { useEffect, useState } from "react";
import { getAllJournals, getJournalById, deleteJournal } from "../../api/journalApi";
import JournalDetailsPopup from "./JournalDetailsPopup";
import PageHeader from "../../components/PageHeader";
import ErrorPage from "../../components/ErrorPage";
import { useNotification } from "../../components/NotificationProvider";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import styles from "./JournalList.module.css";

export default function JournalList() {
  const { theme } = useTheme();
  const [journals, setJournals] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupJournal, setPopupJournal] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const notification = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getAllJournals()
      .then(res => {
        let data = res.data.data;
        setJournals(data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch journals:', err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleDeleteClick = (journal) => {
    setJournalToDelete(journal);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!journalToDelete) return;

    try {
      await deleteJournal(journalToDelete.id);
      notification.success(`Journal entry for ${journalToDelete.stock} deleted successfully!`);

      // Remove the deleted journal from the local state
      setJournals(prev => prev.filter(journal => journal.id !== journalToDelete.id));

      // Close confirmation dialog
      setShowDeleteConfirm(false);
      setJournalToDelete(null);
    } catch (err) {
      console.error('Failed to delete journal:', err);
      let errorMessage = "Failed to delete journal entry.";

      if (err.type === 'NETWORK_ERROR') {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      notification.error(errorMessage);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setJournalToDelete(null);
  };

  const handleShowDetails = async (id) => {
    try {
      const res = await getJournalById(id);
      console.log('Fetched journal details:', res.data);
      setPopupJournal(res.data);
      setShowPopup(true);
    } catch (err) {
      console.error('Failed to fetch journal details:', err);
      let errorMessage = "Failed to load journal details.";

      if (err.type === 'NETWORK_ERROR') {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      notification.error(errorMessage);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupJournal(null);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    getAllJournals()
      .then(res => {
        setJournals(res.data.data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch journals:', err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Sorting logic
  const getSortedJournals = () => {
    let sorted = [...journals];
    if (sortBy === 'ticker') {
      sorted.sort((a, b) => {
        if (!a.ticker) return 1;
        if (!b.ticker) return -1;
        if (a.ticker.toLowerCase() < b.ticker.toLowerCase()) return sortOrder === 'asc' ? -1 : 1;
        if (a.ticker.toLowerCase() > b.ticker.toLowerCase()) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (sortBy === 'date') {
      sorted.sort((a, b) => {
        const dA = new Date(a.entryDate);
        const dB = new Date(b.entryDate);
        return sortOrder === 'asc' ? dA - dB : dB - dA;
      });
    } else if (sortBy === 'trend') {
      sorted.sort((a, b) => {
        if (!a.trend) return 1;
        if (!b.trend) return -1;
        if (a.trend.toLowerCase() < b.trend.toLowerCase()) return sortOrder === 'asc' ? -1 : 1;
        if (a.trend.toLowerCase() > b.trend.toLowerCase()) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const handleEdit = (journal) => {
    navigate(`/journal/update/${journal.id}`);
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

  const getTrendColor = (trend) => {
    switch (trend?.toLowerCase()) {
      case 'bullish': return '#10B981';
      case 'bearish': return '#EF4444';
      case 'sideways': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  if (error && error.type === 'NETWORK_ERROR') {
    return (
      <ErrorPage
        title="Unable to Connect"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className={`${styles.container} ${theme}`}>
        {/* <PageHeader
          title="Chart Reading Journal"
          subtitle="Track your chart analysis and market observations"
        /> */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          color: 'var(--text-secondary)'
        }}>
          Loading journal entries...
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${theme}`}>
      {/* <PageHeader 
        title="Chart Reading Journal"
        subtitle="Track your chart analysis and market observations"
      /> */}

      <div className={styles.actionBar}>
              <div className={styles.filters}>
                <label>Sort By:</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="ticker">Ticker (A-Z)</option>
                  <option value="date">Date</option>
                  <option value="trend">Trend</option>
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
                onClick={() => navigate('/journal/new')}
              >
                + Add Journal
              </button>
            </div>

      {/* Modern Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Stock</th>
              <th className={styles.tableHeaderCell}>Date</th>
              <th className={styles.tableHeaderCell}>Trend</th>
              <th className={styles.tableHeaderCell}>Key Signals</th>
              <th className={styles.tableHeaderCell}>Entry Considered</th>
              <th className={styles.tableHeaderCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {getSortedJournals().map(journal => (
              <tr
                key={journal.id}
                className={styles.tableRow}
                onClick={() => handleShowDetails(journal.id)}
              >
                <td className={`${styles.tableCell} ${styles.stockCell}`}>
                  <div className={styles.stockContainer}>
                    <span className={styles.stockSymbol}>{journal.ticker}</span>
                  </div>
                </td>
                <td className={`${styles.tableCell} ${styles.dateCell}`}>{formatDate(journal.entryDate)}</td>
                <td className={styles.tableCell}>
                  <span 
                    className={styles.trendBadge}
                    style={{ backgroundColor: getTrendColor(journal.trend) }}
                  >
                    {journal.trend || 'N/A'}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.signalsContainer}>
                    {journal.nearSupport && <span className={styles.signal}>Support</span>}
                    {journal.nearResistance && <span className={styles.signal}>Resistance</span>}
                    {journal.emaTouch && <span className={styles.signal}>EMA</span>}
                    {journal.volumeSpike && <span className={styles.signal}>Volume</span>}
                    {(!journal.nearSupport && !journal.nearResistance && !journal.emaTouch && !journal.volumeSpike) && 
                      <span className={styles.noSignals}>-</span>
                    }
                  </div>
                </td>
                <td className={styles.tableCell}>
                  <span className={`${styles.entryBadge} ${journal.entryConsidered ? styles.entryYes : styles.entryNo}`}>
                    {journal.entryConsidered ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className={styles.tableCell}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={e => { e.stopPropagation(); handleShowDetails(journal.id); }}
                      className={`${styles.actionButton} ${styles.viewButton}`}
                    >
                      View
                    </button>
                    <button 
                      onClick={e => { e.stopPropagation(); handleEdit(journal); }}
                      className={`${styles.actionButton} ${styles.editButton}`}
                    >
                      Update
                    </button>
                    <button 
                      onClick={e => { e.stopPropagation(); handleDeleteClick(journal); }}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {journals.length === 0 && (
        <div className={styles.emptyState}>
          <h3>No journal found</h3>
          <p>Start by adding your first journal entry to track your thoughts.</p>
          <button
            className={styles.addButton}
            onClick={() => navigate('/journal/new')}
          >
            + Add First Journal
          </button>
        </div>
      )}
      {/* Journal Details Popup */}
      {showPopup && popupJournal && (
        console.log('Rendering popup with journal:', popupJournal.analysis),
        console.log('Rendering popup with charts:', popupJournal.chartImages),
        <JournalDetailsPopup
          journal={popupJournal.analysis}
          charts={popupJournal.chartImages ? popupJournal.chartImages : []}
          onClose={handleClosePopup}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && journalToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: 32,
            maxWidth: 500,
            width: '90%',
            border: '1px solid var(--border-secondary)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0 0 16px 0'
            }}>
              Delete Journal Entry
            </h3>

            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete the journal entry for <strong style={{ color: 'var(--text-primary)' }}>{journalToDelete.stock}</strong> from {formatDate(journalToDelete.date)}?
              This action cannot be undone and will permanently remove all analysis data.
            </p>

            <div style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleDeleteCancel}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  borderRadius: 8,
                  border: '1px solid var(--border-secondary)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = 'var(--bg-tertiary)';
                  e.target.style.color = 'var(--text-primary)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = 'var(--text-secondary)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--status-error)',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#DC2626';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'var(--status-error)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
