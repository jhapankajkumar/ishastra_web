import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTrades, getTradeById, deleteTrade, getTradeTransactions } from "../../api/tradeApi";
import { getCapitalInfo } from "../../api/capitalApi";
import TradeAdd from "./TradeAdd";
import TradeDetailsPopup from "./TradeDetailsPopup";
import PageHeader from "../../components/PageHeader";
import ErrorPage from "../../components/ErrorPage";
import { useNotification } from "../../components/NotificationProvider";
import { getTickerBySymbol } from '../../data/tickerData';
import styles from "./TradeList.module.css";
import { getExitTransactions, getLastExitDate, getAverageExitPrice, getPartialPL } from '../../common/Helper';

export default function TradeList() {
  // Tab state for NASDAQ/NSE separation
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('tradeListActiveTab') || 'NASDAQ';
  });

  const setActiveTabWithPersist = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('tradeListActiveTab', tab);
  };

  // Sorting functions
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const renderSortableHeader = (title, sortKey) => {
    const isActive = sortBy === sortKey;
    
    return (
      <th 
        className={styles.tableHeaderCell}
        style={{cursor: 'pointer'}}
        onClick={() => handleSort(sortKey)}
        title={`Sort by ${title}`}
      >
        {title}
        <span className={styles.sortArrow}>
          {isActive ? (
            sortOrder === 'asc' ? 
              <span className={styles.sortArrowActive}>▲</span> : 
              <span className={styles.sortArrowActive}>▼</span>
          ) : (
            <span className={styles.sortArrowInactive}>▲</span>
          )}
        </span>
      </th>
    );
  };

  const sortTrades = (trades) => {
    if (!sortBy) return trades;

    return [...trades].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'ticker':
          aValue = a.ticker || '';
          bValue = b.ticker || '';
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);

        case 'entryDate':
          aValue = new Date(a.entryDate || 0);
          bValue = new Date(b.entryDate || 0);
          break;

        case 'entryPrice':
          aValue = parseFloat(a.entryPrice || 0);
          bValue = parseFloat(b.entryPrice || 0);
          break;

        case 'currentPrice':
          aValue = parseFloat(a.currentPrice || a.entryPrice || 0);
          bValue = parseFloat(b.currentPrice || b.entryPrice || 0);
          break;

        case 'quantity':
          aValue = parseFloat(a.quantity || 0);
          bValue = parseFloat(b.quantity || 0);
          break;

        case 'invested':
          aValue = parseFloat(a.entryPrice || 0) * parseFloat(a.quantity || 0);
          bValue = parseFloat(b.entryPrice || 0) * parseFloat(b.quantity || 0);
          break;

        case 'pl':
          aValue = parseFloat(getPartialPL(a) || 0);
          bValue = parseFloat(getPartialPL(b) || 0);
          break;

        case 'todaysPL':
          const todaysA = getTodaysPL(a);
          const todaysB = getTodaysPL(b);
          aValue = todaysA.value || 0;
          bValue = todaysB.value || 0;
          break;

        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [capitalData, setCapitalData] = useState([]);
  const [sortBy, setSortBy] = useState('entryDate');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [mode, setMode] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTrade, setPopupTrade] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCapital, setLoadingCapital] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const notification = useNotification();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadingCapital(true);
      
      try {
        // Fetch trades and capital data in parallel
        const [tradesResponse, capitalResponse] = await Promise.all([
          getAllTrades(),
          getCapitalInfo()
        ]);

        // Process trades with exit transactions
        const tradesWithExits = await Promise.all(tradesResponse.data.map(async trade => {
          try {
            const txRes = await getTradeTransactions(trade.id);
            const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
            return { ...trade, exitTransactions: exitTx };
          } catch (e) {
            return { ...trade, exitTransactions: [] };
          }
        }));

        setTrades(tradesWithExits);
        setCapitalData(capitalResponse.data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err);
      } finally {
        setLoading(false);
        setLoadingCapital(false);
      }
    };

    fetchData();
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
    setLoadingCapital(true);
    
    const fetchData = async () => {
      try {
        const [tradesResponse, capitalResponse] = await Promise.all([
          getAllTrades(),
          getCapitalInfo()
        ]);

        const tradesWithExits = await Promise.all(tradesResponse.data.map(async trade => {
          try {
            const txRes = await getTradeTransactions(trade.id);
            const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
            return { ...trade, exitTransactions: exitTx };
          } catch (e) {
            return { ...trade, exitTransactions: [] };
          }
        }));
        
        setTrades(tradesWithExits);
        setCapitalData(capitalResponse.data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err);
      } finally {
        setLoading(false);
        setLoadingCapital(false);
      }
    };

    fetchData();
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

  // Currency and Market Detection
  const getCurrency = (trade) => {
    return trade.currency || 'USD'; // Default to USD if no currency specified
  };

  const getMarketType = (trade) => {
    const currency = getCurrency(trade);
    return currency === 'INR' ? 'India' : 'US';
  };

  const getCurrencySymbol = (trade) => {
    const currency = getCurrency(trade);
    return currency === 'INR' ? '₹' : '$';
  };

  const formatCurrency = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : '$';
  // Format with commas for thousands
  const formatted = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
  };

  const getInvested = (trade) => {
    if (trade.entryPrice && trade.quantity) {
      return (Number(trade.entryPrice) * Number(trade.quantity)).toFixed(2);
    }
    return "-";
  };

  // Enhanced trade status detection
  const getTradeStatusDetailed = (trade) => {

    if (trade.status.toLowerCase() === 'open') {
      return 'OPEN';
    } else if (trade.status.toLowerCase() === 'partial closed') {
      return 'PARTIAL';
    } else {
      return 'CLOSED';
    }
  };

  // Get last exit date for partial/closed trades
  const getLastExitDate = (trade) => {
    if (!trade.exitTransactions || trade.exitTransactions.length === 0) {
      return null;
    }
    
    const sortedExits = trade.exitTransactions.sort((a, b) => 
      new Date(b.transactionDate) - new Date(a.transactionDate)
    );
    
    return sortedExits[0]?.transactionDate;
  };

  // Calculate average sell price for closed trades
  const getAverageSellPrice = (trade) => {
    if (!trade.exitTransactions || trade.exitTransactions.length === 0) {
      return null;
    }
    
    let totalValue = 0;
    let totalQuantity = 0;
    
    trade.exitTransactions.forEach(tx => {
      const qty = Number(tx.quantity || 0);
      const price = Number(tx.price || 0);
      totalValue += qty * price;
      totalQuantity += qty;
    });
    
    return totalQuantity > 0 ? (totalValue / totalQuantity).toFixed(2) : null;
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

  // Market calculations
  const calculateMarketMetrics = (currency) => {
    const marketTrades = trades.filter(trade => getCurrency(trade) === currency);
    const capitalInfo = capitalData.find(cap => cap.currency === currency);
    
    // Separate trades by status
    const openTrades = marketTrades.filter(trade => getTradeStatusDetailed(trade) === 'OPEN');
    const partialTrades = marketTrades.filter(trade => getTradeStatusDetailed(trade) === 'PARTIAL');
    const closedTrades = marketTrades.filter(trade => getTradeStatusDetailed(trade) === 'CLOSED');
    
    // Calculate total invested (open + partial trades)
    const totalInvested = [...openTrades, ...partialTrades].reduce((sum, trade) => {
      const status = getTradeStatusDetailed(trade);
      const entryPrice = Number(trade.entryPrice || 0);
      
      if (status === 'OPEN') {
        const qty = Number(trade.quantity || 0);
        return sum + (entryPrice * qty);
      } else if (status === 'PARTIAL') {
        const remainingQty = Number(trade.remainingQuantity || 0);
        return sum + (entryPrice * remainingQty);
      }
      return sum;
    }, 0);
    
    // Calculate total P&L (open + partial + closed)
    const totalPL = marketTrades.reduce((sum, trade) => {
      const pl = getPartialPL(trade);
      return sum + (pl === "-" ? 0 : Number(pl));
    }, 0);
    
    // Calculate today's P&L (placeholder - would need today's price data)
    const todaysPL = 0; // TODO: Implement based on today's price changes
    
    const totalCapital = capitalInfo?.total || 0;
    const investedPercentage = totalCapital > 0 ? (totalInvested / totalCapital * 100).toFixed(2) : 0;
    const plPercentage = totalCapital > 0 ? (totalPL / totalCapital * 100).toFixed(2) : 0;
    const todaysPlPercentage = totalCapital > 0 ? (todaysPL / totalCapital * 100).toFixed(2) : 0;
    
    return {
      totalCapital,
      totalInvested,
      investedPercentage,
      totalPL,
      plPercentage,
      todaysPL,
      todaysPlPercentage,
      openTrades: openTrades.length,
      partialTrades: partialTrades.length,
      closedTrades: closedTrades.length
    };
  };

  // Render compact market summary row (like InvestmentList)
  const renderMarketSummaryRow = (currency, marketName) => {
    const metrics = calculateMarketMetrics(currency);
    const symbol = currency === 'INR' ? '₹' : '$';
    return (
      <div key={currency} className={styles.summaryCard}>
        <span className={styles.summaryItem}>
          <span className={styles.summaryIcon}>{marketName === 'US' ? '🇺🇸' : '🇮🇳'}</span>
          <span className={styles.summaryLabel}>{marketName} Market</span>
          <span className={styles.currencyBadge}>{currency}</span>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Capital:</span>
          <strong className={styles.summaryValue}>{formatCurrency(metrics.totalCapital, currency)}</strong>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Invested:</span>
          <strong className={styles.summaryValue}>{formatCurrency(metrics.totalInvested, currency)}</strong>
          <span className={styles.summaryPercent}>({metrics.investedPercentage}%)</span>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Profit/Loss:</span>
          <strong className={`${styles.summaryValue} ${metrics.totalPL >= 0 ? styles.summarySuccess : styles.summaryError}`}>
            {metrics.totalPL >= 0 ? '+' : ''}{formatCurrency(metrics.totalPL, currency)}
            <span className={styles.summaryPercent}>({metrics.plPercentage >= 0 ? '+' : ''}{metrics.plPercentage}%)</span>
          </strong>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Today's P&L:</span>
          <strong className={`${styles.summaryValue} ${metrics.todaysPL >= 0 ? styles.summarySuccess : styles.summaryError}`}>
            {metrics.todaysPL >= 0 ? '+' : ''}{formatCurrency(metrics.todaysPL, currency)}
            <span className={styles.summaryPercent}>({metrics.todaysPlPercentage >= 0 ? '+' : ''}{metrics.todaysPlPercentage}%)</span>
          </strong>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Open:</span>
          <strong className={styles.summaryValue}>{metrics.openTrades}</strong>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Partial:</span>
          <strong className={styles.summaryValue}>{metrics.partialTrades}</strong>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Closed:</span>
          <strong className={styles.summaryValue}>{metrics.closedTrades}</strong>
        </span>
      </div>
    );
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

  // Group trades by market and status
  const groupTradesByMarketAndStatus = () => {
    const markets = {
      'USD': { name: 'US', trades: { OPEN: [], PARTIAL: [], CLOSED: [] } },
      'INR': { name: 'India', trades: { OPEN: [], PARTIAL: [], CLOSED: [] } }
    };

    sortedTrades.forEach(trade => {
      const currency = getCurrency(trade);
      const status = getTradeStatusDetailed(trade);
      
      if (markets[currency]) {
        markets[currency].trades[status].push(trade);
      }
    });

    return markets;
  };

  const marketGroups = groupTradesByMarketAndStatus();

  // Calculate Today's P&L for a trade
  const getTodaysPL = (trade) => {
    const currentPrice = trade.currentPrice !== undefined ? Number(trade.currentPrice) : Number(trade.entryPrice || 0);
    const lastDayPrice = trade.lastDayPrice !== undefined ? Number(trade.lastDayPrice) : Number(trade.entryPrice || 0);
    const qty = Number(trade.quantity || 0);
    if (!qty || !currentPrice || !lastDayPrice) return { value: 0, percent: 0 };
    const value = (currentPrice - lastDayPrice) * qty;
    const percent = lastDayPrice ? ((currentPrice - lastDayPrice) / lastDayPrice * 100) : 0;
    return { value, percent };
  };

  // Render trade table based on status
  const renderTradeTable = (trades, status, currency) => {
    if (trades.length === 0) return null;
    const symbol = currency === 'INR' ? '₹' : '$';
    const sortedTrades = sortTrades(trades);
    return (
      <div className={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className={styles.sectionTitle}>
            {status === 'OPEN' ? 'Open Trades' : 
             status === 'PARTIAL' ? 'Partially Closed Trades' : 
             'Closed Trades'} ({trades.length}) {currency}
          </h3>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.tradesTable}>
            <thead>
              <tr>
                {renderSortableHeader('Ticker', 'ticker')}
                {status === 'PARTIAL' ? (
                  renderSortableHeader('Entry Date & Last Exit Date', 'entryDate')
                ) : status === 'CLOSED' ? (
                  <>
                    {renderSortableHeader('Entry Date', 'entryDate')}
                    <th className={styles.tableHeaderCell}>Exit Date</th>
                  </>
                ) : (
                  renderSortableHeader('Entry Date', 'entryDate')
                )}
                {renderSortableHeader('BUY AVG', 'entryPrice')}
                {status === 'CLOSED' ? (
                  <th className={styles.tableHeaderCell}>SELL AVG</th>
                ) : (
                  renderSortableHeader('LTP', 'currentPrice')
                )}
                {status === 'PARTIAL' ? (
                  <th className={styles.tableHeaderCell}>Remaining/QTY</th>
                ) : (
                  renderSortableHeader('QTY', 'quantity')
                )}
                {renderSortableHeader('Invested', 'invested')}
                <th className={styles.tableHeaderCell}>Current</th>
                {renderSortableHeader('P&L', 'pl')}
                {renderSortableHeader("Today's P&L", 'todaysPL')}
                <th className={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            
            <tbody>
              {sortedTrades.map(trade => {
                const originalQty = Number(trade.quantity || 0);
                const remainingQty = Number(trade.remainingQuantity || originalQty);
                const entryPrice = Number(trade.entryPrice || 0);
                const currentPrice = trade.currentPrice ? Number(trade.currentPrice) : entryPrice;
                const lastExitDate = getLastExitDate(trade);
                const avgSellPrice = getAverageSellPrice(trade);
                const displayQuantity = status === 'PARTIAL' ? 
                  `${remainingQty.toLocaleString()}/${originalQty.toLocaleString()}` : 
                  originalQty.toLocaleString();
                const invested = status === 'OPEN' ? 
                  (entryPrice * originalQty) : 
                  status === 'PARTIAL' ? 
                    (entryPrice * remainingQty) : 
                    (entryPrice * originalQty);
                const marketValue = status === 'CLOSED' ? 0 : 
                  status === 'PARTIAL' ? 
                    (currentPrice * remainingQty) : 
                    (currentPrice * originalQty);
                const pl = getPartialPL(trade);
                const plValue = pl === "-" ? 0 : Number(pl);
                const plPercentage = invested > 0 ? (plValue / invested * 100).toFixed(2) : 0;
                // Today's P&L
                const todaysPL = getTodaysPL(trade);
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
                          {(trade.tickerName || "")}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <span className={`${styles.direction} ${styles[(trade.direction || 'long').toLowerCase()]}`}>
                            {trade.direction || 'LONG'}
                          </span>
                          <span className={`${styles.statusBadge} ${styles[status.toLowerCase()]}`}>
                            {status}
                          </span>
                        </div>
                      </div>
                    </td>
                    {status === 'PARTIAL' ? (
                      <td>
                        <div>
                          <div>{formatDate(trade.entryDate)}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Last Exit: {formatDate(lastExitDate)}
                          </div>
                        </div>
                      </td>
                    ) : status === 'CLOSED' ? (
                      <>
                        <td>{formatDate(trade.entryDate)}</td>
                        <td>{formatDate(lastExitDate)}</td>
                      </>
                    ) : (
                      <td>{formatDate(trade.entryDate)}</td>
                    )}
                    <td>{formatCurrency(entryPrice, currency)}</td>
                    {status === 'CLOSED' ? (
                      <td>{avgSellPrice ? formatCurrency(avgSellPrice, currency) : 'N/A'}</td>
                    ) : (
                      <td>
                        <div className={styles.priceWithChange}>
                          <span>{formatCurrency(currentPrice, currency)}</span>
                          {status !== 'CLOSED' && currentPrice !== entryPrice && (
                            <span className={`${styles.priceChange} ${currentPrice > entryPrice ? styles.positive : styles.negative}`}>
                              {((currentPrice - entryPrice) / entryPrice * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    <td>{displayQuantity}</td>
                    <td>{formatCurrency(invested, currency)}</td>
                    <td>{formatCurrency(marketValue, currency)}</td>
                    <td className={plValue > 0 ? styles.profit : plValue < 0 ? styles.loss : ''}>
                      <div className={styles.priceWithChange}>
                        <span>{formatCurrency(plValue, currency)}</span>
                        <span className={`${styles.priceChange} ${plValue > 0 ? styles.positive : styles.negative}`}>
                          ({plPercentage >= 0 ? '+' : ''}{Number(plPercentage).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                        </span>
                      </div>
                    </td>
                    {/* Today's P&L */}
                    <td>
                      {status === 'CLOSED' ? '-' : (  
                      <div className={styles.priceWithChange}>
                        <span className={todaysPL.value >= 0 ? styles.profit : styles.loss}>
                          {todaysPL.value >= 0 ? '+' : ''}{formatCurrency(todaysPL.value, currency)}
                        </span>
                        <span className={`${styles.priceChange} ${todaysPL.percent >= 0 ? styles.positive : styles.negative}`}>
                          ({todaysPL.percent >= 0 ? '+' : ''}{todaysPL.percent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                        </span>
                      </div>
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
                          onClick={e => { 
                            e.stopPropagation(); 
                            status === 'CLOSED' ? handleReview(trade.id) : handleEdit(trade.id); 
                          }}
                          className={`${styles.actionBtn} ${status === 'CLOSED' ? styles.reviewBtn : styles.editBtn}`}
                          title={status === 'CLOSED' ? "Add Review" : "Edit Trade"}
                        >
                          {status === 'CLOSED' ? '📝' : '✏️'}
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
    );
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
      {/* Beautiful Market Overview Cards */}
      {!loadingCapital && capitalData.length > 0 && (
        <div className={styles.marketOverview}>
          {/* US Market Card */}
          <div className={styles.compactMarketCard}>
            <div className={styles.marketHeader}>
              <span className={styles.marketFlag}>🇺🇸</span>
              <span className={styles.marketName}>US Market</span>
              <span className={styles.currencyBadge}>USD</span>
            </div>
            <div className={styles.marketMetrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total Capital</span>
                <span className={styles.metricValue}>
                  {formatCurrency(calculateMarketMetrics('USD').totalCapital, 'USD')}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total Invested</span>
                <span className={styles.metricValue}>
                  {formatCurrency(calculateMarketMetrics('USD').totalInvested, 'USD')}
                  <small className={styles.metricPercent}>({calculateMarketMetrics('USD').investedPercentage}%)</small>
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Profit/Loss</span>
                <span className={`${styles.metricValue} ${calculateMarketMetrics('USD').totalPL >= 0 ? styles.positive : styles.negative}`}>
                  {calculateMarketMetrics('USD').totalPL >= 0 ? '+' : ''}{formatCurrency(calculateMarketMetrics('USD').totalPL, 'USD')}
                  <small className={styles.metricPercent}>({calculateMarketMetrics('USD').plPercentage >= 0 ? '+' : ''}{calculateMarketMetrics('USD').plPercentage}%)</small>
                </span>
              </div>
              {(calculateMarketMetrics('USD').openTrades > 0 || calculateMarketMetrics('USD').partialTrades > 0) && (
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Today's P&L</span>
                  <span className={`${styles.metricValue} ${calculateMarketMetrics('USD').todaysPL >= 0 ? styles.positive : styles.negative}`}>
                    {calculateMarketMetrics('USD').todaysPL >= 0 ? '+' : ''}{formatCurrency(calculateMarketMetrics('USD').todaysPL, 'USD')}
                    <small className={styles.metricPercent}>({calculateMarketMetrics('USD').todaysPlPercentage >= 0 ? '+' : ''}{calculateMarketMetrics('USD').todaysPlPercentage}%)</small>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* India Market Card */}
          <div className={styles.compactMarketCard}>
            <div className={styles.marketHeader}>
              <span className={styles.marketFlag}>🇮🇳</span>
              <span className={styles.marketName}>India Market</span>
              <span className={styles.currencyBadge}>INR</span>
            </div>
            <div className={styles.marketMetrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total Capital</span>
                <span className={styles.metricValue}>
                  {formatCurrency(calculateMarketMetrics('INR').totalCapital, 'INR')}
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total Invested</span>
                <span className={styles.metricValue}>
                  {formatCurrency(calculateMarketMetrics('INR').totalInvested, 'INR')}
                  <small className={styles.metricPercent}>({calculateMarketMetrics('INR').investedPercentage}%)</small>
                </span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Profit/Loss</span>
                <span className={`${styles.metricValue} ${calculateMarketMetrics('INR').totalPL >= 0 ? styles.positive : styles.negative}`}>
                  {calculateMarketMetrics('INR').totalPL >= 0 ? '+' : ''}{formatCurrency(calculateMarketMetrics('INR').totalPL, 'INR')}
                  <small className={styles.metricPercent}>({calculateMarketMetrics('INR').plPercentage >= 0 ? '+' : ''}{calculateMarketMetrics('INR').plPercentage}%)</small>
                </span>
              </div>
              {(calculateMarketMetrics('INR').openTrades > 0 || calculateMarketMetrics('INR').partialTrades > 0) && (
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Today's P&L</span>
                  <span className={`${styles.metricValue} ${calculateMarketMetrics('INR').todaysPL >= 0 ? styles.positive : styles.negative}`}>
                    {calculateMarketMetrics('INR').todaysPL >= 0 ? '+' : ''}{formatCurrency(calculateMarketMetrics('INR').todaysPL, 'INR')}
                    <small className={styles.metricPercent}>({calculateMarketMetrics('INR').todaysPlPercentage >= 0 ? '+' : ''}{calculateMarketMetrics('INR').todaysPlPercentage}%)</small>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Market Tabs */}
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'NASDAQ' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('NASDAQ')}
        >
          🇺🇸 US (NASDAQ/NYSE)
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'NSE' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('NSE')}
        >
          🇮🇳 India (NSE)
        </button>
      </div>

      {/* Market-Based Trade Sections */}
      {Object.entries(marketGroups).map(([currency, marketData]) => {
        // Filter by active tab
        if (activeTab === 'NASDAQ' && currency !== 'USD') return null;
        if (activeTab === 'NSE' && currency !== 'INR') return null;
        
        const totalTrades = Object.values(marketData.trades).flat().length;
        if (totalTrades === 0) return null;

        return (
          <div key={currency} className={styles.marketSection}>
            {/* <h2 className={styles.marketSectionTitle}>
              {marketData.name} Market ({currency}) - {totalTrades} Trades
            </h2> */}
            
            {/* Open Trades */}
            {renderTradeTable(marketData.trades.OPEN, 'OPEN', currency)}
            
            {/* Partial Trades */}
            {renderTradeTable(marketData.trades.PARTIAL, 'PARTIAL', currency)}
            
            {/* Closed Trades */}
            {renderTradeTable(marketData.trades.CLOSED, 'CLOSED', currency)}
          </div>
        );
      })}

      {/* Empty State */}
      {trades.length === 0 && !loading && (
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
        <div className={styles.deleteConfirmOverlay}>
          <div className={styles.deleteConfirmDialog}>
            <h3 className={styles.deleteConfirmTitle}>Delete Trade</h3>
            <p className={styles.deleteConfirmMessage}>
              Are you sure you want to delete the trade for{' '}
              <strong>{tradeToDelete.ticker}</strong>? This action cannot be undone and will
              permanently remove all trade data including charts and analysis.
            </p>
            <div className={styles.deleteConfirmActions}>
              <button
                onClick={handleDeleteCancel}
                className={styles.deleteConfirmCancel}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={styles.deleteConfirmButton}
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