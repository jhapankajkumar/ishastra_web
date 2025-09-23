import React, { useEffect, useState } from "react";
import ImageGallery from "../../components/ImageGallery";
import styles from "./TradeDetailsPopup.module.css";
import { fetchExitTactics, fetchSetups } from '../../api/firebaseMetaApi';
import { useTheme } from "../../contexts/ThemeContext";
import config from "../../config/environment";

export default function TradeDetailsPopup({ trade, onClose }) {
  const { theme } = useTheme();
  const [exitTactics, setExitTactics] = useState([]);
  const [setups, setSetups] = useState([]);

  // Use embedded transaction data from trade object
  const exitTransactions = trade?.tradeTransactions?.filter(tx => tx.transactionType === 'Exit') || [];

  useEffect(() => {
    fetchExitTactics()
      .then(data => setExitTactics(data))
      .catch(() => setExitTactics([]));
  }, []);

  useEffect(() => {
    fetchSetups()
      .then(data => setSetups(data))
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
    const setup = setups.find(s => s.id === setupId || s.tradeSetupId === setupId);
    return setup ? setup.name : "-";
  };

  const getExitTacticName = (tacticId) => {
    const tactic = exitTactics.find(t => t.id === tacticId || t.tacticId === tacticId);
    return tactic ? tactic.name : "-";
  };

  // Helper functions for partial exit calculations
  const getExitTransactionsSummary = () => {
    if (!exitTransactions.length) return null;

    let totalExitedQty = 0;
    let totalValue = 0;
    let lastExitDate = null;

    exitTransactions.forEach(tx => {
      if (tx.quantity && tx.price) {
        totalExitedQty += Number(tx.quantity);
        totalValue += Number(tx.price) * Number(tx.quantity);

        const txDate = new Date(tx.transactionDate);
        if (!lastExitDate || txDate > lastExitDate) {
          lastExitDate = txDate;
        }
      }
    });

    const avgExitPrice = totalExitedQty > 0 ? totalValue / totalExitedQty : 0;
    
    return {
      totalExitedQty,
      avgExitPrice,
      lastExitDate,
      exitCount: exitTransactions.length
    };
  };

  const getPartialPL = () => {
    if (!exitTransactions.length || !trade.entryPrice || !trade.direction) return "-";

    let totalPL = 0;
    exitTransactions.forEach(tx => {
      if (tx.price !== undefined && tx.quantity !== undefined) {
        const priceDiff = trade.direction.toLowerCase() === 'long'
          ? Number(tx.price) - Number(trade.entryPrice)
          : Number(trade.entryPrice) - Number(tx.price);
        totalPL += priceDiff * Number(tx.quantity);
      }
    });
    
    return totalPL.toFixed(2);
  };

  const getRemainingQuantity = () => {
    return trade.remainingQuantity !== undefined && trade.remainingQuantity !== null
      ? Number(trade.remainingQuantity)
      : Number(trade.quantity || 0);
  };

  const getOriginalQuantity = () => {
    return Number(trade.quantity || 0);
  };

  const getInvested = () => {
    if (trade.entryPrice && trade.quantity) {
      return `$${(Number(trade.entryPrice) * Number(trade.quantity)).toFixed(2)}`;
    }
    return "-";
  };

  const getCurrentValue = () => {
    if (trade.status?.toLowerCase() === 'closed') {
      return `${getCurrencySymbol()}${(Number(trade.exitPrice) * Number(trade.quantity)).toFixed(2)}`;
    } else {
      return `${getCurrencySymbol()}${(Number(trade.currentPrice) * trade.quantity).toFixed(2)}`;
    }
    
  };

  const getCurrencySymbol = () => {
    return trade.currency === "INR" ? "₹" : "$";
  };

  const getPL = () => {
    // If we have partial exits, use partial P&L calculation
    if (exitTransactions.length > 0) {
      const partialPL = getPartialPL();
      return partialPL !== "-" ? `${getCurrencySymbol()}${partialPL}` : "-";
    } else {
      return `${getCurrencySymbol()}${((trade.currentPrice - trade.entryPrice) * trade.quantity).toFixed(2)}`;
    }
    
    // Fallback to original calculation for legacy trades
    if (
      trade.exitPrice !== undefined &&
      trade.exitPrice !== null &&
      trade.entryPrice !== undefined &&
      trade.entryPrice !== null &&
      trade.quantity !== undefined &&
      trade.quantity !== null &&
      trade.direction
    ) {
      const priceDiff = trade.direction.toLowerCase() === 'long'
        ? Number(trade.exitPrice) - Number(trade.entryPrice)
        : Number(trade.entryPrice) - Number(trade.exitPrice);
      const pl = priceDiff * Number(trade.quantity);
      return `$${pl.toFixed(2)}`;
    }
    return "-";
  };

  const entryImages = trade.tradeImages?.filter(img => img.imageType === "entry") || [];
  const exitImages = trade.tradeImages?.filter(img => img.imageType === "exit") || [];
  const postImages = trade.tradeImages?.filter(img => img.imageType === "post") || [];

  // Debug logging for analysis data
  console.log('Trade analysis data:', trade.analysis);
  console.log('Trade object:', trade);

  return (
    <div className={`${styles.overlay} ${theme}`}>
      <div className={styles.popup}>
        <div className={styles.content}>
          {/* Close Button */}
          <button onClick={onClose} className={styles.closeButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m18 6-12 12"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>

          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.tickerBadge}></div>
              <h1 className={styles.tickerTitle}>
                {trade.ticker}
              </h1>
            </div>
            <p className={styles.companyName}>
              Trade Details & Analysis
            </p>
          </div>

          {/* Main Content */}
          <div className={styles.body}>
            {/* Entry Details */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitleAccent}>Entry Details</h3>
              <div className={styles.grid}>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Date</label>
                  <span className={styles.value}>{formatDate(trade.entryDate)}</span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Original Quantity</label>
                  <span className={styles.value}>{getOriginalQuantity().toLocaleString()}</span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Remaining Quantity</label>
                  <span className={styles.value} style={{
                    color: getRemainingQuantity() === 0 ? "var(--status-success)" : "var(--status-warning)"
                  }}>
                    {getRemainingQuantity().toLocaleString()} {getRemainingQuantity() === 0 ? "(Fully Exited)" : "(Partial)"}
                  </span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Average Price</label>
                  <span className={styles.value}>
                    {trade.entryPrice !== undefined && trade.entryPrice !== null ? `${getCurrencySymbol()}${Number(trade.entryPrice).toFixed(2)}` : "-"}
                  </span>
                </div>

                 <div className={styles.fieldItem}>
                  <label className={styles.label}>Current Price</label>
                  <span className={styles.value}>
                    {trade.currentPrice !== undefined && trade.currentPrice !== null ? `${getCurrencySymbol()}${Number(trade.currentPrice).toFixed(2)}` : "-"}
                  </span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Stop Loss</label>
                  <span className={styles.value} style={{
                    color: "var(--status-error)"
                  }}>
                    {getCurrencySymbol()}{trade.stopLoss >= trade.currentPrice ? (trade.stopLoss).toLocaleString(undefined, { maximumFractionDigits: 2 }) : (trade.stopLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}{trade.stopLoss >= trade.entryPrice ? ' ^' : ''}
                  </span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Target 1</label>
                  <span className={styles.value} style={{
                    color: "var(--status-success)"
                  }}>
                    {trade.target1 !== undefined && trade.target1 !== null ? `${getCurrencySymbol()}${Number(trade.target1).toFixed(2)}` : "-"}
                  </span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Target 2</label>
                  <span className={styles.value} style={{
                    color: "var(--status-success)"
                  }}>
                    {trade.target2 !== undefined && trade.target2 !== null ? `${getCurrencySymbol()}${Number(trade.target2).toFixed(2)}` : "-"}
                  </span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Target 3</label>
                  <span className={styles.value} style={{
                    color: "var(--status-success)"
                  }}>
                    {trade.target3 !== undefined && trade.target3 !== null ? `${getCurrencySymbol()}${Number(trade.target3).toFixed(2)}` : "-"}
                  </span>
                </div>
              </div>
              
              <div className={styles.gridFinancial}>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Total Invested</label>
                  <span className={styles.valueFinancial}>{getInvested()}</span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Total Value</label>
                  <span className={styles.valueFinancial}>{getCurrentValue()}</span>
                </div>
                <div className={styles.fieldItem}>
                  <label className={styles.label}>Profit & Loss</label>
                  <span className={styles.valueFinancial} style={{
                    color: getPL() === "-" ? "var(--text-muted)" : getPL().includes("-") ? "var(--status-error)" : "var(--status-success)"
                  }}>
                    {getPL()}
                  </span>
                </div>
              </div>
            </div>

            {/* Entry Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Entry Analysis</h3>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Reason for Entry</label>
                <div className={styles.textareaField}>
                  {trade.reasonForEntry || "No reason provided"}
                </div>
              </div>
            </div>

            {/* Entry Charts */}
            {entryImages.length > 0 && (
              <div className={styles.section}>
                <h4 className={styles.sectionSubtitle}>Entry Charts</h4>
                <ImageGallery
                  images={entryImages.map(img => ({
                    src: config.getImageUrl(img.imageUrl || img.filePath),
                    alt: "Entry Chart"
                  }))}
                  maxHeight={220}
                />
              </div>
            )}

            {/* Exit Section - Enhanced for Partial Exits */}
            {(exitTransactions.length > 0 || trade.exitDate || trade.exitPrice) && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitleAccent}>
                  Exit Details {exitTransactions.length > 1 && `(${exitTransactions.length} Partial Exits)`}
                </h3>
                
                {/* Exit Summary */}
                {(() => {
                  const summary = getExitTransactionsSummary();
                  if (summary) {
                    return (
                      <div className={styles.grid}>
                        <div className={styles.fieldItem}>
                          <label className={styles.label}>Total Exited Qty</label>
                          <span className={styles.value}>{summary.totalExitedQty.toLocaleString()}</span>
                        </div>
                        <div className={styles.fieldItem}>
                          <label className={styles.label}>Avg Exit Price</label>
                          <span className={styles.value}>${summary.avgExitPrice.toFixed(2)}</span>
                        </div>
                        <div className={styles.fieldItem}>
                          <label className={styles.label}>Last Exit Date</label>
                          <span className={styles.value}>{formatDate(summary.lastExitDate)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Individual Exit Transactions */}
                {exitTransactions.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 className={styles.sectionSubtitle}>
                      Exit Transactions
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {exitTransactions.map((tx, index) => (
                        <div key={index} style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-secondary)',
                          borderRadius: 8,
                          padding: 16,
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: 12
                        }}>
                          <div>
                            <label className={styles.label}>Date</label>
                            <span className={styles.value}>{formatDate(tx.transactionDate)}</span>
                          </div>
                          <div>
                            <label className={styles.label}>Quantity</label>
                            <span className={styles.value}>{Number(tx.quantity || 0).toLocaleString()}</span>
                          </div>
                          <div>
                            <label className={styles.label}>Price</label>
                            <span className={styles.value}>${Number(tx.price || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <label className={styles.label}>P&L</label>
                            <span className={styles.value} style={{
                              color: trade.direction?.toLowerCase() === 'long' 
                                ? (Number(tx.price || 0) >= Number(trade.entryPrice || 0) ? 'var(--status-success)' : 'var(--status-error)')
                                : (Number(tx.price || 0) <= Number(trade.entryPrice || 0) ? 'var(--status-success)' : 'var(--status-error)')
                            }}>
                              ${trade.direction && trade.entryPrice ? (
                                trade.direction.toLowerCase() === 'long'
                                  ? ((Number(tx.price || 0) - Number(trade.entryPrice)) * Number(tx.quantity || 0)).toFixed(2)
                                  : ((Number(trade.entryPrice) - Number(tx.price || 0)) * Number(tx.quantity || 0)).toFixed(2)
                              ) : '0.00'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legacy Exit Data (for backward compatibility) */}
                {!exitTransactions.length && (trade.exitDate || trade.exitPrice) && (
                  <div className={styles.grid}>
                    <div className={styles.fieldItem}>
                      <label className={styles.label}>Date</label>
                      <span className={styles.value}>{formatDate(trade.exitDate)}</span>
                    </div>
                    <div className={styles.fieldItem}>
                      <label className={styles.label}>Average Price</label>
                      <span className={styles.value}>
                        {trade.exitPrice !== undefined && trade.exitPrice !== null ? `${getCurrencySymbol()}${Number(trade.exitPrice).toFixed(2)}` : "-"}
                      </span>
                    </div>
                    <div className={styles.fieldItem}>
                      <label className={styles.label}>Exit Tactic</label>
                      <span className={styles.value}>{getExitTacticName(trade.exitTacticId)}</span>
                    </div>
                  </div>
                )}

                {trade.reasonForExit && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Reason for Exit</label>
                    <div className={styles.textareaField}>
                      {trade.reasonForExit || "No reason provided"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Exit Charts */}
            {exitImages.length > 0 && (
              <div className={styles.section}>
                <h4 className={styles.sectionSubtitle}>Exit Charts</h4>
                <ImageGallery
                  images={exitImages.map(img => ({
                    src: config.getImageUrl(img.imageUrl || img.filePath),
                    alt: "Exit Chart"
                  }))}
                  maxHeight={220}
                />
              </div>
            )}

            {/* Exit Strategy Analysis - Only for Open Trades */}
            {trade.status?.toLowerCase() === 'open' && trade.impulseAnalysis && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitleAccent}>Exit Strategy Analysis</h3>
                
                {/* Impulse Analysis Card */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--bg-accent) 0%, var(--bg-secondary) 100%)',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20
                }}>
                  {/* Impulse Header */}
                  {/* Impulse Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    
                    <h4 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      textTransform: 'uppercase'
                    }}>
                      Impulse Color: {trade.impulseAnalysis.impulseColor || 'Unknown'}
                    </h4>
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: trade.impulseAnalysis.impulseColor === 'red' ? '#EF4444' : 
                                      trade.impulseAnalysis.impulseColor === 'blue' ? '#3B82F6' : 
                                      trade.impulseAnalysis.impulseColor === 'green' ? '#10B981' :
                                      'var(--text-muted)',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}></div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                      backgroundColor: trade.impulseAnalysis.exitRecommended ? '#EF4444' : '#10B981',
                      padding: '6px 12px',
                      borderRadius: 6,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Exit: {trade.impulseAnalysis.exitRecommended ? 'YES' : 'NO'}
                    </span>
                  </div>                  {/* Analysis Reasoning */}
                  {trade.impulseAnalysis.reasoning && trade.impulseAnalysis.reasoning.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h5 style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--text-secondary)'
                      }}>
                        Analysis Points:
                      </h5>
                      <ul style={{
                        margin: 0,
                        paddingLeft: 20,
                        color: 'var(--text-primary)'
                      }}>
                        {trade.impulseAnalysis.reasoning.map((point, index) => (
                          <li key={index} style={{ marginBottom: 4, fontSize: '14px' }}>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Technical Data */}
                  {trade.impulseAnalysis.technicalData && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 12,
                      marginTop: 16,
                      padding: 16,
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: 8,
                      border: '1px solid var(--border-primary)'
                    }}>
                      {Object.entries(trade.impulseAnalysis.technicalData).map(([key, value]) => (
                        <div key={key}>
                          <label className={styles.label} style={{ textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <span className={styles.value}>
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Analysis & Action Items - Always show if analysis exists */}
            {(trade.analysis || trade.status === "Partial Closed") && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitleAccent}>AI Analysis & Action Items</h3>
                
                {/* Show message if no analysis data */}
                {!trade.analysis && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 8,
                    padding: 20,
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    No AI analysis data available for this trade.
                  </div>
                )}

                {/* Analysis Summary Card */}
                {trade.analysis && (
                  <div style={{
                    background: 'linear-gradient(135deg, var(--bg-accent) 0%, var(--bg-secondary) 100%)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 20,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {/* Status Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                      <div style={{
                        fontSize: '32px',
                        lineHeight: 1
                      }}>
                        {trade.analysis.statusEmoji || '📊'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '20px',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {trade.analysis.status || 'Analysis'}
                        </h4>
                        {trade.analysis.priority && (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#ffffff',
                            backgroundColor: trade.analysis.priority === 'HIGH' ? '#EF4444' : 
                                            trade.analysis.priority === 'MEDIUM' ? '#F59E0B' : '#10B981',
                            padding: '4px 8px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            marginTop: 4,
                            display: 'inline-block'
                          }}>
                            {trade.analysis.priority} Priority
                          </span>
                        )}
                      </div>
                      {trade.analysis.riskEmoji && (
                        <div style={{
                          fontSize: '24px',
                          title: `Risk Level: ${trade.analysis.riskLevel || 'Unknown'}`
                        }}>
                          {trade.analysis.riskEmoji}
                        </div>
                      )}
                    </div>

                    {/* Action & Performance */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: 16,
                      marginBottom: 20
                    }}>
                      {trade.analysis.action && (
                        <div style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 8,
                          padding: 16
                        }}>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'block',
                            marginBottom: 8
                          }}>
                            Recommended Action
                          </label>
                          <span style={{
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            fontWeight: '500'
                          }}>
                            {trade.analysis.action}
                          </span>
                        </div>
                      )}

                      {(trade.analysis.profit || trade.analysis.profitPercent) && (
                        <div style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 8,
                          padding: 16
                        }}>
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'block',
                            marginBottom: 8
                          }}>
                            Performance
                          </label>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {trade.analysis.profit && (
                              <span style={{
                                fontSize: '16px',
                                fontWeight: '700',
                                color: trade.analysis.profit.includes('+') ? 'var(--status-success)' : 'var(--status-error)'
                              }}>
                                {trade.analysis.profit}
                              </span>
                            )}
                            {trade.analysis.profitPercent && (
                              <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--text-secondary)'
                              }}>
                                ({trade.analysis.profitPercent})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: 12,
                      marginBottom: 16
                    }}>
                      {trade.analysis.aiGrade && (
                        <div>
                          <label className={styles.label}>AI Grade</label>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'var(--text-primary)'
                          }}>
                            {trade.analysis.aiGrade}
                          </span>
                        </div>
                      )}
                      {trade.analysis.healthScore && (
                        <div>
                          <label className={styles.label}>Health Score</label>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'var(--text-primary)'
                          }}>
                            {trade.analysis.healthScore}
                          </span>
                        </div>
                      )}
                      {trade.analysis.daysHeld && (
                        <div>
                          <label className={styles.label}>Days Held</label>
                          <span className={styles.value}>{trade.analysis.daysHeld}</span>
                        </div>
                      )}
                      {trade.analysis.reviewBy && (
                        <div>
                          <label className={styles.label}>Review By</label>
                          <span className={styles.value}>{formatDate(trade.analysis.reviewBy)}</span>
                        </div>
                      )}
                    </div>

                    {/* Next Action Section */}
                    {trade.analysis.nextAction && (
                      <div style={{
                        background: 'var(--bg-primary)',
                        border: '2px solid var(--border-accent)',
                        borderRadius: 8,
                        padding: 16,
                        marginTop: 16
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'var(--text-accent)'
                          }}>
                            🎯 Next Action: {trade.analysis.nextAction.action || 'Monitor'}
                          </span>
                          {trade.analysis.nextAction.urgency && (
                            <span style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#ffffff',
                              backgroundColor: 'var(--status-warning)',
                              padding: '4px 8px',
                              borderRadius: 4
                            }}>
                              {trade.analysis.nextAction.urgency}
                            </span>
                          )}
                        </div>
                        {trade.analysis.nextAction.details && (
                          <p style={{
                            margin: 0,
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            lineHeight: 1.4
                          }}>
                            {trade.analysis.nextAction.details}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Key Level & Reason */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16,
                      marginTop: 16
                    }}>
                      {trade.analysis.keyLevel && (
                        <div>
                          <label className={styles.label}>Key Level</label>
                          <span style={{
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            fontWeight: '500'
                          }}>
                            {trade.analysis.keyLevel}
                          </span>
                        </div>
                      )}
                      {trade.analysis.reason && (
                        <div>
                          <label className={styles.label}>Analysis Reason</label>
                          <span style={{
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            fontWeight: '500'
                          }}>
                            {trade.analysis.reason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Post Trade Analysis */}
            {(trade.postTradeAnalysis || trade.lessonLearned || trade.emotionalState || postImages.length > 0) && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitleAccent}>Post Trade Analysis</h3>

                {trade.postTradeAnalysis && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Analysis Notes</label>
                    <div className={styles.textareaField}>
                      {trade.postTradeAnalysis}
                    </div>
                  </div>
                )}

                {trade.lessonLearned && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Lessons Learned</label>
                    <div className={styles.textareaField}>
                      {trade.lessonLearned}
                    </div>
                  </div>
                )}

                {trade.emotionalState && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Emotional State</label>
                    <div className={styles.textareaField}>
                      {trade.emotionalState}
                    </div>
                  </div>
                )}

                {/* Post Trade Files */}
                {postImages.length > 0 && (
                  <div>
                    <h4 className={styles.sectionSubtitle}>Post Trade Files</h4>
                    <ImageGallery
                      images={postImages.map(img => ({
                        src: config.getImageUrl(img.imageUrl || img.filePath),
                        alt: "Post Trade"
                      }))}
                      maxHeight={220}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
