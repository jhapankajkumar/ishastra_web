import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import styles from "./TradeDetailsPopup.module.css";
import popupStyles from "./CombinedPositionPopup.module.css";

export default function CombinedPositionPopup({ trade, onClose }) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const currencySymbol = trade.currency === "INR" ? "₹" : "$";

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mmm = d.toLocaleString("en-US", { month: "short" });
    const yyyy = d.getFullYear();
    return `${dd} ${mmm} ${yyyy}`;
  };

  const formatCurrency = (value, digits = 2) => {
    if (value === undefined || value === null || isNaN(Number(value))) return "-";
    return `${currencySymbol}${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  };

  const subTrades = trade.trades || [];
  const pl = Number(trade.aggregatedPL || 0);
  const plPct = Number(trade.aggregatedPLPercent || 0);

  const getStatusStyle = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "OPEN") return { bg: "#10b98120", color: "#10b981" };
    if (s.startsWith("PARTIAL")) return { bg: "#f59e0b20", color: "#f59e0b" };
    return { bg: "#6b728020", color: "#9ca3af" };
  };

  return (
    <div className={`${styles.overlay} ${theme}`} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className={styles.closeButton}>
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
            <path d="m18 6-12 12" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.tickerBadge}></div>
              <h1 className={styles.tickerTitle}>{trade.ticker}</h1>
              <span className={popupStyles.combinedBadge}>
                {subTrades.length} entries
              </span>
            </div>
            <p className={styles.companyName}>Combined Position Summary</p>
          </div>

          <div className={styles.body}>
            {/* ─── Aggregated Summary ─── */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitleAccent}>Position Summary</h3>
              <div className={styles.detailCard}>
                <div className={styles.detailGrid}>
                  <div className={styles.fieldItem}>
                    <span className={styles.detailLabel}>Total Quantity</span>
                    <span className={styles.detailValue}>
                      {Number(trade.quantity || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.fieldItem}>
                    <span className={styles.detailLabel}>Remaining Qty</span>
                    <span className={styles.detailValue}>
                      {Number(trade.remainingQuantity || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.fieldItem}>
                    <span className={styles.detailLabel}>Avg Entry Price</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(trade.entryPrice)}
                    </span>
                  </div>
                  <div className={styles.fieldItem}>
                    <span className={styles.detailLabel}>Current Price</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(trade.currentPrice)}
                    </span>
                  </div>
                  <div className={styles.fieldItem}>
                    <span className={styles.detailLabel}>Total Invested</span>
                    <span className={styles.detailValue}>
                      {formatCurrency(trade.investedValue)}
                    </span>
                  </div>
                  <div className={styles.fieldItem}>
                    <span className={styles.detailLabel}>Total P&L</span>
                    <span
                      className={styles.detailValue}
                      style={{
                        color:
                          pl >= 0
                            ? "var(--status-success)"
                            : "var(--status-error)",
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(pl)} (
                      {plPct >= 0 ? "+" : ""}
                      {plPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Buy More button */}
              <button
                className={popupStyles.buyMoreBtn}
                onClick={() => {
                  onClose();
                  navigate("/trades/new", {
                    state: {
                      prefillTicker: trade.ticker,
                      prefillCurrency: trade.currency || "USD",
                    },
                  });
                }}
              >
                + Add to {trade.ticker} Position
              </button>
            </div>

            {/* ─── Individual Trade Entries ─── */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Individual Entries ({subTrades.length})
              </h3>

              {subTrades.map((t, index) => {
                const sym = t.currency === "INR" ? "₹" : "$";
                const tQty = Number(t.quantity || 0);
                const tRemaining = Number(t.remainingQuantity ?? t.quantity ?? 0);
                const tEntry = Number(t.entryPrice || 0);
                const tInvested = tEntry * tQty;
                const tStatus = (t.status || "").toUpperCase();
                const exitTxs = t.exitTransactions || [];
                const totalExited = exitTxs.reduce(
                  (sum, tx) => sum + Number(tx.quantity || 0),
                  0
                );
                const avgExitPrice =
                  totalExited > 0
                    ? exitTxs.reduce(
                        (sum, tx) =>
                          sum +
                          Number(tx.price || 0) * Number(tx.quantity || 0),
                        0
                      ) / totalExited
                    : null;

                const isClosed = tStatus === "CLOSED";
                const statusStyle = getStatusStyle(tStatus);

                // SL % and computed targets per entry
                const tSlValue = t.stopLoss != null ? Number(t.stopLoss) : null;
                const tRisk = tEntry > 0 && tSlValue != null ? Math.abs(tEntry - tSlValue) : 0;
                const tSlPct = tEntry > 0 && tRisk > 0 ? (tRisk / tEntry) * 100 : null;
                const tIsLong = (t.direction || 'long').toLowerCase() === 'long';
                const tDirF = tIsLong ? 1 : -1;
                const tComputeTarget = (mult, stored) => {
                  const s = Number(stored);
                  if (s > 0) return s;
                  return tRisk > 0 ? tEntry + tDirF * mult * tRisk : null;
                };
                const tT1 = tComputeTarget(2, t.target1);
                const tT2 = tComputeTarget(3, t.target2);
                const tT3 = tComputeTarget(4, t.target3);
                const tTargetPct = (tp) => tp && tEntry > 0 ? Math.abs((tp - tEntry) / tEntry) * 100 : null;

                return (
                  <div key={t.id || index} className={styles.detailCard}>
                    {/* Card header row */}
                    <div className={popupStyles.entryHeader}>
                      <div className={popupStyles.entryTitle}>
                        <span className={styles.detailHeading}>
                          Entry {index + 1}
                        </span>
                        <span className={styles.detailLabel}>
                          {formatDate(t.entryDate)}
                        </span>
                        <span
                          className={popupStyles.statusBadge}
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {tStatus}
                        </span>
                      </div>

                      <div className={popupStyles.entryActions}>
                        {!isClosed && (
                          <button
                            className={popupStyles.actionBtn}
                            onClick={() => {
                              onClose();
                              navigate(`/trades/update/${t.id}`);
                            }}
                            title="Edit / Exit this entry"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        <button
                          className={popupStyles.actionBtn}
                          onClick={() => {
                            onClose();
                            navigate(`/trades/review/${t.id}`);
                          }}
                          title="Add review for this entry"
                        >
                          📝 Review
                        </button>
                      </div>
                    </div>

                    {/* Entry data grid */}
                    <div className={styles.detailGrid}>
                      <div className={styles.fieldItem}>
                        <span className={styles.detailLabel}>Entry Price</span>
                        <span className={styles.detailValue}>
                          {sym}
                          {tEntry.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className={styles.fieldItem}>
                        <span className={styles.detailLabel}>Quantity</span>
                        <span className={styles.detailValue}>
                          {tQty.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.fieldItem}>
                        <span className={styles.detailLabel}>Remaining Qty</span>
                        <span className={styles.detailValue}>
                          {tRemaining.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.fieldItem}>
                        <span className={styles.detailLabel}>Invested</span>
                        <span className={styles.detailValue}>
                          {sym}
                          {tInvested.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {t.stopLoss != null && !isClosed && (
                        <div className={styles.fieldItem}>
                          <span className={styles.detailLabel}>Stop Loss</span>
                          <span
                            className={styles.detailValue}
                            style={{ color: "var(--status-error)" }}
                          >
                            {sym}
                            {Number(t.stopLoss).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            {tSlPct !== null && (
                              <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.75 }}>
                                ({tSlPct.toFixed(2)}%)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {!isClosed && tT1 !== null && (
                        <div className={styles.fieldItem}>
                          <span className={styles.detailLabel}>T1 (1:2R)</span>
                          <span className={styles.detailValue} style={{ color: 'var(--status-success)' }}>
                            {sym}{tT1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {tTargetPct(tT1) !== null && (
                              <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.75 }}>({`+${tTargetPct(tT1).toFixed(2)}%`})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {!isClosed && tT2 !== null && (
                        <div className={styles.fieldItem}>
                          <span className={styles.detailLabel}>T2 (1:3R)</span>
                          <span className={styles.detailValue} style={{ color: 'var(--status-success)' }}>
                            {sym}{tT2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {tTargetPct(tT2) !== null && (
                              <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.75 }}>({`+${tTargetPct(tT2).toFixed(2)}%`})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {!isClosed && tT3 !== null && (
                        <div className={styles.fieldItem}>
                          <span className={styles.detailLabel}>T3 (1:4R)</span>
                          <span className={styles.detailValue} style={{ color: 'var(--status-success)' }}>
                            {sym}{tT3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {tTargetPct(tT3) !== null && (
                              <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.75 }}>({`+${tTargetPct(tT3).toFixed(2)}%`})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {exitTxs.length > 0 && (
                        <>
                          <div className={styles.fieldItem}>
                            <span className={styles.detailLabel}>
                              Exited Qty
                            </span>
                            <span className={styles.detailValue}>
                              {totalExited.toLocaleString()}
                            </span>
                          </div>
                          {avgExitPrice != null && (
                            <div className={styles.fieldItem}>
                              <span className={styles.detailLabel}>
                                Avg Exit Price
                              </span>
                              <span className={styles.detailValue}>
                                {sym}
                                {avgExitPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
