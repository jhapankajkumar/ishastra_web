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
import { getExitTransactions, getLastExitDate, getAverageExitPrice, getPartialPL } from '../../common/Helper';

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
        {/* <PageHeader
          title="Trade List"
          subtitle="View and manage all your trades"
        /> */}
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

  // Check if trade is open using API status field
  const isTradeOpen = (trade) => {
    // Use API status field if available, otherwise fallback to quantity calculation
    if (trade.status) {
      return trade.status.toLowerCase() === 'open';
    }
    // Fallback to quantity calculation
    const originalQty = trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity) : 0;
    const remainingQty = trade.remainingQuantity !== undefined && trade.remainingQuantity !== null ? Number(trade.remainingQuantity) : originalQty;
    return remainingQty > 0;
  };

  // Sort trades with open trades first, then closed trades
  const openTrades = sortedTrades.filter(trade => isTradeOpen(trade));
  const closedTrades = sortedTrades.filter(trade => !isTradeOpen(trade));
  const combinedTrades = [...openTrades, ...closedTrades];

  // Get current price from API, fallback to entry price
  const getCurrentPrice = (trade) => {
    // Use API currentPrice field if available, otherwise fallback to entryPrice
    if (trade.currentPrice !== undefined && trade.currentPrice !== null) {
      return Number(trade.currentPrice).toFixed(2);
    }
    if (trade.entryPrice !== undefined && trade.entryPrice !== null) {
      return Number(trade.entryPrice).toFixed(2);
    }
    return null;
  };

  // Calculate unrealized P&L for open trades using API current price
  const getUnrealizedPL = (trade) => {
    if (!isTradeOpen(trade)) return null;
    
    const currentPrice = getCurrentPrice(trade);
    if (!currentPrice || !trade.entryPrice || !trade.remainingQuantity) return null;
    
    const originalQty = Number(trade.quantity || 0);
    const remainingQty = Number(trade.remainingQuantity || originalQty);
    const entryPrice = Number(trade.entryPrice);
    const currentPriceNum = Number(currentPrice);
    
    const unrealizedPL = (currentPriceNum - entryPrice) * remainingQty;
    return trade.direction === 'SHORT' ? -unrealizedPL : unrealizedPL;
  };

  // Get trade status from API or determine based on P&L
  const getTradeStatus = (trade) => {
    // Use API status if available
    if (trade.status) {
      return trade.status.toUpperCase();
    }
    
    // Fallback to calculated status
    if (isTradeOpen(trade)) {
      const unrealizedPL = getUnrealizedPL(trade);
      if (unrealizedPL === null) return 'OPEN';
      return unrealizedPL > 0 ? 'OPEN_PROFIT' : unrealizedPL < 0 ? 'OPEN_LOSS' : 'OPEN';
    }
    
    const realizedPL = getPartialPL(trade);
    if (realizedPL === "-") return 'CLOSED';
    return Number(realizedPL) > 0 ? 'CLOSED_PROFIT' : Number(realizedPL) < 0 ? 'CLOSED_LOSS' : 'CLOSED';
  };

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
      {/* <PageHeader
        title="Trade List"
        subtitle="View and manage all your trades"
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
      
      {/* Combined Trades Section */}
      {combinedTrades.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            � All Trades ({combinedTrades.length}) - Open: {openTrades.length}, Closed: {closedTrades.length}
          </h2>
          <div className={styles.tableContainer}>
            <table className={styles.tradesTable}>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Entry Date</th>
                  <th>BUY AVG</th>
                  <th>LTP</th>
                  <th>QTY</th>
                  <th>Invested</th>
                  <th>Current</th>
                  <th>P&L</th>
                  <th>Exit Strategy</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {combinedTrades.map(trade => {
                  const isOpen = isTradeOpen(trade);
                  const originalQty = trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity) : 0;
                  const remainingQty = isOpen ? (trade.remainingQuantity !== undefined && trade.remainingQuantity !== null ? Number(trade.remainingQuantity) : originalQty) : originalQty;
                  const currentPrice = getCurrentPrice(trade);
                  const entryPrice = Number(trade.entryPrice || 0);
                  const isExitRecommended = trade.impulseAnalysis?.exitRecommended || false;
                  
                  // For open trades: use remaining quantity calculations
                  // For closed trades: use original quantity and realized P&L
                  const displayQuantity = remainingQty;
                  const invested = isOpen ? (entryPrice * remainingQty).toFixed(2) : getInvested(trade);
                  const marketValue = isOpen ? (currentPrice ? Number(currentPrice) * remainingQty : 0).toFixed(2) : "0.00";
                  
                  // Always calculate unrealized P&L
                  let unrealizedPL;
                  if (isOpen) {
                    unrealizedPL = getUnrealizedPL(trade);
                  } else {
                    // For closed trades, show realized P&L as "unrealized" (actual profit/loss)
                    const realizedPL = getPartialPL(trade);
                    unrealizedPL = realizedPL !== "-" ? Number(realizedPL) : 0;
                  }
                  
                  const status = getTradeStatus(trade);
                  const direction = trade.direction || "N/A";
                  
                  return (
                    <tr 
                      key={trade.tradeId}
                      className={`${styles.tradeRow} ${styles[status.toLowerCase()]}`}
                      onClick={() => handleShowDetails(trade.id)}
                    >
                      <td className={styles.tickerCell}>
                        <div className={styles.tickerInfo}>
                          <span className={styles.ticker}>{trade.ticker}</span>
                          <span className={styles.companyName}>
                            {(trade.tickerName || trade.companyName || "").substring(0, 15)}
                            {(trade.tickerName || trade.companyName || "").length > 15 ? "..." : ""}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <span className={`${styles.direction} ${styles[direction.toLowerCase()]}`}>
                              {direction}
                            </span>
                            <span className={`${styles.statusBadge} ${styles[status.toLowerCase()]}`}>
                              {isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{trade.entryDate ? formatDate(trade.entryDate) : "N/A"}</td>
                      <td>${entryPrice.toFixed(2)}</td>
                      <td>
                        <div className={styles.priceWithChange}>
                          <span>${currentPrice || 'N/A'}</span>
                          {currentPrice && trade.entryPrice && isOpen && (
                            <span className={`${styles.priceChange} ${Number(currentPrice) > Number(trade.entryPrice) ? styles.positive : styles.negative}`}>
                              {((Number(currentPrice) - Number(trade.entryPrice)) / Number(trade.entryPrice) * 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{displayQuantity.toLocaleString()}</td>
                      <td>${invested}</td>
                      <td>${isOpen ? marketValue : "0.00"}</td>
                      <td className={unrealizedPL && unrealizedPL > 0 ? styles.profit : unrealizedPL && unrealizedPL < 0 ? styles.loss : ''}>
                        {unrealizedPL !== null && unrealizedPL !== undefined ? `$${unrealizedPL.toFixed(2)}` : 'N/A'}
                      </td>
                      <td className={styles.strategyCell}>
                        {isOpen ? (
                          isExitRecommended ? 'YES' : 'NO'
                        ) : (
                          'DONE'
                        )}
                      </td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={e => { e.stopPropagation(); handleShowDetails(trade.id); }}
                            className={`${styles.actionBtn} ${styles.viewBtn}`}
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); isOpen ? handleEdit(trade.id) : handleReview(trade.id); }}
                            className={`${styles.actionBtn} ${isOpen ? styles.editBtn : styles.reviewBtn}`}
                            title={isOpen ? "Edit Trade" : "Add Review"}
                          >
                            {isOpen ? '✏️' : '📝'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteClick(trade); }}
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            title="Delete Trade"
                          >
                            🗑️
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
      )}

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
                  backgroundColor: 'transparent',
                  color: '#9CA3AF',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => {
                  e.target.style.backgroundColor = '#374151';
                  e.target.style.color = '#fff';
                }}
                onMouseOut={e => {
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
                  fontWeight: '500',
                  backgroundColor: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={e => {
                  e.target.style.backgroundColor = '#B91C1C';
                }}
                onMouseOut={e => {
                  e.target.style.backgroundColor = '#DC2626';
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