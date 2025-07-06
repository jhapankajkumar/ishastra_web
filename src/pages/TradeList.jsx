import React, { useEffect, useState } from "react";
import { getAllTrades, getTradeById } from "../api/tradeApi";
import TradeLog from "./TradeLog";
import TradeDetailsPopup from "../components/TradeDetailsPopup";
import PageHeader from "../components/PageHeader";
import ErrorPage from "../components/ErrorPage";
import { useNotification } from "../components/NotificationProvider";
import { getTickerBySymbol } from '../data/tickerData';
import styles from "./TradeList.module.css";

export default function TradeList() {
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [mode, setMode] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTrade, setPopupTrade] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();

  useEffect(() => {
    setLoading(true);
    getAllTrades()
      .then(res => {
        const sorted = [...res.data].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
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
  }, []);

  const handleEdit = async (id) => {
    try {
      const res = await getTradeById(id);
      setSelectedTrade(res.data);
      setMode("update");
    } catch (err) {
      console.error('Failed to fetch trade:', err);
      let errorMessage = "Failed to load trade details.";
      
      if (err.type === 'NETWORK_ERROR') {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      notification.error(errorMessage);
    }
  };

  const handleReview = async (id) => {
    try {
      const res = await getTradeById(id);
      setSelectedTrade(res.data);
      setMode("review");
    } catch (err) {
      console.error('Failed to fetch trade:', err);
      let errorMessage = "Failed to load trade details.";
      
      if (err.type === 'NETWORK_ERROR') {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      notification.error(errorMessage);
    }
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
      .then(res => {
        const sorted = [...res.data].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
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
    if (trade.entry_price && trade.quantity) {
      return (Number(trade.entry_price) * Number(trade.quantity)).toFixed(2);
    }
    return "-";
  };

  const getPL = (trade) => {
    if (
      trade.exit_price !== undefined &&
      trade.exit_price !== null &&
      trade.entry_price !== undefined &&
      trade.entry_price !== null &&
      trade.quantity !== undefined &&
      trade.quantity !== null &&
      trade.direction
    ) {
      // Calculate P&L correctly for both LONG and SHORT trades
      const priceDiff = trade.direction.toLowerCase() === 'long'
        ? Number(trade.exit_price) - Number(trade.entry_price)
        : Number(trade.entry_price) - Number(trade.exit_price);
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
        <TradeLog mode={mode} tradeData={selectedTrade} onSubmit={handleBack} />
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

  return (
    <div className={styles.container}>
      <PageHeader 
        title="Trade List"
        subtitle="View and manage all your trades"
      />

      {/* Modern Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Ticker</th>
              <th className={styles.tableHeaderCell}>Entry Date</th>
              <th className={styles.tableHeaderCell}>Exit Date</th>
              <th className={styles.tableHeaderCell}>Entry Price</th>
              <th className={styles.tableHeaderCell}>Quantity</th>
              <th className={styles.tableHeaderCell}>Exit Price</th>
              <th className={styles.tableHeaderCell}>Invested</th>
              <th className={styles.tableHeaderCell}>P&L</th>
              <th className={styles.tableHeaderCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr
                key={trade.id}
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
                <td className={`${styles.tableCell} ${styles.dateCell}`}>{trade.entry_date ? formatDate(trade.entry_date) : "-"}</td>
                <td className={`${styles.tableCell} ${styles.dateCell}`}>{trade.exit_date ? formatDate(trade.exit_date) : "-"}</td>
                <td className={`${styles.tableCell} ${styles.priceCell}`}>{trade.entry_price !== undefined && trade.entry_price !== null ? Number(trade.entry_price).toFixed(2) : "-"}</td>
                <td className={`${styles.tableCell} ${styles.priceCell}`}>{trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity).toLocaleString() : "-"}</td>
                <td className={`${styles.tableCell} ${styles.priceCell}`}>{trade.exit_price !== undefined && trade.exit_price !== null ? Number(trade.exit_price).toFixed(2) : "-"}</td>
                <td className={`${styles.tableCell} ${styles.priceCell}`}>{getInvested(trade) !== "-" ? `$${getInvested(trade)}` : "-"}</td>
                <td className={`${styles.tableCell} ${styles.profitCell} ${getPL(trade) === "-" ? "" : getPL(trade) > 0 ? styles.profitPositive : styles.profitNegative}`}>
                  {getPL(trade) !== "-" ? `$${getPL(trade)}` : "-"}
                </td>
                <td className={styles.tableCell}>
                  {trade.exit_price
                    ? <button 
                        onClick={e => { e.stopPropagation(); handleReview(trade.id); }}
                        className={`${styles.actionButton} ${styles.reviewButton}`}
                      >Review</button>
                    : <button 
                        onClick={e => { e.stopPropagation(); handleEdit(trade.id); }}
                        className={`${styles.actionButton} ${styles.editButton}`}
                      >Update</button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trade Details Popup */}
      {showPopup && popupTrade && (
        <TradeDetailsPopup 
          trade={popupTrade} 
          onClose={handleClosePopup} 
        />
      )}
    </div>
  );
}