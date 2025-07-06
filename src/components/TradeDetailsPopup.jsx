import React, { useEffect, useState } from "react";
import styles from "../pages/Dashboard.module.css";
import { fetchExitTactics, fetchSetups } from '../api/tradeApi';

export default function TradeDetailsPopup({ trade, onClose }) {
  const [exitTactics, setExitTactics] = useState([]);
  const [setups, setSetups] = useState([]);

  useEffect(() => {
    fetchExitTactics()
      .then(res => setExitTactics(res.data))
      .catch(() => setExitTactics([]));
  }, []);

  useEffect(() => {
    fetchSetups()
      .then(res => setSetups(res.data))
      .catch(() => setSetups([]));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = d.toLocaleString('en-US', { month: 'short' });
    const yyyy = d.getFullYear();
    return `${dd} ${mmm} ${yyyy}`;
  };

  const getSetupName = (setupId) => {
    const setup = setups.find(s => s.id === setupId || s.trade_setup_id === setupId);
    return setup ? setup.name : "-";
  };

  const getExitTacticName = (tacticId) => {
    const tactic = exitTactics.find(t => t.id === tacticId || t.tactic_id === tacticId);
    return tactic ? tactic.name : "-";
  };

  const getInvested = () => {
    if (trade.entry_price && trade.quantity) {
      return `$${(Number(trade.entry_price) * Number(trade.quantity)).toFixed(2)}`;
    }
    return "-";
  };

  const getPL = () => {
    if (
      trade.exit_price !== undefined &&
      trade.exit_price !== null &&
      trade.entry_price !== undefined &&
      trade.entry_price !== null &&
      trade.quantity !== undefined &&
      trade.quantity !== null
    ) {
      const pl = (Number(trade.exit_price) - Number(trade.entry_price)) * Number(trade.quantity);
      return `$${pl.toFixed(2)}`;
    }
    return "-";
  };

  const entryImages = trade.trade_images?.filter(img => img.image_type === "entry") || [];
  const exitImages = trade.trade_images?.filter(img => img.image_type === "exit") || [];
  const postImages = trade.trade_images?.filter(img => img.image_type === "post") || [];

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        backgroundColor: "#0F1419",
        borderRadius: 16,
        padding: 32,
        maxWidth: 1000,
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        position: "relative",
        border: "1px solid #2A3441",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            background: "#2A3441",
            border: "none",
            color: "#9CA3AF",
            fontSize: 18,
            cursor: "pointer",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            transition: "all 0.2s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
          onMouseOver={(e) => {
            e.target.style.background = "#374151";
            e.target.style.color = "#fff";
            e.target.style.transform = "scale(1.05)";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "#2A3441";
            e.target.style.color = "#9CA3AF";
            e.target.style.transform = "scale(1)";
          }}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="m18 6-12 12"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>

        <div style={{ 
          marginBottom: 32, 
          marginRight: 60,
          borderBottom: "1px solid #2A3441",
          paddingBottom: 20
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10B981"
            }}></div>
            <h1 style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.5px"
            }}>
              {trade.ticker}
            </h1>
          </div>
          <p style={{
            fontSize: "16px",
            color: "#9CA3AF",
            margin: 0
          }}>
            Trade Details & Analysis
          </p>
        </div>

        {/* Entry Section */}
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid #2A3441"
        }}>
          <h3 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#fff",
            margin: "0 0 20px 0"
          }}>
            Entry Analysis
          </h3>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              display: "block",
              marginBottom: 8
            }}>
              Reason for Entry
            </label>
            <div style={{
              backgroundColor: "#0F1419",
              border: "1px solid #2A3441",
              borderRadius: 8,
              padding: 16,
              color: "#E5E7EB",
              fontSize: "15px",
              lineHeight: "1.5",
              minHeight: 60,
              whiteSpace: "pre-wrap"
            }}>
              {trade.reason_for_entry || "No reason provided"}
            </div>
          </div>
        </div>

        {/* Entry Details */}
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid #2A3441"
        }}>
          <h3 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#4F46E5",
            margin: "0 0 20px 0"
          }}>
            Entry Details
          </h3>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            marginBottom: 20
          }}>
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 6
              }}>
                Date
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {formatDate(trade.entry_date)}
              </span>
            </div>
            
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 6
              }}>
                Average Price
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {trade.entry_price !== undefined && trade.entry_price !== null ? `$${Number(trade.entry_price).toFixed(2)}` : "-"}
              </span>
            </div>
            
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 6
              }}>
                Quantity
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity).toLocaleString() : "-"}
              </span>
            </div>
            
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 6
              }}>
                Setup
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {getSetupName(trade.trade_setup_id)}
              </span>
            </div>
          </div>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            paddingTop: 20,
            borderTop: "1px solid #2A3441"
          }}>
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 6
              }}>
                Total Invested
              </label>
              <span style={{
                fontSize: "18px",
                color: "#3B82F6",
                fontWeight: "600"
              }}>
                {getInvested()}
              </span>
            </div>
            
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 6
              }}>
                Profit & Loss
              </label>
              <span style={{
                fontSize: "18px",
                color: getPL() === "-" ? "#9CA3AF" : getPL().includes("-") ? "#EF4444" : "#10B981",
                fontWeight: "600"
              }}>
                {getPL()}
              </span>
            </div>
          </div>
        </div>

        {/* Entry Charts */}
        {entryImages.length > 0 && (
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: "1px solid #2A3441"
          }}>
            <h4 style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#9CA3AF",
              margin: "0 0 16px 0"
            }}>
              Entry Charts
            </h4>
            {entryImages.map((img, idx) => (
              <div key={idx} style={{ marginBottom: idx < entryImages.length - 1 ? 20 : 0 }}>
                <img
                  src={`http://localhost:8000/${img.image_url || img.file_path}`}
                  alt="Entry Chart"
                  style={{ 
                    width: "100%", 
                    maxHeight: "500px", 
                    objectFit: "contain", 
                    borderRadius: 8, 
                    border: "1px solid #2A3441",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)" 
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Exit Section */}
        {(trade.exit_date || trade.exit_price) && (
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: "1px solid #2A3441"
          }}>
            <h3 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#F59E0B",
              margin: "0 0 20px 0"
            }}>
              Exit Details
            </h3>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
              marginBottom: 20
            }}>
              <div>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9CA3AF",
                  display: "block",
                  marginBottom: 6
                }}>
                  Date
                </label>
                <span style={{
                  fontSize: "16px",
                  color: "#E5E7EB",
                  fontWeight: "500"
                }}>
                  {formatDate(trade.exit_date)}
                </span>
              </div>
              
              <div>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9CA3AF",
                  display: "block",
                  marginBottom: 6
                }}>
                  Average Price
                </label>
                <span style={{
                  fontSize: "16px",
                  color: "#E5E7EB",
                  fontWeight: "500"
                }}>
                  {trade.exit_price !== undefined && trade.exit_price !== null ? `$${Number(trade.exit_price).toFixed(2)}` : "-"}
                </span>
              </div>
              
              <div>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9CA3AF",
                  display: "block",
                  marginBottom: 6
                }}>
                  Exit Tactic
                </label>
                <span style={{
                  fontSize: "16px",
                  color: "#E5E7EB",
                  fontWeight: "500"
                }}>
                  {getExitTacticName(trade.exit_tactic_id)}
                </span>
              </div>
            </div>
            
            {trade.reason_for_exit && (
              <div style={{ marginTop: 20 }}>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9CA3AF",
                  display: "block",
                  marginBottom: 8
                }}>
                  Reason for Exit
                </label>
                <div style={{
                  backgroundColor: "#0F1419",
                  border: "1px solid #2A3441",
                  borderRadius: 8,
                  padding: 16,
                  color: "#E5E7EB",
                  fontSize: "15px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap"
                }}>
                  {trade.reason_for_exit}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exit Charts */}
        {exitImages.length > 0 && (
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: "1px solid #2A3441"
          }}>
            <h4 style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#9CA3AF",
              margin: "0 0 16px 0"
            }}>
              Exit Charts
            </h4>
            {exitImages.map((img, idx) => (
              <div key={idx} style={{ marginBottom: idx < exitImages.length - 1 ? 20 : 0 }}>
                <img
                  src={`http://localhost:8000/${img.image_url || img.file_path}`}
                  alt="Exit Chart"
                  style={{ 
                    width: "100%", 
                    maxHeight: "500px", 
                    objectFit: "contain", 
                    borderRadius: 8, 
                    border: "1px solid #2A3441",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.25)" 
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Post Trade Analysis */}
        {(trade.post_trade_analysis || postImages.length > 0) && (
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: "1px solid #2A3441"
          }}>
            <h3 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#8B5CF6",
              margin: "0 0 20px 0"
            }}>
              Post Trade Analysis
            </h3>
            
            {trade.post_trade_analysis && (
              <div style={{ marginBottom: postImages.length > 0 ? 20 : 0 }}>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9CA3AF",
                  display: "block",
                  marginBottom: 8
                }}>
                  Analysis Notes
                </label>
                <div style={{
                  backgroundColor: "#0F1419",
                  border: "1px solid #2A3441",
                  borderRadius: 8,
                  padding: 16,
                  color: "#E5E7EB",
                  fontSize: "15px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap"
                }}>
                  {trade.post_trade_analysis}
                </div>
              </div>
            )}

            {/* Post Trade Files */}
            {postImages.length > 0 && (
              <div>
                <h4 style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#9CA3AF",
                  margin: "0 0 16px 0"
                }}>
                  Post Trade Files
                </h4>
                {postImages.map((img, idx) => (
                  <div key={idx} style={{ marginBottom: idx < postImages.length - 1 ? 20 : 0 }}>
                    <img
                      src={`http://localhost:8000/${img.image_url || img.file_path}`}
                      alt="Post Trade"
                      style={{ 
                        width: "100%", 
                        maxHeight: "500px", 
                        objectFit: "contain", 
                        borderRadius: 8, 
                        border: "1px solid #2A3441",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.25)" 
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
