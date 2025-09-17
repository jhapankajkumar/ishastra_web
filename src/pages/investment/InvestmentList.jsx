import React, { useEffect, useState } from "react";
import { getAllInvestments, deleteInvestment, closeInvestment } from "../../api/investmentApi";
import { getAllRecommendations } from "../../api/recommendationApi";
import PageHeader from "../../components/PageHeader";
import ErrorPage from "../../components/ErrorPage";
import { useNotification } from "../../components/NotificationProvider";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import styles from "./InvestmentList.module.css";

export default function InvestmentList() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 700 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { theme } = useTheme();
  const [investments, setInvestments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showCombined, setShowCombined] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [groupBy, setGroupBy] = useState('none');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [closeForm, setCloseForm] = useState({ close_price: '', close_date: '' });
  const notification = useNotification();
  const navigate = useNavigate();

  // Sorting state
  const [sortBy, setSortBy] = useState('ticker');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  // Indices state
  const [indicesData, setIndicesData] = useState({
    nifty50: { value: null, change: null, changePercent: null },
    sensex: { value: null, change: null, changePercent: null }
  });

  const SORT_OPTIONS = [
    { label: 'Ticker', value: 'ticker' },
    { label: 'Current Value', value: 'currentValue' },
    { label: 'Profit & Loss', value: 'profitLoss' },
    { label: 'Profit & Loss %', value: 'profitLossPercent' },
    { label: 'Date', value: 'entryDate' },
  ];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [showCombined]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [investmentsRes] = await Promise.all([
        getAllInvestments(showCombined)
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
    const lastPrice = investment.lastDayPrice || currentPrice;
    const investedAmount = investment.quantity * investment.avgBuyPrice;
    const currentValue = investment.quantity * currentPrice;
    const lastDayValue = investment.quantity * lastPrice;
    const gainLoss = currentValue - investedAmount;
    const gainLossToday = currentValue - lastDayValue;
    const gainLossPercent = (gainLoss / investedAmount * 100).toFixed(2);
    const gainLossTodayPercent = ((currentPrice - lastPrice) / lastPrice * 100).toFixed(2);

    return {
      investedAmount,
      currentValue,
      gainLoss,
      gainLossPercent,
      currentPrice,
      gainLossToday,
      gainLossTodayPercent
    };
  };

  const getLinkedRecommendation = (investment) => {
    return recommendations.find(rec => rec.ticker === investment.ticker);
  };

  const groupInvestments = (investmentList = investments) => {
    if (groupBy === 'ticker') {
      const grouped = investmentList.reduce((acc, inv) => {
        if (!acc[inv.ticker]) acc[inv.ticker] = [];
        acc[inv.ticker].push(inv);
        return acc;
      }, {});
      return grouped;
    }
    return { all: investmentList };
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
        {/* <PageHeader
          title="Long-Term Investments"
          subtitle="Track your investment portfolio"
        /> */}
        <div className={styles.loading}>Loading investments...</div>
      </div>
    );
  }

  // Sorting logic
  const sortedInvestments = [...investments].sort((a, b) => {
    let aValue, bValue;
    switch (sortBy) {
      case 'ticker':
        aValue = a.ticker || '';
        bValue = b.ticker || '';
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      case 'currentValue':
        aValue = (a.currentPrice || 0) * (a.quantity || 0);
        bValue = (b.currentPrice || 0) * (b.quantity || 0);
        break;
      case 'profitLoss':
        aValue = ((a.currentPrice - a.avgBuyPrice) * a.quantity) || 0;
        bValue = ((b.currentPrice - b.avgBuyPrice) * b.quantity) || 0;
        break;
      case 'investedAmount':
        aValue = a.avgBuyPrice * a.quantity || 0;
        bValue = b.avgBuyPrice * b.quantity || 0;
        break;
      case 'entryDate':
        aValue = new Date(a.entryDate).getTime() || 0;
        bValue = new Date(b.entryDate).getTime() || 0;
        break;
      case 'quantity':
        aValue = a.quantity || 0;
        bValue = b.quantity || 0;
        break;
      case 'currentPrice':
        aValue = a.currentPrice || 0;
        bValue = b.currentPrice || 0;
        break;
      case 'avgBuyPrice':
        aValue = a.avgBuyPrice || 0;
        bValue = b.avgBuyPrice || 0;
        break;
      case 'recommendation':
        aValue = a.differencePercentage || 0;
        bValue = b.differencePercentage || 0;
        break;
      case 'gainLossToday':
        aValue = (a.currentPrice - (a.lastDayPrice || a.avgBuyPrice)) * (a.quantity || 0);
        bValue = (b.currentPrice - (b.lastDayPrice || b.avgBuyPrice)) * (b.quantity || 0);
        break;
      default:
        aValue = 0;
        bValue = 0;
    }
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Local search filter
  const filteredInvestments = sortedInvestments.filter(inv => {
    const text = searchText.trim().toLowerCase();
    if (!text) return true;
    return (
      (inv.ticker && inv.ticker.toLowerCase().includes(text)) ||
      (inv.notes && inv.notes.toLowerCase().includes(text))
    );
  });

  // Use filtered investments for grouping
  const groupedInvestments = groupBy === 'none'
    ? { all: filteredInvestments }
    : groupInvestments(filteredInvestments);

  // Calculate combined totals for currently displayed investments
  let summaryTotals = null;
  const allVisibleInvestments = Object.values(groupedInvestments).flat();
  if (allVisibleInvestments.length > 0) {
    let invested = 0, current = 0;
    allVisibleInvestments.forEach(inv => {
      invested += (inv.quantity || 0) * (inv.avgBuyPrice || 0);
      current += (inv.quantity || 0) * ((inv.currentPrice !== undefined && inv.currentPrice !== null) ? inv.currentPrice : inv.avgBuyPrice || 0);
    });
    const profit = current - invested;
    const profitPercent = invested ? ((profit / invested) * 100).toFixed(2) : '0.00';
    summaryTotals = {
      invested,
      current,
      profit,
      profitPercent
    };
  }

  return (
    <div className={`${styles.container} ${theme}`}>
      {/* <PageHeader
        title="Long-Term Investments"
        subtitle="Track and monitor your investment portfolio"
      /> */}
      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by Ticker or Notes..."
              className={styles.filterSelect}
              style={{ minWidth: 220 }}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="showCombinedToggle" style={{ marginRight: 8 }}>Show Combined:</label>
            <input
              id="showCombinedToggle"
              type="checkbox"
              checked={showCombined}
              onChange={e => setShowCombined(e.target.checked)}
              className={styles.checkbox}
            />
          </div>
          {/* Removed sort selection dropdown and button. Sorting is now only via table headers. */}
        </div>
        <button
          className={styles.addButton}
          onClick={() => navigate('/investments/new')}
        >
          + Add Investment
        </button>
      </div>

      {/* Show summary row always, calculated from currently displayed investments */}
      {summaryTotals && (
        <div className={styles.summaryCard}>
          <span className={styles.summaryItem}>
            <span className={styles.summaryIcon}>💰</span>
            <span className={styles.summaryLabel}>Total Invested:</span>
            <strong className={styles.summaryValue}>₹{summaryTotals.invested.toLocaleString('en-IN', {maximumFractionDigits:2})}</strong>
          </span>
          <span className={styles.summaryItem}>
            <span className={styles.summaryIcon}>📈</span>
            <span className={`${styles.summaryLabel} ${styles.summarySuccess}`}>Current Value:</span>
            <strong className={styles.summaryValue}>₹{summaryTotals.current.toLocaleString('en-IN', {maximumFractionDigits:2})}</strong>
          </span>
          <span className={styles.summaryItem}>
            <span className={styles.summaryIcon}>{summaryTotals.profit >= 0 ? '🟢' : '🔴'}</span>
            <span className={`${styles.summaryLabel} ${summaryTotals.profit >= 0 ? styles.summarySuccess : styles.summaryError}`}>Profit/Loss:</span>
            <strong className={`${styles.summaryValue} ${summaryTotals.profit >= 0 ? styles.summarySuccess : styles.summaryError}`}>
              {summaryTotals.profit >= 0 ? '+' : ''}₹{summaryTotals.profit.toLocaleString('en-IN', {maximumFractionDigits:2})}
              <span className={styles.summaryPercent}>({summaryTotals.profitPercent}%)</span>
            </strong>
          </span>
        </div>
      )}

      {/* Mobile card list */}
      {isMobile && (
        <div className={styles.mobileList}>
          {[...filteredInvestments]
            .sort((a,b)=> (a.ticker||'').localeCompare(b.ticker||''))
            .map(inv => {
              const m = calculateMetrics(inv);
              const ltpPct = inv.lastDayPrice ? (( (inv.currentPrice||inv.avgBuyPrice) - inv.lastDayPrice) / inv.lastDayPrice)*100 : null;
              return (
                <div key={inv.id} className={styles.mobileCard} onClick={() => navigate(`/investments/update/${inv.id}`)}>
                  <div className={styles.mobileTopRow}>
                    <div className={styles.mobileTicker}>{inv.ticker}</div>
                    <button className={styles.editIconBtn} onClick={(e)=>{e.stopPropagation(); navigate(`/investments/update/${inv.id}`);}}>✏️ Edit</button>
                  </div>
                  <div className={styles.mobileMeta}>Qty. {inv.quantity?.toLocaleString()} <span style={{opacity:.6, margin:'0 6px'}}>•</span> Avg. {inv.avgBuyPrice?.toLocaleString()}</div>
                  <div className={styles.mobileRow}>
                    <div className={styles.left}>
                      <div>Invested ₹{m.investedAmount.toLocaleString('en-IN')}</div>
                      <div>LTP ₹{(inv.currentPrice||inv.avgBuyPrice)?.toLocaleString('en-IN')} {ltpPct==null?'':(
                        <span className={ltpPct>=0? styles.plPositive: styles.plNegative}>({ltpPct>=0?'+':''}{ltpPct.toFixed(2)}%)</span>
                      )}</div>
                    </div>
                    <div className={styles.right}>
                      <div className={`${styles.plValue} ${m.gainLoss>=0? styles.plPositive: styles.plNegative}`}>₹{Math.abs(m.gainLoss).toLocaleString('en-IN')}</div>
                      <div className={m.gainLoss>=0? styles.plPositive: styles.plNegative}>{m.gainLossPercent>=0?'+':''}{m.gainLossPercent}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Desktop Investments Display */}
      {!isMobile && Object.entries(groupedInvestments).map(([groupKey, groupInvestments]) => (
        <div key={groupKey} className={styles.investmentGroup}>
          {/* {groupBy === 'ticker' && (
            <h3 className={styles.groupHeader}>
              {groupKey} ({groupInvestments.length} position{groupInvestments.length !== 1 ? 's' : ''})
            </h3>
          )} */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  {/* Ticker */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('ticker')}>
                    Ticker
                    <span className={styles.sortArrow}>
                      {sortBy==='ticker' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Recommendation (not sortable) */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('recommendation')}>Rec
                    <span className={styles.sortArrow}>
                      {sortBy==='recommendation' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Qty */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('quantity')}>
                    Qty
                    <span className={styles.sortArrow}>
                      {sortBy==='quantity' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Buy Avg */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('avgBuyPrice')}>
                    Buy Avg
                    <span className={styles.sortArrow}>
                      {sortBy==='avgBuyPrice' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Current Price */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('currentPrice')}>
                    LTP
                    <span className={styles.sortArrow}>
                      {sortBy==='currentPrice' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Invested */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('investedAmount')}>
                    Invested
                    <span className={styles.sortArrow}>
                      {sortBy==='investedAmount' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Current Value */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('currentValue')}>
                    Current
                    <span className={styles.sortArrow}>
                      {sortBy==='currentValue' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* P&L */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('profitLoss')}>
                    P&L
                    <span className={styles.sortArrow}>
                      {sortBy==='profitLoss' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>

                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('gainLossToday')}>
                    Today's P&L
                    <span className={styles.sortArrow}>
                      {sortBy==='gainLossToday' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Date */}
                  <th className={styles.tableHeaderCell} style={{cursor:'pointer'}} onClick={() => handleSort('entryDate')}>
                    Date
                    <span className={styles.sortArrow}>
                      {sortBy==='entryDate' ? (
                        sortOrder==='asc' ? <span className={styles.sortArrowActive}>▲</span> : <span className={styles.sortArrowActive}>▼</span>
                      ) : <span className={styles.sortArrowInactive}>▲</span>}
                    </span>
                  </th>
                  {/* Actions (not sortable) */}
                  <th className={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupInvestments.map(investment => {
                  const metrics = calculateMetrics(investment);
                  return (
                    <tr key={investment.id} className={styles.tableRow}>
                      <td className={`${styles.tableCell} ${styles.tickerCell}`}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={styles.ticker}>{investment.ticker}</span>
                            {investment.buyBelow > 0 && (
                              <span className={styles.linkedBadge} title={`From recommendation: Buy below ₹${investment.buyBelow}`}>Rec</span>
                            )}
                          </div>
                          <div></div>
                          <div className={styles.tickerMeta}>
                            {investment.sector || '—'} | {investment.marketCap || '—'}
                          </div>
                          <div className={styles.tickerMeta}>
                            {investment.notes || '—'}
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell} >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'left' }}>
                          <span>₹{investment.buyBelow ? investment.buyBelow.toFixed(2) : '-'}</span>
                          <span className={investment.differencePercentage >= 0 ? styles.profit : styles.loss}>
                            {investment.differencePercentage >= 0 ? '+' : ''}
                            {investment.differencePercentage}%
                          </span>
                        </div>
                      </td>
                      <td className={styles.tableCell} >{investment.quantity}</td>
                      <td className={styles.tableCell} >₹{investment.avgBuyPrice?.toFixed(2)}</td>
                      <td className={styles.tableCell} >
                        {investment.currentPrice ? (
                          <span className={styles.currentPrice}>
                            ₹{metrics.currentPrice.toFixed(2)}
                          </span>
                        ) : (
                          <span className={styles.noPrice}>-</span>
                        )}
                      </td>

                      <td className={styles.tableCell} >₹{metrics.investedAmount.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
                      <td className={styles.tableCell} >₹{metrics.currentValue.toLocaleString('en-IN', {maximumFractionDigits:2})}</td>
                      <td className={styles.tableCell} >
                        <div className={styles.pnlCell}>
                          <span className={metrics.gainLoss >= 0 ? styles.profit : styles.loss}>
                            {metrics.gainLoss >= 0 ? '+' : ''}₹{metrics.gainLoss.toLocaleString('en-IN', {maximumFractionDigits:2})}
                          </span>
                          <span className={`${styles.pnlPercent} ${metrics.gainLoss >= 0 ? styles.profit : styles.loss}`}>
                            ({metrics.gainLossPercent}%)
                          </span>
                        </div>
                      </td>

                      <td className={styles.tableCell} >
                        <div className={styles.pnlCell}>
                          <span className={metrics.gainLossToday >= 0 ? styles.profit : styles.loss}>
                            {metrics.gainLossToday >= 0 ? '+' : ''}₹{metrics.gainLossToday.toLocaleString('en-IN', {maximumFractionDigits:2})}
                          </span>
                          <span className={`${styles.pnlPercent} ${metrics.gainLossToday >= 0 ? styles.profit : styles.loss}`}>
                            ({metrics.gainLossTodayPercent}%)
                          </span>
                        </div>
                      </td>
                      <td className={styles.tableCell}>{formatDate(investment.entryDate)}</td>

                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => navigate(`/investments/update/${investment.id}`)}
                            className={`${styles.actionButton} ${styles.editButton}`}
                          >
                            Update
                          </button>
                          {/* {investment.status === 'open' && (
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
                          )} */}
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
