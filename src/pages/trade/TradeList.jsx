import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTrades, getTradeById, deleteTrade, getTradeTransactions } from "../../api/tradeApi";
import TradeAdd from "./TradeAdd";
import TradeDetailsPopup from "./TradeDetailsPopup";
import PageHeader from "../../components/PageHeader";
import ErrorPage from "../../components/ErrorPage";
import { useNotification } from "../../components/NotificationProvider";
import { getTickerBySymbol } from '../../data/tickerData';
import styles from "./TradeList.module.css";

export default function TradeList() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [sortBy, setSortBy] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [mode, setMode] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTrade, setPopupTrade] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const notification = useNotification();

  useEffect(() => {
    setLoading(true);
    getAllTrades()
      .then(async res => {
        // For each trade, fetch its exit transactions and attach as exit_transactions
        const tradesWithExits = await Promise.all(res.data.map(async trade => {
          try {
            const txRes = await getTradeTransactions(trade.id);
            // Only keep exit transactions
            const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
            return { ...trade, exitTransactions: exitTx };
          } catch (e) {
            return { ...trade, exitTransactions: [] };
          }
        }));
        setTrades(tradesWithExits);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch trades:', err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleEdit = (id) => {
    // Navigate to the new UpdateTrade page
    navigate(`/trades/update/${id}`);
  };

  const handleReview = async (id) => {
    // Navigate to the new TradeReview page
    navigate(`/trades/review/${id}`);
  };

  const handleDeleteClick = (trade) => {
    setTradeToDelete(trade);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tradeToDelete) return;

    try {
      await deleteTrade(tradeToDelete.id);
      notification.success(`Trade ${tradeToDelete.ticker} deleted successfully!`);

      // Remove the deleted trade from the local state
      setTrades(prev => prev.filter(trade => trade.id !== tradeToDelete.id));

      // Close confirmation dialog
      setShowDeleteConfirm(false);
      setTradeToDelete(null);
    } catch (err) {
      console.error('Failed to delete trade:', err);
      let errorMessage = "Failed to delete trade.";

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
    setTradeToDelete(null);
  };

  const handleShowDetails = async (id) => {
    try {
      const res = await getTradeById(id);
      setPopupTrade(res.data);
      setShowPopup(true);
    } catch (err) {
      console.error('Failed to fetch trade details:', err);
      let errorMessage = "Failed to load trade details.";

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
    setPopupTrade(null);
  };

  const handleBack = () => {
    setSelectedTrade(null);
    setMode(null);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    getAllTrades()
      .then(async res => {
        const tradesWithExits = await Promise.all(res.data.map(async trade => {
          try {
            const txRes = await getTradeTransactions(trade.id);
            const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
            return { ...trade, exitTransactions: exitTx };
          } catch (e) {
            return { ...trade, exitTransactions: [] };
          }
        }));
        const sorted = [...tradesWithExits].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
        setTrades(sorted);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch trades:', err);
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
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

  const getInvested = (trade) => {
    if (trade.entryPrice && trade.quantity) {
      return (Number(trade.entryPrice) * Number(trade.quantity)).toFixed(2);
    }
    return "-";
  };

  const getPL = (trade) => {
    if (
      trade.exitPrice !== undefined &&
      trade.exitPrice !== null &&
      trade.entryPrice !== undefined &&
      trade.entryPrice !== null &&
      trade.quantity !== undefined &&
      trade.quantity !== null &&
      trade.direction
    ) {
      // Calculate P&L correctly for both LONG and SHORT trades
      const priceDiff = trade.direction.toLowerCase() === 'long'
        ? Number(trade.exitPrice) - Number(trade.entryPrice)
        : Number(trade.entryPrice) - Number(trade.exitPrice);
      const pl = priceDiff * Number(trade.quantity);
      return pl.toFixed(2);
    }
    return "-";
  };

  if (selectedTrade && mode) {
    const getTitle = () => {
      if (mode === "update") return "Update Trade Exit";
      if (mode === "review") return "Review Trade";
      return "Edit Trade";
    };

    const getSubtitle = () => {
      const companyName = getTickerBySymbol(selectedTrade.ticker)?.name;
      const tickerDisplay = companyName ? `${selectedTrade.ticker} (${companyName})` : selectedTrade.ticker;

      if (mode === "update") return `Update exit details for ${tickerDisplay}`;
      if (mode === "review") return `Add post-trade analysis for ${tickerDisplay}`;
      return `Edit trade details for ${tickerDisplay}`;
    };

    return (
      <div className={styles.container}>
        <PageHeader
          title={getTitle()}
          subtitle={getSubtitle()}
          showBackButton={true}
          onBack={handleBack}
        />
        <TradeAdd mode={mode} tradeData={selectedTrade} onSubmit={handleBack} />
      </div>
    );
  }

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
      <div className={styles.container}>
        <PageHeader
          title="Trade List"
          subtitle="View and manage all your trades"
        />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          color: '#9CA3AF'
        }}>
          Loading trades...
        </div>
      </div>
    );
  }

  // --- Helper functions for partial exits ---
  // Get all exit transactions for a trade (array of {transaction_date, price, quantity})
  const getExitTransactions = (trade) => {
    let txs = trade.exitTransactions || [];
    // If no array but trade has exitPrice and exitDate, treat as single exit
    if ((!txs || !Array.isArray(txs) || txs.length === 0) && trade.exitPrice && trade.exitDate && trade.quantity) {
      txs = [{
        transaction_date: trade.exitDate,
        price: trade.exitPrice,
        quantity: trade.quantity - (trade.remainingQuantity ?? 0)
      }];
    }
    return txs || [];
  };

  // Get last exit date (latest transaction_date among all exit transactions)
  const getLastExitDate = (trade) => {
    const exits = getExitTransactions(trade);
    if (!exits.length) return "-";
    // Find the latest exit by comparing dates (handle both string and numeric)
    const last = exits.reduce((latest, tx) => {
      if (!tx.transactionDate) return latest;
      const txDate = typeof tx.transactionDate === 'number' ? new Date(tx.transactionDate) : new Date(tx.transactionDate);
      if (!latest) return tx;
      const latestDate = typeof latest.transactionDate === 'number' ? new Date(latest.transactionDate) : new Date(latest.transactionDate);
      return txDate > latestDate ? tx : latest;
    }, null);
    if (last && last.transactionDate) {
      // Support both numeric and string date
      const dateVal = typeof last.transactionDate === 'number' ? last.transactionDate : Date.parse(last.transactionDate);
      if (!isNaN(dateVal)) {
        return formatDate(dateVal);
      }
    }
    return "-";
  };

  // Get average exit price (weighted by quantity)
  const getAverageExitPrice = (trade) => {
    const exits = getExitTransactions(trade);
    if (!exits.length) return "-";
    let totalQty = 0, totalValue = 0;
    exits.forEach(tx => {
      if (tx.price !== undefined && tx.quantity !== undefined) {
        totalQty += Number(tx.quantity);
        totalValue += Number(tx.price) * Number(tx.quantity);
      }
    });
    if (totalQty === 0) return "-";
    return (totalValue / totalQty).toFixed(2);
  };

  // Calculate P&L based on all partial exits
  const getPartialPL = (trade) => {
    const exits = getExitTransactions(trade);
    if (!exits.length || !trade.entryPrice || !trade.direction) return "-";
    let pl = 0;
    exits.forEach(tx => {
      if (tx.price !== undefined && tx.quantity !== undefined) {
        const priceDiff = trade.direction.toLowerCase() === 'long'
          ? Number(tx.price) - Number(trade.entryPrice)
          : Number(trade.entryPrice) - Number(tx.price);
        pl += priceDiff * Number(tx.quantity);
      }
    });
    return pl.toFixed(2);
  };


  // --- Sorting logic ---
  const getPLForSort = (trade) => {
    // Use getPartialPL for correct P&L
    const pl = getPartialPL(trade);
    return pl === "-" ? 0 : Number(pl);
  };

  const getInvestedForSort = (trade) => {
    const invested = getInvested(trade);
    return invested === "-" ? 0 : Number(invested);
  };

  const sortedTrades = [...trades].sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'ticker':
        valA = a.ticker?.toUpperCase() || '';
        valB = b.ticker?.toUpperCase() || '';
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      case 'entryDate':
        valA = a.entryDate ? new Date(a.entryDate).getTime() : 0;
        valB = b.entryDate ? new Date(b.entryDate).getTime() : 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      case 'entryPrice':
        valA = a.entryPrice !== undefined && a.entryPrice !== null ? Number(a.entryPrice) : 0;
        valB = b.entryPrice !== undefined && b.entryPrice !== null ? Number(b.entryPrice) : 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      case 'invested':
        valA = getInvestedForSort(a);
        valB = getInvestedForSort(b);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      case 'pl':
        valA = getPLForSort(a);
        valB = getPLForSort(b);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      default:
        return 0;
    }
  });

  // --- Sorting UI ---
  const sortOptions = [
    { value: 'ticker', label: 'Ticker (A-Z)' },
    { value: 'entryDate', label: 'Entry Date' },
    { value: 'entryPrice', label: 'Entry Price' },
    { value: 'invested', label: 'Invested Value' },
    { value: 'pl', label: 'Profit & Loss' },
  ];

  return (
    <div className={styles.container}>
      <PageHeader
        title="Trade List"
        subtitle="View and manage all your trades"
      />

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.filters}>
          <label>Sort By:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className={styles.filterSelect}
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
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
          onClick={() => navigate('/trades/new')}
        >
          + Add Trade
        </button>
      </div>
      {/* Sorting Controls */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Ticker</th>
              <th className={styles.tableHeaderCell}>Entry Date</th>
              <th className={styles.tableHeaderCell}>Last Exit Date</th>
              <th className={styles.tableHeaderCell}>Entry Price</th>
              <th className={styles.tableHeaderCell}>Original Qty</th>
              <th className={styles.tableHeaderCell}>Sold Qty</th>
              <th className={styles.tableHeaderCell}>Remaining Qty</th>
              <th className={styles.tableHeaderCell}>Avg Exit Price</th>
              <th className={styles.tableHeaderCell}>Invested</th>
              <th className={styles.tableHeaderCell}>P&L</th>
              <th className={styles.tableHeaderCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map(trade => {
              const originalQty = trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity) : 0;
              const remainingQty = trade.remainingQuantity !== undefined && trade.remainingQuantity !== null ? Number(trade.remainingQuantity) : originalQty;
              const soldQty = originalQty - remainingQty;
              // Debug logs for exit/PL/avg price
              // console.log('[TradeList] Ticker:', trade.ticker, { ... });
              return (
                <tr
                  key={trade.tradeId}
                  className={styles.tableRow}
                  onClick={() => handleShowDetails(trade.id)}
                >
                  <td className={`${styles.tableCell} ${styles.tickerCell}`}>
                    <div className={styles.tickerContainer}>
                      <span className={styles.tickerSymbol}>{trade.ticker}</span>
                      {getTickerBySymbol(trade.ticker)?.name && (
                        <span className={styles.companyName}>{getTickerBySymbol(trade.ticker).name}</span>
                      )}
                    </div>
                  </td>
                  <td className={`${styles.tableCell} ${styles.dateCell}`}>{trade.entryDate ? formatDate(trade.entryDate) : "-"}</td>
                  <td className={`${styles.tableCell} ${styles.dateCell}`}>{getExitTransactions(trade).length > 0 ? getLastExitDate(trade) : '-'}</td>
                  <td className={`${styles.tableCell} ${styles.priceCell}`}>{trade.entryPrice !== undefined && trade.entryPrice !== null ? Number(trade.entryPrice).toFixed(2) : "-"}</td>
                  <td className={`${styles.tableCell} ${styles.priceCell}`}>{originalQty.toLocaleString()}</td>
                  <td className={`${styles.tableCell} ${styles.priceCell}`}>{soldQty > 0 ? soldQty.toLocaleString() : 0}</td>
                  <td className={`${styles.tableCell} ${styles.priceCell}`}>{remainingQty.toLocaleString()}</td>
                  <td className={`${styles.tableCell} ${styles.priceCell}`}>{soldQty > 0 ? (getAverageExitPrice(trade) !== "-" ? getAverageExitPrice(trade) : (trade.exitPrice !== undefined && trade.exitPrice !== null ? Number(trade.exitPrice).toFixed(2) : "-")) : '-'}</td>
                  <td className={`${styles.tableCell} ${styles.priceCell}`}>{getInvested(trade) !== "-" ? `$${getInvested(trade)}` : "-"}</td>
                  <td className={`${styles.tableCell} ${styles.profitCell} ${soldQty > 0 && getPartialPL(trade) !== "-" ? (getPartialPL(trade) > 0 ? styles.profitPositive : styles.profitNegative) : ''}`}>
                    {soldQty > 0 && getPartialPL(trade) !== "-" ? `$${getPartialPL(trade)}` : "-"}
                  </td>
                  <td className={styles.tableCell}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleShowDetails(trade.id); }}
                        className={`${styles.actionButton} ${styles.viewButton}`}
                      >
                        View
                      </button>
                      {getExitTransactions(trade).length > 0 && remainingQty === 0
                        ? <button
                          onClick={e => { e.stopPropagation(); handleReview(trade.id); }}
                          className={`${styles.actionButton} ${styles.reviewButton}`}
                        >Review</button>
                        : <button
                          onClick={e => { e.stopPropagation(); handleEdit(trade.id); }}
                          className={`${styles.actionButton} ${styles.editButton}`}
                        >Update</button>
                      }
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteClick(trade); }}
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

      {trades.length === 0 && (
        <div className={styles.emptyState}>
          <h3>No trades found</h3>
          <p>Start by adding your first trade to track your portfolio.</p>
          <button
            className={styles.addButton}
            onClick={() => navigate('/trades/new')}
          >
            + Add First Trade
          </button>
        </div>
      )}

      {/* Trade Details Popup */}
      {showPopup && popupTrade && (
        <TradeDetailsPopup
          trade={popupTrade}
          onClose={handleClosePopup}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && tradeToDelete && (
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
            backgroundColor: '#1A2332',
            borderRadius: 12,
            padding: 32,
            maxWidth: 500,
            width: '90%',
            border: '1px solid #2A3441',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#fff',
              margin: '0 0 16px 0'
            }}>
              Delete Trade
            </h3>

            <p style={{
              fontSize: '16px',
              color: '#9CA3AF',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete the trade for <strong style={{ color: '#fff' }}>{tradeToDelete.ticker}</strong>?
              This action cannot be undone and will permanently remove all trade data including charts and analysis.
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
                  border: '1px solid #2A3441',
                  backgroundColor: 'transparent',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#2A3441';
                  e.target.style.color = '#fff';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#9CA3AF';
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
                  backgroundColor: '#EF4444',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#DC2626';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#EF4444';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Delete Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}