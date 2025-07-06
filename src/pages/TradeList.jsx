import React, { useEffect, useState } from "react";
import { getAllTrades, getTradeById } from "../api/tradeApi";
import TradeLog from "./TradeLog";
import TradeDetailsPopup from "../components/TradeDetailsPopup";
import PageHeader from "../components/PageHeader";
import styles from "./Dashboard.module.css";

export default function TradeList() {
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [mode, setMode] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupTrade, setPopupTrade] = useState(null);
  const [error, setError] = useState(false); // Add error state

  useEffect(() => {
    getAllTrades()
      .then(res => {
        const sorted = [...res.data].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
        setTrades(sorted);
        setError(false);
      })
      .catch(err => {
        setError(true);
      });
  }, []);

  const handleEdit = async (id) => {
    try {
      const res = await getTradeById(id);
      setSelectedTrade(res.data);
      setMode("update");
    } catch (err) {
      setError(true);
    }
  };

  const handleReview = async (id) => {
    try {
      const res = await getTradeById(id);
      setSelectedTrade(res.data);
      setMode("review");
    } catch (err) {
      setError(true);
    }
  };

  const handleShowDetails = async (id) => {
    try {
      const res = await getTradeById(id);
      setPopupTrade(res.data);
      setShowPopup(true);
    } catch (err) {
      setError(true);
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
      trade.quantity !== null
    ) {
      const pl = (Number(trade.exit_price) - Number(trade.entry_price)) * Number(trade.quantity);
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
      if (mode === "update") return `Update exit details for ${selectedTrade.ticker}`;
      if (mode === "review") return `Add post-trade analysis for ${selectedTrade.ticker}`;
      return `Edit trade details for ${selectedTrade.ticker}`;
    };

    return (
      <div className={styles.dashboardContainer}>
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

  if (error) {
    // Show blank page (or you can return a custom message)
    return null;
    // Or for a custom message:
    // return <div style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>Failed to load trades.</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <PageHeader 
        title="Trade List"
        subtitle="View and manage all your trades"
      />

      {/* Modern Table */}
      <div style={{
        backgroundColor: "#1A2332",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #2A3441",
        overflowX: "auto"
      }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse"
        }}>
          <thead>
            <tr style={{
              borderBottom: "1px solid #2A3441"
            }}>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Ticker</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Entry Date</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Exit Date</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Entry Price</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Quantity</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Exit Price</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Invested</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>P&L</th>
              <th style={{
                padding: "16px 12px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                color: "#9CA3AF",
                backgroundColor: "transparent"
              }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr
                key={trade.id}
                style={{ 
                  cursor: "pointer",
                  borderBottom: "1px solid #2A3441",
                  transition: "background-color 0.2s ease"
                }}
                onClick={() => handleShowDetails(trade.id)}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#0F1419";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  color: "#E5E7EB",
                  fontWeight: "500"
                }}>{trade.ticker}</td>
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  color: "#E5E7EB"
                }}>{trade.entry_date ? formatDate(trade.entry_date) : "-"}</td>
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  color: "#E5E7EB"
                }}>{trade.exit_date ? formatDate(trade.exit_date) : "-"}</td>
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  color: "#E5E7EB"
                }}>{trade.entry_price !== undefined && trade.entry_price !== null ? Number(trade.entry_price).toFixed(2) : "-"}</td>
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  color: "#E5E7EB"
                }}>{trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity).toLocaleString() : "-"}</td>
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  color: "#E5E7EB"
                }}>{trade.exit_price !== undefined && trade.exit_price !== null ? Number(trade.exit_price).toFixed(2) : "-"}</td>
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  color: "#E5E7EB"
                }}>{getInvested(trade) !== "-" ? `$${getInvested(trade)}` : "-"}</td>
                <td style={{
                  padding: "16px 12px",
                  fontSize: "15px",
                  fontWeight: "600",
                  color: getPL(trade) === "-" ? "#9CA3AF" : getPL(trade) > 0 ? "#10B981" : "#EF4444"
                }}>
                  {getPL(trade) !== "-" ? `$${getPL(trade)}` : "-"}
                </td>
                <td style={{
                  padding: "16px 12px"
                }}>
                  {trade.exit_price
                    ? <button 
                        onClick={e => { e.stopPropagation(); handleReview(trade.id); }}
                        style={{
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: "500",
                          borderRadius: "6px",
                          background: "#8B5CF6",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = "#7C3AED";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = "#8B5CF6";
                        }}
                      >Review</button>
                    : <button 
                        onClick={e => { e.stopPropagation(); handleEdit(trade.id); }}
                        style={{
                          padding: "8px 16px",
                          fontSize: "14px",
                          fontWeight: "500",
                          borderRadius: "6px",
                          background: "#F59E0B",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = "#D97706";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = "#F59E0B";
                        }}
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