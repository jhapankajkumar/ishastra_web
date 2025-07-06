import React from "react";
import { getTickerBySymbol } from '../data/tickerData';

export default function JournalDetailsPopup({ journal, onClose }) {
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
    switch(trend?.toLowerCase()) {
      case 'bullish': return '#10B981';
      case 'bearish': return '#EF4444';
      case 'sideways': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  const companyName = getTickerBySymbol(journal.stock)?.name;

  return (
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
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        backgroundColor: "#0F1419",
        borderRadius: 16,
        padding: 32,
        maxWidth: 800,
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

        {/* Header */}
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
              backgroundColor: getTrendColor(journal.trend)
            }}></div>
            <h1 style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.5px"
            }}>
              {journal.stock}
            </h1>
          </div>
          <p style={{
            fontSize: "16px",
            color: "#9CA3AF",
            margin: 0
          }}>
            Chart Reading Analysis - {formatDate(journal.date)}
          </p>
          {companyName && (
            <p style={{
              fontSize: "14px",
              color: "#6B7280",
              margin: "4px 0 0 0"
            }}>
              {companyName}
            </p>
          )}
        </div>

        {/* Basic Info Section */}
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
            Basic Information
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
                {formatDate(journal.date)}
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
                Overall Trend
              </label>
              <span style={{
                fontSize: "16px",
                color: getTrendColor(journal.trend),
                fontWeight: "600",
                display: "inline-block",
                padding: "4px 8px",
                backgroundColor: getTrendColor(journal.trend) + "20",
                borderRadius: 6
              }}>
                {journal.trend || "Not specified"}
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
                Candle Type
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {journal.candle_type || "-"}
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
                Entry Considered
              </label>
              <span style={{
                fontSize: "16px",
                color: journal.entry_considered ? "#10B981" : "#9CA3AF",
                fontWeight: "600"
              }}>
                {journal.entry_considered ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* Technical Analysis Section */}
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
            Technical Analysis
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
                Support Level
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {journal.support_level ? `$${Number(journal.support_level).toFixed(2)}` : "-"}
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
                Resistance Level
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {journal.resistance_level ? `$${Number(journal.resistance_level).toFixed(2)}` : "-"}
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
                RSI Value
              </label>
              <span style={{
                fontSize: "16px",
                color: "#E5E7EB",
                fontWeight: "500"
              }}>
                {journal.rsi_value ? Number(journal.rsi_value).toFixed(1) : "-"}
              </span>
            </div>
          </div>

          {/* Boolean Indicators */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16,
            marginTop: 20
          }}>
            {[
              { key: 'near_support', label: 'Near Support' },
              { key: 'near_resistance', label: 'Near Resistance' },
              { key: 'ema_touch', label: 'EMA Touch' },
              { key: 'volume_spike', label: 'Volume Spike' }
            ].map(indicator => (
              <div key={indicator.key} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                backgroundColor: journal[indicator.key] ? "#10B98120" : "#6B728020",
                borderRadius: 8,
                border: `1px solid ${journal[indicator.key] ? "#10B981" : "#6B7280"}`
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: journal[indicator.key] ? "#10B981" : "#6B7280"
                }}></div>
                <span style={{
                  fontSize: "14px",
                  color: journal[indicator.key] ? "#10B981" : "#9CA3AF",
                  fontWeight: "500"
                }}>
                  {indicator.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Section */}
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
            Analysis & Notes
          </h3>

          {journal.action_plan && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Action Plan
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
                {journal.action_plan}
              </div>
            </div>
          )}

          {journal.notes && (
            <div style={{ marginBottom: journal.screenshot_url ? 20 : 0 }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Notes
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
                {journal.notes}
              </div>
            </div>
          )}

          {/* Screenshot */}
          {journal.screenshot_url && (
            <div style={{ marginBottom: journal.review_screenshot_url ? 24 : 0 }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Original Chart Screenshot
              </label>
              <div style={{ marginBottom: 0 }}>
                <img
                  src={`http://localhost:8000/${journal.screenshot_url}`}
                  alt="Original Chart Screenshot"
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
            </div>
          )}

          {/* Review Screenshot */}
          {journal.review_screenshot_url && (
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Review Chart Screenshot
              </label>
              <div style={{ marginBottom: 0 }}>
                <img
                  src={`http://localhost:8000/${journal.review_screenshot_url}`}
                  alt="Review Chart Screenshot"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
