import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
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
import { useAuth } from "../../contexts/AuthContext";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import { exportToCsv } from "../../utils/exportCsv";

const CLOSED_PAGE_SIZE = 20;

export default function TradeList() {
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  // Tab state for NASDAQ/NSE separation
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('tradeListActiveTab') || 'NASDAQ';
  });
  const [closedPage, setClosedPage] = useState(1);

  // Track viewport for responsive font sizing
    useEffect(() => {
      const onResize = () => setIsMobile(window.innerWidth <= 768);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

  const setActiveTabWithPersist = (tab) => {
    setActiveTab(tab);
    setClosedPage(1);
    localStorage.setItem('tradeListActiveTab', tab);
  };
  const showIndiaMarket = false

  // Default sort per section: Closed by Exit Date desc, Open/Partial by Entry Date desc.
  const DEFAULT_SECTION_SORT = {
    OPEN: { field: 'entryDate', order: 'desc' },
    PARTIAL: { field: 'entryDate', order: 'desc' },
    CLOSED: { field: 'exitDate', order: 'desc' },
  };
  const [sectionSort, setSectionSort] = useState(DEFAULT_SECTION_SORT);

  // Sorting functions — each table section (Open/Partial/Closed) sorts independently.
  const handleSort = (status, column) => {
    setSectionSort(prev => {
      const current = prev[status] || {};
      const nextOrder = current.field === column
        ? (current.order === 'asc' ? 'desc' : 'asc')
        : 'asc';
      return { ...prev, [status]: { field: column, order: nextOrder } };
    });
  };

  const renderSortableHeader = (title, sortKey, status) => {
    const { field, order } = sectionSort[status] || {};
    const isActive = field === sortKey;

    return (
      <th
        className={styles.tableHeaderCell}
        style={{ cursor: 'pointer' }}
        onClick={() => handleSort(status, sortKey)}
        title={`Sort by ${title}`}
      >
        {title}
        <span className={styles.sortArrow}>
          {isActive ? (
            order === 'asc' ?
              <span className={styles.sortArrowActive}>▲</span> :
              <span className={styles.sortArrowActive}>▼</span>
          ) : (
            <span className={styles.sortArrowInactive}>▲</span>
          )}
        </span>
      </th>
    );
  };

  const sortTrades = (trades, status) => {
    const { field, order } = sectionSort[status] || DEFAULT_SECTION_SORT[status] || {};
    if (!field) return trades;

    return [...trades].sort((a, b) => {
      let aValue, bValue;

      switch (field) {
        case 'ticker':
          aValue = a.ticker || '';
          bValue = b.ticker || '';
          return order === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);

        case 'entryDate':
          aValue = new Date(a.entryDate || 0);
          bValue = new Date(b.entryDate || 0);
          break;

        case 'exitDate':
          aValue = new Date(getLastExitDate(a) || 0);
          bValue = new Date(getLastExitDate(b) || 0);
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

        case 'rMultiple':
          aValue = getRMultiple(a, getAverageSellPrice(a)) ?? -Infinity;
          bValue = getRMultiple(b, getAverageSellPrice(b)) ?? -Infinity;
          break;

        default:
          return 0;
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [capitalData, setCapitalData] = useState([]);
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
        // Fetch trades and capital data independently — /api/capital requires
        // login and always 403s for guests, but that must never block the
        // trades list itself (guests are meant to see the shared sandbox).
        // Promise.all would let one 403 kill both; allSettled keeps them separate.
        const [tradesResult, capitalResult] = await Promise.allSettled([
          getAllTrades(),
          getCapitalInfo()
        ]);

        if (tradesResult.status === 'fulfilled') {
          // Process trades with exit transactions
          const tradesWithExits = await Promise.all(tradesResult.value.data.map(async trade => {
            try {
              const txRes = await getTradeTransactions(trade.id);
              const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
              return { ...trade, exitTransactions: exitTx };
            } catch (e) {
              return { ...trade, exitTransactions: [] };
            }
          }));
          setTrades(tradesWithExits);
          setError(null);
        } else if (tradesResult.reason?.type === 'NETWORK_ERROR') {
          setError(tradesResult.reason);
        }

        setCapitalData(capitalResult.status === 'fulfilled' ? (capitalResult.value.data || []) : []);
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

  const handleEdit = (trade) => {
    const id = typeof trade === 'object' ? trade.id : trade;
    navigate(`/trades/update/${id}`);
  };

  const handleReview = async (trade) => {
    const id = typeof trade === 'object' ? trade.id : trade;
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

  const handleShowDetails = async (tradeOrId) => {
    // Fetch full details from the API
    const id = typeof tradeOrId === 'object' ? tradeOrId.id : tradeOrId;
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
        // See the same allSettled fix + comment in the initial-load effect above.
        const [tradesResult, capitalResult] = await Promise.allSettled([
          getAllTrades(),
          getCapitalInfo()
        ]);

        if (tradesResult.status === 'fulfilled') {
          const tradesWithExits = await Promise.all(tradesResult.value.data.map(async trade => {
            try {
              const txRes = await getTradeTransactions(trade.id);
              const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
              return { ...trade, exitTransactions: exitTx };
            } catch (e) {
              return { ...trade, exitTransactions: [] };
            }
          }));
          setTrades(tradesWithExits);
          setError(null);
        } else if (tradesResult.reason?.type === 'NETWORK_ERROR') {
          setError(tradesResult.reason);
        }

        setCapitalData(capitalResult.status === 'fulfilled' ? (capitalResult.value.data || []) : []);
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

    const status = (trade.status || '').toLowerCase();

    if (status === 'open') {
      return 'OPEN';
    } else if (status === 'partial closed' || status.startsWith('partial')) {
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



  const displayedTrades = trades;

  // Market calculations
  const calculateMarketMetrics = (currency) => {
    const marketTrades = displayedTrades.filter(trade => getCurrency(trade) === currency);
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
      if (trade.status.toUpperCase() === 'CLOSED') return sum;
      const pl = getPartialPL(trade);
      return sum + (pl === "-" ? 0 : Number(pl));
    }, 0);

    // Calculate today's P&L (placeholder - would need today's price data)
    let todaysPL = 0; // TODO: Implement based on today's price changes

    // Today change
    let todayChange = 0, todayBase = 0;
    (marketTrades || []).forEach(t => {
      if (t.status.toUpperCase() === 'CLOSED') return;
      
      if (t.remainingQuantity > 0 && t.lastDayPrice != null && t.currentPrice != null) {
        const sign = (t.direction || 'long').toLowerCase() === 'short' ? -1 : 1;
        todayChange += sign * (Number(t.currentPrice) - Number(t.lastDayPrice)) * t.remainingQuantity;
        todayBase += Number(t.lastDayPrice) * t.remainingQuantity;
      }
    });
    const todayPct = todayBase > 0 ? (todayChange / todayBase) * 100 : null;
    todaysPL = todayChange;


    const totalCapital = capitalInfo?.total || 0;
    const investedPercentage = totalCapital > 0 ? (totalInvested / totalCapital * 100).toFixed(2) : 0;
    const plPercentage = totalInvested > 0 ? (totalPL / totalInvested * 100).toFixed(2) : 0;
    const todaysPlPercentage = Number(todayPct).toFixed(2);

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

  // Group trades by market and status — sorting is applied per-section inside
  // renderTradeTable, not globally, since Open/Partial/Closed sort independently.
  const groupTradesByMarketAndStatus = () => {
    const markets = {
      'USD': { name: 'US', trades: { OPEN: [], PARTIAL: [], CLOSED: [] } },
      'INR': { name: 'India', trades: { OPEN: [], PARTIAL: [], CLOSED: [] } }
    };

    displayedTrades.forEach(trade => {
      const currency = getCurrency(trade);
      const status = getTradeStatusDetailed(trade);

      if (markets[currency]) {
        markets[currency].trades[status].push(trade);
      }
    });

    return markets;
  };

  const marketGroups = groupTradesByMarketAndStatus();


  // R Multiple = (exit - entry) / (entry - stopLoss), sign-flipped for SHORT.
  // Risk (entry - stopLoss) is what was known when the trade was placed, so
  // this stays comparable across trades sized differently. Returns null when
  // stopLoss is missing/equal to entry (risk was never defined) — render
  // that as 'N/A' rather than a divide-by-zero artifact.
  const getRMultiple = (trade, exitPrice) => {
    const entryPrice = Number(trade.entryPrice || 0);
    const stopLoss = trade.stopLoss ? Number(trade.stopLoss) : 0;
    const isShort = (trade.direction || 'LONG').toUpperCase() === 'SHORT';
    const risk = isShort ? (stopLoss - entryPrice) : (entryPrice - stopLoss);
    if (!entryPrice || !stopLoss || risk <= 0 || exitPrice == null) return null;
    const reward = isShort ? (entryPrice - exitPrice) : (exitPrice - entryPrice);
    return reward / risk;
  };

  // Strip exchange suffixes (.NS, .BO, etc.) — a CSV for personal records
  // reads better with the bare ticker than with data-source plumbing.
  const stripExchangeSuffix = (ticker) => (ticker || '').replace(/\.(NS|BO)$/i, '');
  const toDateOnly = (value) => value ? String(value).slice(0, 10) : '';

  const handleExportCsv = () => {
    // Only the currently visible market/currency — matching what's on
    // screen, not silently including the other currency's trades too.
    const visibleCurrency = activeTab === 'NASDAQ' ? 'USD' : activeTab === 'NSE' ? 'INR' : null;
    const exportTrades = visibleCurrency
      ? displayedTrades.filter(trade => getCurrency(trade) === visibleCurrency)
      : displayedTrades;

    const rows = exportTrades.map(trade => {
      const avgSellPrice = getAverageSellPrice(trade);
      const rMultiple = getRMultiple(trade, avgSellPrice);
      const pl = Number(getPartialPL(trade)) || 0;
      return {
        ticker: stripExchangeSuffix(trade.ticker),
        currency: getCurrency(trade),
        status: getTradeStatusDetailed(trade),
        entryDate: toDateOnly(trade.entryDate),
        entryPrice: trade.entryPrice != null ? Number(trade.entryPrice).toFixed(2) : '',
        quantity: trade.quantity,
        exitPrice: avgSellPrice != null ? Number(avgSellPrice).toFixed(2) : '',
        exitDate: toDateOnly(getLastExitDate(trade)),
        pl: Math.round(pl),
        rMultiple: rMultiple == null ? '' : rMultiple.toFixed(2),
      };
    });
    exportToCsv(
      rows,
      [
        { key: 'ticker', label: 'Ticker' },
        { key: 'currency', label: 'Currency' },
        { key: 'status', label: 'Status' },
        { key: 'entryDate', label: 'Entry Date' },
        { key: 'entryPrice', label: 'Entry Price' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'exitPrice', label: 'Avg Exit Price' },
        { key: 'exitDate', label: 'Last Exit Date' },
        { key: 'pl', label: 'P&L' },
        { key: 'rMultiple', label: 'R Multiple' },
      ],
      `trades_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

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

  // Calculate total P&L for closed trades
  const calculateClosedTradesPL = (trades) => {
    return trades.reduce((sum, trade) => {
      const pl = getPartialPL(trade);
      return sum + (pl === "-" ? 0 : Number(pl));
    }, 0);
  };

  // Render trade table based on status
  const renderTradeTable = (trades, status, currency) => {
    if (trades.length === 0) return null;
    const symbol = currency === 'INR' ? '₹' : '$';
    const allSortedTrades = sortTrades(trades, status);
    // Paginate only the Closed section — Open/Partial are usually small,
    // and pagination there would just add UI noise.
    const sortedTrades = status === 'CLOSED'
      ? allSortedTrades.slice((closedPage - 1) * CLOSED_PAGE_SIZE, closedPage * CLOSED_PAGE_SIZE)
      : allSortedTrades;

    // Calculate total P&L for closed trades section
    let totalClosedPL = 0;
    if (status === 'CLOSED') {
      totalClosedPL = calculateClosedTradesPL(trades);
    }
    return (
      <div className={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className={styles.sectionTitle}>
            {status === 'OPEN' ? 'Open Trades' :
              status === 'PARTIAL' ? 'Partially Closed Trades' :
                'Closed Trades'} ({trades.length}) {currency} {status === 'CLOSED' && (
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '600',
              color: totalClosedPL >= 0 ? '#10b981' : '#ef4444'
            }}>
              {totalClosedPL >= 0 ? '+' : ''}{formatCurrency(totalClosedPL, currency)}
            </div>
          )}
          </h3>
        </div>
        {isMobile ? (
          <div className={styles.mobileList}>
            {[...sortedTrades]
              .sort((a,b)=> (a.ticker||'').localeCompare(b.ticker||''))
              .map((trade)=>{
                const currency = getCurrency(trade);
                const entryPrice = Number(trade.entryPrice || 0);
                const symbol = getCurrencySymbol(trade);
                const invested = Number(trade.entryPrice||0)*Number(trade.quantity||0);
                const plValue = Number((getPartialPL(trade)) || 0);
                const plPct = invested>0? (plValue/invested)*100:0;
                const ltp = Number(trade.currentPrice ?? trade.entryPrice ?? 0);
                const todaysPL = getTodaysPL(trade);
                const avgSellPrice = getAverageSellPrice(trade);
                const ltpPct = (trade.lastDayPrice!=null && Number(trade.lastDayPrice)>0)
                  ? ((ltp-Number(trade.lastDayPrice))/Number(trade.lastDayPrice))*100
                  : null;
                const stopLoss = trade.stopLoss ? Number(trade.stopLoss) : 0;
                const stopLossDistance = entryPrice > 0 ? (entryPrice - stopLoss) / entryPrice * 100 : 0;
                return (
                  <div key={trade.id} className={styles.mobileCardShell}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleShowDetails(trade)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleShowDetails(trade);
                      }
                    }}
                  >
                    <div className={styles.mobileMainCard}>
                      <div className={styles.mobileTopRow}>
                        <div className={styles.mobileTicker}>{trade.ticker}</div>
                        <div className={styles.mobileDateBadge}>{formatDate(trade.entryDate)}</div>
                      </div>
                      <div className={styles.mobileTopRow}>
                        <div className={styles.mobileCompactSummary}>
                          <span className={styles.dim}>Qty.</span> <span className={`${styles.plValue} ${styles.ltpRow}`}>{Number(trade.quantity||0).toLocaleString()}</span>
                          <span className={styles.dot}>•</span>
                          <span className={styles.dim}>Buy Avg.</span> <span className={`${styles.plValue} ${styles.ltpRow}`}>{Number(trade.entryPrice||0).toLocaleString(undefined,{maximumFractionDigits:2})} </span>
                        </div>
                      </div>
                      <div className={styles.mobileRow}>
                        <div className={styles.mobileLeft}>
                          <div className={styles.mobileTopRow}>
                            <span className={styles.dim}>Invested:</span> <span className={`${styles.plValue} ${styles.ltpRow}`}>{symbol}{invested.toLocaleString(undefined, { maximumFractionDigits: 0})}</span>
                          </div>
                          {(getTradeStatusDetailed(trade) == 'CLOSED') && (
                            <div className={styles.mobileTopRow}>
                            <span className={styles.dim}>Sell Avg: </span> <span className={`${styles.plValue} ${styles.ltpRow}`}>{symbol}{avgSellPrice.toLocaleString(undefined, { maximumFractionDigits: 0})}</span>
                          </div>
                          )}

                          {(getTradeStatusDetailed(trade) !== 'CLOSED') && (
                          <div className={styles.mobilePriceLine}><span className={styles.mobilePriceLabel}>LTP</span> {symbol}{ltp.toLocaleString(undefined, { maximumFractionDigits: 2})} {ltpPct==null? '' : (
                            <span className={ltpPct>=0? styles.plPositive: styles.plNegative}>
                              ({ltpPct>=0?'+':''}{ltpPct.toFixed(2)}%)
                            </span>
                          )}
                          </div>
                        )}

                        {(getTradeStatusDetailed(trade) !== 'CLOSED') && (
                          <div className={styles.mobilePriceLine}><span className={styles.mobilePriceLabel}>Stop</span> {symbol}{trade.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                          <span >
                            {" • "}
                             </span>
                            {stopLossDistance && (
                              <span className={`${styles.ltpRow} ${stopLossDistance > 0 ? styles.negative : styles.positive}`}>
                                {(stopLossDistance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                              </span>
                            )}
                          </div>
                        )}

                        </div>
                        <div className={styles.mobileRight}>
                          <div className={`${styles.plValue} ${plValue>=0? styles.plPositive: styles.plNegative}`}>
                           {symbol}{Math.abs(plValue).toLocaleString()}
                          </div>
                          <div className={`${styles.plValue} ${plValue>=0? styles.plPositive: styles.plNegative}`}>
                            {plPct>=0?'+':''}{plPct.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className={styles.mobileStatsGrid}>
                        <div className={styles.mobileStatItem}>
                          <span className={styles.mobileStatLabel}>P&L</span>
                          <span className={`${styles.mobileStatValue} ${plValue >= 0 ? styles.footerPositive : styles.footerNegative}`}>
                            {plValue >= 0 ? '+' : ''}{formatCurrency(plValue, currency)}
                          </span>
                        </div>
                        {status === 'CLOSED' ? (() => {
                          const rMultiple = getRMultiple(trade, avgSellPrice);
                          return (
                            <div className={styles.mobileStatItem}>
                              <span className={styles.mobileStatLabel}>R Multiple</span>
                              <span
                                className={`${styles.mobileStatValue} ${rMultiple == null ? '' : rMultiple >= 0 ? styles.footerPositive : styles.footerNegative}`}
                                title={rMultiple == null ? 'No stop-loss recorded for this trade' : undefined}
                              >
                                {rMultiple == null ? 'No stop' : `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R`}
                              </span>
                            </div>
                          );
                        })() : (
                          <div className={styles.mobileStatItem}>
                            <span className={styles.mobileStatLabel}>Today</span>
                            <span className={`${styles.mobileStatValue} ${todaysPL.value >= 0 ? styles.footerPositive : styles.footerNegative}`}>
                              {`${todaysPL.value >= 0 ? '+' : ''}${formatCurrency(todaysPL.value, currency)}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.mobileActionPanel}>
                      <div className={styles.mobileActionRail}>
                        <button
                          className={styles.mobileActionBtn}
                          onClick={(e) => { e.stopPropagation(); handleShowDetails(trade); }}
                          title="View Details"
                        >
                          <VisibilityOutlinedIcon fontSize="inherit" />
                        </button>
                        {getTradeStatusDetailed(trade) === 'CLOSED' ? (
                          <button
                            className={`${styles.mobileActionBtn} ${styles.reviewActionBtn}`}
                            onClick={(e) => { e.stopPropagation(); handleReview(trade); }}
                            title="Add Review"
                          >
                            <EditOutlinedIcon fontSize="inherit" />
                          </button>
                        ) : (
                          <>
                            <button
                              className={`${styles.mobileActionBtn} ${styles.updateActionBtn}`}
                              onClick={(e) => { e.stopPropagation(); handleEdit(trade); }}
                              title="Update Trade"
                            >
                              <EditOutlinedIcon fontSize="inherit" />
                            </button>
                            <button
                              className={`${styles.mobileActionBtn} ${styles.editActionBtn}`}
                              onClick={(e) => { e.stopPropagation(); navigate(`/trades/edit/${trade.id}`); }}
                              title="Edit Trade"
                            >
                              <AutoFixHighOutlinedIcon fontSize="inherit" />
                            </button>
                          </>
                        )}
                        {user && (
                          <button
                            className={`${styles.mobileActionBtn} ${styles.deleteActionBtn}`}
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(trade); }}
                            title="Delete Trade"
                          >
                            <DeleteOutlineOutlinedIcon fontSize="inherit" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
        <div className={styles.tableContainer}>
          <table className={styles.tradesTable}>
            <thead>
              <tr>
                {renderSortableHeader('Ticker', 'ticker', status)}
                {status === 'PARTIAL' ? (
                  renderSortableHeader('Entry Date & Last Exit Date', 'entryDate', status)
                ) : status === 'CLOSED' ? (
                  <>
                    {renderSortableHeader('Entry Date', 'entryDate', status)}
                    {renderSortableHeader('Exit Date', 'exitDate', status)}
                  </>
                ) : (
                  renderSortableHeader('Entry Date', 'entryDate', status)
                )}
                {renderSortableHeader('BUY AVG', 'entryPrice', status)}
                {status === 'OPEN' ? (
                  <th className={styles.tableHeaderCell}>STOP</th>
                ) : (
                  <th className={styles.tableHeaderCell} aria-hidden="true"></th>
                )}
                {status === 'CLOSED' ? (
                  <th className={styles.tableHeaderCell}>SELL AVG</th>
                ) : (
                  renderSortableHeader('LTP', 'currentPrice', status)
                )}
                {status === 'PARTIAL' ? (
                  <th className={styles.tableHeaderCell}>Remaining/QTY</th>
                ) : (
                  renderSortableHeader('QTY', 'quantity', status)
                )}
                {renderSortableHeader('Invested', 'invested', status)}
                {status === 'CLOSED' ? (
                  <th className={styles.tableHeaderCell}>Final</th>
                ) : (
                  <th className={styles.tableHeaderCell}>Current</th>
                )}

                {renderSortableHeader('P&L', 'pl', status)}
                {status === 'CLOSED' ? (
                  renderSortableHeader('R Multiple', 'rMultiple', status)
                ) : (
                  renderSortableHeader("Today's P&L", 'todaysPL', status)
                )}
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
                const marketValue = status === 'CLOSED' ? (avgSellPrice ? (avgSellPrice * originalQty) : 0) :
                  status === 'PARTIAL' ?
                    (currentPrice * remainingQty) :
                    (currentPrice * originalQty);
                const plRaw = getPartialPL(trade);
                const plValue = plRaw === "-" ? 0 : Number(plRaw || 0);
                const plPercentage = invested > 0 ? (plValue / invested * 100).toFixed(2) : 0;
                // Today's P&L
                const todaysPL = getTodaysPL(trade);
                const stopLoss = trade.stopLoss ? Number(trade.stopLoss) : entryPrice;
                const stopLossDistance = entryPrice > 0 ? (entryPrice - stopLoss) / entryPrice * 100 : 0;

                return (
                  <tr
                    key={trade.id || trade.tradeId}
                    className={`${styles.tradeRow} ${styles[status.toLowerCase()]}`}
                    onClick={() => handleShowDetails(trade)}
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
                    {status === 'OPEN' ? (
                      <td>
                        <div className={styles.priceWithChange}>
                        <span >
                          {formatCurrency(stopLoss, currency)}</span>
                          {stopLossDistance && (
                            <span className={`${styles.priceChange} ${stopLossDistance > 0 ? styles.negative : styles.positive}`}>
                              {(stopLossDistance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </span>
                          )}
                        </div>
                      </td>
                    ) : (
                      <td className={styles.emptyCell}></td>
                    )}
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
                    {/* R Multiple for closed trades, Today's P&L otherwise */}
                    <td>
                      {status === 'CLOSED' ? (
                        (() => {
                          const rMultiple = getRMultiple(trade, avgSellPrice);
                          if (rMultiple == null) {
                            return <span title="No stop-loss recorded for this trade" style={{ color: 'var(--text-muted)', cursor: 'help' }}>No stop</span>;
                          }
                          return (
                            <span className={rMultiple >= 0 ? styles.profit : styles.loss}>
                              {rMultiple >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
                            </span>
                          );
                        })()
                      ) : (
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
                          onClick={e => { e.stopPropagation(); handleShowDetails(trade); }}
                          className={`${styles.actionBtn} ${styles.viewBtn}`}
                          title="View Details"
                        >
                          <VisibilityOutlinedIcon fontSize="inherit" />
                        </button>
                        {status === 'CLOSED' ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleReview(trade);
                            }}
                            className={`${styles.actionBtn} ${styles.reviewBtn}`}
                            title="Add Review"
                          >
                            📝
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleEdit(trade);
                              }}
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            title="Update Trade"
                          >
                              <EditOutlinedIcon fontSize="inherit" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/trades/edit/${trade.id}`); }}
                              className={`${styles.actionBtn} ${styles.viewBtn}`}
                              title="Edit Trade"
                            >
                              <AutoFixHighOutlinedIcon fontSize="inherit" />
                            </button>
                          </>
                        )}
                        {user && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteClick(trade); }}
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            title="Delete Trade"
                          >
                            <DeleteOutlineOutlinedIcon fontSize="inherit" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
        {status === 'CLOSED' && (
          <Pagination page={closedPage} pageSize={CLOSED_PAGE_SIZE} total={allSortedTrades.length} onPageChange={setClosedPage} />
        )}
      </div>
    );
  };

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
              {/* Removed Total Capital for compact mobile view */}
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Open Positions Value</span>
                <span className={styles.metricValue}>
                  {formatCurrency(calculateMarketMetrics('USD').totalInvested, 'USD')}
                  {/* <small className={styles.metricPercent}>({calculateMarketMetrics('USD').investedPercentage}%)</small> */}
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
          {showIndiaMarket && (
          <div className={styles.compactMarketCard}>
            <div className={styles.marketHeader}>
              <span className={styles.marketFlag}>🇮🇳</span>
              <span className={styles.marketName}>India Market</span>
              <span className={styles.currencyBadge}>INR</span>
            </div>
            <div className={styles.marketMetrics}>
              {/* Removed Total Capital for compact mobile view */}
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Total Invested</span>
                <span className={styles.metricValue}>
                  {formatCurrency(calculateMarketMetrics('INR').totalInvested, 'INR')}
                  {/* <small className={styles.metricPercent}>({calculateMarketMetrics('INR').investedPercentage}%)</small> */}
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
          </div>)}
        </div>
      )}

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.filters} />
        <div style={{ display: 'flex', gap: 10 }}>
          {displayedTrades.length > 0 && (
            <button className={styles.filterSelect} onClick={handleExportCsv}>
              ⬇ Export CSV
            </button>
          )}
          <button
            className={styles.addButton}
            onClick={() => navigate('/trades/new')}
          >
            + Add Trade
          </button>
        </div>
      </div>

      {/* Market Tabs */}
      {showIndiaMarket && (
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'NASDAQ' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('NASDAQ')}
        >
          🇺🇸 US (NASDAQ/NYSE)
        </button>
        {showIndiaMarket && (
        <button
          className={`${styles.tabButton} ${activeTab === 'NSE' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('NSE')}
        >
          🇮🇳 India (NSE)
        </button>
        )}
      </div>
      )}

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

            {/* Closed Trades — paginated internally, real accounts can have 50+ */}
            {renderTradeTable(marketData.trades.CLOSED, 'CLOSED', currency)}
          </div>
        );
      })}

      {/* Empty State */}
      {displayedTrades.length === 0 && !loading && (
        <EmptyState
          icon="💼"
          title="No trades yet"
          message="Start by adding your first trade to track your portfolio."
          actionLabel="+ Add your first trade"
          onAction={() => navigate('/trades/new')}
        />
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
