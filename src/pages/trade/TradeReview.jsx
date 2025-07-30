import React, { useState, useEffect } from "react";
import ImageGallery from "../../components/ImageGallery";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./TradeReview.module.css";
import PageHeader from "../../components/PageHeader";
import { getTradeById, addPostAnalysis, getTradeTransactions } from '../../api/tradeApi';
import { useNotification } from '../../components/NotificationProvider';
import ErrorPage from '../../components/ErrorPage';

const TradeReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [trade, setTrade] = useState(null);
  const [exitTransactions, setExitTransactions] = useState([]);
  
  const [reviewForm, setReviewForm] = useState({
    postTradeAnalysis: '',
    lessonLearned: '',
    emotionalState: '',
    reviewCharts: []
  });

  const handleReviewFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setReviewForm(prev => ({ ...prev, [name]: Array.from(files) }));
    } else {
      setReviewForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const removeReviewChart = (index) => {
    setReviewForm(prev => ({
      ...prev,
      reviewCharts: prev.reviewCharts.filter((_, i) => i !== index)
    }));
  };
  useEffect(() => {
    loadTradeData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTradeData = async () => {
    try {
      setLoading(true);
      const response = await getTradeById(id);
      const tradeData = response.data;
      setTrade(tradeData);
      
      // Load exit transactions for P&L calculation
      const txRes = await getTradeTransactions(id);
      const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
      setExitTransactions(exitTx);
      
      // Pre-fill review form
      setReviewForm({
        postTradeAnalysis: tradeData.postTradeAnalysis || '',
        lessonLearned: tradeData.lessonLearned || '',
        emotionalState: tradeData.emotionalState || '',
        reviewCharts: tradeData.reviewCharts || []
      });
      
    } catch (err) {
      console.error('Error loading trade:', err);
      setError(err.response?.status === 404 ? "Trade not found." : "Unable to load trade data.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate total P&L from all exit transactions
  const getTotalPL = () => {
    if (!exitTransactions.length || !trade?.entryPrice) return 0;

    let totalPL = 0;
    exitTransactions.forEach(tx => {
      if (tx.price && tx.quantity) {
        const priceDiff = trade.direction?.toLowerCase() === 'long'
          ? Number(tx.price) - Number(trade.entryPrice)
          : Number(trade.entryPrice) - Number(tx.price);
        totalPL += priceDiff * Number(tx.quantity);
      }
    });
    return totalPL;
  };

  // Calculate average exit price
  const getAvgExitPrice = () => {
    if (!exitTransactions.length) return 0;
    let totalValue = 0;
    let totalQty = 0;
    
    exitTransactions.forEach(tx => {
      if (tx.price && tx.quantity) {
        totalValue += Number(tx.price) * Number(tx.quantity);
        totalQty += Number(tx.quantity);
      }
    });
    
    return totalQty > 0 ? totalValue / totalQty : 0;
  };

  const getPercentGain = () => {
    const avgExit = getAvgExitPrice();
    const entryPrice = Number(trade?.entryPrice || 0);
    
    if (!avgExit || !entryPrice) return 0;
    
    return trade.direction?.toLowerCase() === 'long' 
      ? ((avgExit - entryPrice) / entryPrice) * 100
      : ((entryPrice - avgExit) / entryPrice) * 100;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addPostAnalysis(id, reviewForm);
      if (typeof showNotification === 'function') {
        showNotification('Trade review saved successfully!', 'success');
      } else {
        console.warn('showNotification is not available');
      }
      navigate('/');
    } catch (err) {
      console.error('Error saving review:', err);
      if (typeof showNotification === 'function') {
        showNotification('Failed to save review. Please try again.', 'error');
      } else {
        console.warn('showNotification is not available');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setReviewForm(prev => ({ ...prev, [name]: value }));
  };

  // Prepare images for gallery
  const entryImages = trade?.tradeImages?.filter(img => img.imageType === "entry") || [];
  const exitImages = trade?.tradeImages?.filter(img => img.imageType === "exit") || [];
  const postImages = trade?.tradeImages?.filter(img => img.imageType === "post") || [];

  if (loading) {
    return (
      <div className={styles.container}>
        <PageHeader title="Trade Review" showBackButton onBackClick={() => navigate('/')} />
        <div className={styles.loading}>Loading trade data...</div>
      </div>
    );
  }

  if (error) return <ErrorPage message={error} />;
  if (!trade) return <ErrorPage message="Trade not found" />;

  const totalPL = getTotalPL();
  const percentGain = getPercentGain();
  const isProfit = totalPL >= 0;
  return (
    <div className={styles.container}>
      <PageHeader 
        title={`Trade Review - ${trade.ticker}`} 
        subtitle="Analyze your completed trade performance"
        showBackButton 
        onBackClick={() => navigate('/')} 
      />

      <div className={styles.formContainer}>
        {/* Entry Charts Gallery */}
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
            <ImageGallery
              images={entryImages.map((img, idx) => ({
                src: `http://localhost:8000/${img.imageUrl || img.filePath}`,
                alt: `Entry Chart ${idx + 1}`
              }))}
              maxHeight={180}
            />
          </div>
        )}
        {/* Exit Charts Gallery */}
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
            <ImageGallery
              images={exitImages.map((img, idx) => ({
                src: `http://localhost:8000/${img.imageUrl || img.filePath}`,
                alt: `Exit Chart ${idx + 1}`
              }))}
              maxHeight={180}
            />
          </div>
        )}
        {/* Post Trade Files Gallery */}
        {postImages.length > 0 && (
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
              Post Trade Files
            </h4>
            <ImageGallery
              images={postImages.map((img, idx) => ({
                src: `http://localhost:8000/${img.imageUrl || img.filePath}`,
                alt: `Post Trade ${idx + 1}`
              }))}
              maxHeight={180}
            />
          </div>
        )}
        {/* Performance Summary Cards */}
        <div className={styles.performanceCards}>
          <div className={`${styles.perfCard} ${isProfit ? styles.profitCard : styles.lossCard}`}>
            <div className={styles.perfIcon}>{isProfit ? '📈' : '📉'}</div>
            <div className={styles.perfValue}>
              {isProfit ? '+' : ''}{trade.market === "India" ? "₹" : "$"}{Math.abs(totalPL).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className={styles.perfLabel}>Total P&L</div>
          </div>
          
          <div className={`${styles.perfCard} ${isProfit ? styles.profitCard : styles.lossCard}`}>
            <div className={styles.perfIcon}>%</div>
            <div className={styles.perfValue}>
              {percentGain >= 0 ? '+' : ''}{percentGain.toFixed(2)}%
            </div>
            <div className={styles.perfLabel}>Return</div>
          </div>

          <div className={styles.perfCard}>
            <div className={styles.perfIcon}>📅</div>
            <div className={styles.perfValue}>
              {trade.entryDate && exitTransactions.length ? 
                Math.ceil((new Date(exitTransactions[exitTransactions.length - 1]?.transactionDate) - new Date(trade.entryDate)) / (1000 * 60 * 60 * 24)) : 0}
            </div>
            <div className={styles.perfLabel}>Days Held</div>
          </div>

          <div className={styles.perfCard}>
            <div className={styles.perfIcon}>🎯</div>
            <div className={styles.perfValue}>{trade.exitGrade || 'N/A'}</div>
            <div className={styles.perfLabel}>Exit Grade</div>
          </div>
        </div>

        {/* Entry & Exit Details */}
        <div className={styles.tradeDetails}>
          <div className={styles.detailsGrid}>
            {/* Entry Summary */}
            <div className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>📈</div>
                <h3 className={styles.cardTitle}>Entry Details</h3>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.performanceGrid}>
                  {/* Entry Date */}
                  <div className={styles.performanceMetric}>
                    <div className={styles.metricIcon}>📅</div>
                    <div className={styles.metricInfo}>
                      <div className={styles.metricLabel}>Entry Date</div>
                      <div className={styles.metricValue}>
                        {trade.entryDate ? new Date(trade.entryDate).toLocaleDateString('en-US', { 
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                        }) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Entry Price */}
                  <div className={styles.performanceMetric}>
                    <div className={styles.metricIcon}>💰</div>
                    <div className={styles.metricInfo}>
                      <div className={styles.metricLabel}>Entry Price</div>
                      <div className={styles.metricValue}>
                        {trade.market === "India" ? "₹" : "$"}{Number(trade.entryPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className={styles.performanceMetric}>
                    <div className={styles.metricIcon}>📊</div>
                    <div className={styles.metricInfo}>
                      <div className={styles.metricLabel}>Quantity</div>
                      <div className={styles.metricValue}>{trade.quantity?.toLocaleString() || 'N/A'} shares</div>
                    </div>
                  </div>

                  {/* Direction */}
                  <div className={styles.performanceMetric}>
                    <div className={`${styles.metricIcon} ${trade.direction?.toLowerCase() === 'long' ? styles.profitIcon : styles.lossIcon}`}>
                      {trade.direction?.toLowerCase() === 'long' ? '📈' : '📉'}
                    </div>
                    <div className={styles.metricInfo}>
                      <div className={styles.metricLabel}>Direction</div>
                      <div className={styles.metricValue}>
                        <span className={`${styles.directionBadge} ${trade.direction?.toLowerCase() === 'long' ? styles.longBadge : styles.shortBadge}`}>
                          {trade.direction?.toLowerCase() === 'long' ? 'LONG' : 'SHORT'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Setup Type */}
                  <div className={styles.performanceMetric}>
                    <div className={styles.metricIcon}>⚡</div>
                    <div className={styles.metricInfo}>
                      <div className={styles.metricLabel}>Setup Type</div>
                      <div className={styles.metricValue}>
                        <span className={styles.setupBadge}>{trade.setupType || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Entry Reason */}
                  <div className={styles.performanceMetric}>
                    <div className={styles.metricIcon}>💭</div>
                    <div className={styles.metricInfo}>
                      <div className={styles.metricLabel}>Entry Reason</div>
                      <div className={styles.metricValue}>{trade.reasonForEntry || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exit Summary */}
            <div className={styles.detailCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>📉</div>
                <h3 className={styles.cardTitle}>Exit Details</h3>
              </div>
              <div className={styles.cardContent}>
                {exitTransactions.length > 0 ? (
                  <div className={styles.performanceGrid}>
                    {/* Last Exit Date */}
                    <div className={styles.performanceMetric}>
                      <div className={styles.metricIcon}>📅</div>
                      <div className={styles.metricInfo}>
                        <div className={styles.metricLabel}>Last Exit Date</div>
                        <div className={styles.metricValue}>
                          {exitTransactions[exitTransactions.length - 1]?.transactionDate ? 
                            new Date(exitTransactions[exitTransactions.length - 1].transactionDate).toLocaleDateString('en-US', { 
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                            }) : 'N/A'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Average Exit Price */}
                    <div className={styles.performanceMetric}>
                      <div className={styles.metricIcon}>💰</div>
                      <div className={styles.metricInfo}>
                        <div className={styles.metricLabel}>Avg Exit Price</div>
                        <div className={styles.metricValue}>
                          {trade.market === "India" ? "₹" : "$"}{getAvgExitPrice().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Total Sold */}
                    <div className={styles.performanceMetric}>
                      <div className={styles.metricIcon}>📊</div>
                      <div className={styles.metricInfo}>
                        <div className={styles.metricLabel}>Total Sold</div>
                        <div className={styles.metricValue}>
                          {exitTransactions.reduce((sum, tx) => sum + (Number(tx.quantity) || 0), 0).toLocaleString()} shares
                        </div>
                      </div>
                    </div>

                    {/* Exit Strategy */}
                    <div className={styles.performanceMetric}>
                      <div className={styles.metricIcon}>🎯</div>
                      <div className={styles.metricInfo}>
                        <div className={styles.metricLabel}>Exit Strategy</div>
                        <div className={styles.metricValue}>
                          <span className={styles.strategyBadge}>
                            {exitTransactions.length === 1 ? 'Single Exit' : `${exitTransactions.length} Partial Exits`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Exit Grade */}
                    <div className={styles.performanceMetric}>
                      <div className={`${styles.metricIcon} ${
                        trade.exitGrade === 'A' ? styles.profitIcon : 
                        trade.exitGrade === 'B' ? styles.metricIcon : 
                        trade.exitGrade === 'C' ? styles.metricIcon : 
                        styles.lossIcon
                      }`}>
                        ⭐
                      </div>
                      <div className={styles.metricInfo}>
                        <div className={styles.metricLabel}>Exit Grade</div>
                        <div className={styles.metricValue}>
                          <span className={`${styles.gradeBadge} ${styles[`grade${trade.exitGrade}`]}`}>
                            {trade.exitGrade || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Exit Reason */}
                    <div className={styles.performanceMetric}>
                      <div className={styles.metricIcon}>💭</div>
                      <div className={styles.metricInfo}>
                        <div className={styles.metricLabel}>Exit Reason</div>
                        <div className={styles.metricValue}>{trade.reasonForExit || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.noExitData}>
                    <div className={styles.noExitIcon}>📭</div>
                    <div className={styles.noExitText}>No exit transactions found</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Performance Summary */}
        <div className={styles.performanceCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>📊</div>
            <h3 className={styles.cardTitle}>Trade Performance Summary</h3>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.performanceGrid}>
              {/* Investment Details */}
              <div className={styles.performanceMetric}>
                <div className={styles.metricIcon}>💰</div>
                <div className={styles.metricInfo}>
                  <div className={styles.metricLabel}>Total Invested</div>
                  <div className={styles.metricValue}>
                    {trade.market === "India" ? "₹" : "$"}{(Number(trade.entryPrice || 0) * Number(trade.quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Profit/Loss */}
              <div className={styles.performanceMetric}>
                <div className={`${styles.metricIcon} ${totalPL >= 0 ? styles.profitIcon : styles.lossIcon}`}>
                  {totalPL >= 0 ? '📈' : '📉'}
                </div>
                <div className={styles.metricInfo}>
                  <div className={styles.metricLabel}>Total P&L</div>
                  <div className={`${styles.metricValue} ${totalPL >= 0 ? styles.profitText : styles.lossText}`}>
                    {totalPL >= 0 ? '+' : ''}{trade.market === "India" ? "₹" : "$"}{Math.abs(totalPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Return Percentage */}
              <div className={styles.performanceMetric}>
                <div className={`${styles.metricIcon} ${percentGain >= 0 ? styles.profitIcon : styles.lossIcon}`}>
                  {percentGain >= 0 ? '📊' : '📉'}
                </div>
                <div className={styles.metricInfo}>
                  <div className={styles.metricLabel}>Return %</div>
                  <div className={`${styles.metricValue} ${percentGain >= 0 ? styles.profitText : styles.lossText}`}>
                    {percentGain >= 0 ? '+' : ''}{percentGain.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Holding Period */}
              <div className={styles.performanceMetric}>
                <div className={styles.metricIcon}>📅</div>
                <div className={styles.metricInfo}>
                  <div className={styles.metricLabel}>Holding Period</div>
                  <div className={styles.metricValue}>
                    {trade.entryDate && exitTransactions.length ? 
                      Math.ceil((new Date(exitTransactions[exitTransactions.length - 1]?.transactionDate) - new Date(trade.entryDate)) / (1000 * 60 * 60 * 24)) : 0
                    } days
                  </div>
                </div>
              </div>

              {/* Average Exit Price */}
              <div className={styles.performanceMetric}>
                <div className={styles.metricIcon}>🎯</div>
                <div className={styles.metricInfo}>
                  <div className={styles.metricLabel}>Avg Exit Price</div>
                  <div className={styles.metricValue}>
                    {trade.market === "India" ? "₹" : "$"}{getAvgExitPrice().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Total Shares Sold */}
              <div className={styles.performanceMetric}>
                <div className={styles.metricIcon}>📋</div>
                <div className={styles.metricInfo}>
                  <div className={styles.metricLabel}>Shares Sold</div>
                  <div className={styles.metricValue}>
                    {exitTransactions.reduce((sum, tx) => sum + (Number(tx.quantity) || 0), 0).toLocaleString()} / {trade.quantity?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary Bar */}
            <div className={styles.performanceSummaryBar}>
              <div className={styles.summaryBarHeader}>
                <span className={styles.summaryTitle}>📈 Trade Outcome</span>
                <span className={`${styles.summaryOutcome} ${totalPL >= 0 ? styles.profitOutcome : styles.lossOutcome}`}>
                  {totalPL >= 0 ? '🎉 PROFITABLE TRADE' : '📉 LOSS TRADE'}
                </span>
              </div>
              <div className={styles.summaryBarContent}>
                <div className={styles.summaryStats}>
                  <span className={styles.summaryStatItem}>
                    <strong>Entry:</strong> {trade.market === "India" ? "₹" : "$"}{Number(trade.entryPrice || 0).toFixed(2)}
                  </span>
                  <span className={styles.summaryStatItem}>
                    <strong>Exit:</strong> {trade.market === "India" ? "₹" : "$"}{getAvgExitPrice().toFixed(2)}
                  </span>
                  <span className={styles.summaryStatItem}>
                    <strong>Difference:</strong> 
                    <span className={`${totalPL >= 0 ? styles.profitText : styles.lossText}`}>
                      {trade.market === "India" ? "₹" : "$"}{Math.abs(getAvgExitPrice() - Number(trade.entryPrice || 0)).toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Review Form */}
        <form onSubmit={handleSubmit} className={styles.reviewForm}>
          <div className={styles.formSection}>
            <h3>📝 Trade Review</h3>
            
            <div className={styles.fieldGroup}>
              <label className={styles.label}>How did you feel during this trade?</label>
              <select 
                name="emotionalState" 
                value={reviewForm.emotionalState} 
                onChange={handleChange} 
                className={styles.select}
              >
                <option value="">Select...</option>
                <option value="Calm">😌 Calm & Composed</option>
                <option value="Confident">😎 Confident</option>
                <option value="Anxious">😰 Anxious</option>
                <option value="Fearful">😨 Fearful</option>
                <option value="Greedy">🤑 Greedy</option>
                <option value="Impatient">😤 Impatient</option>
                <option value="Euphoric">🤩 Euphoric</option>
                <option value="Frustrated">😠 Frustrated</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Key lessons learned from this trade *</label>
              <textarea
                name="lessonLearned"
                value={reviewForm.lessonLearned}
                onChange={handleChange}
                className={styles.textarea}
                rows="4"
                placeholder="What did you learn? What would you do differently?"
                required
              />
            </div>
            
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Additional analysis (optional)</label>
              <textarea
                name="postTradeAnalysis"
                value={reviewForm.postTradeAnalysis}
                onChange={handleChange}
                className={styles.textarea}
                rows="5"
                placeholder="Market conditions, setup quality, execution details, future improvements..."
              />
            </div>
            <div className={styles.fieldGroup}>
                              <label className={styles.label}>Review Charts (Optional)</label>
                              <input
                                type="file"
                                name="reviewCharts"
                                onChange={handleReviewFormChange}
                                className={styles.fileInput}
                                multiple
                                accept="image/*"
                              />
                              {reviewForm.reviewCharts.length > 0 && (
                                <div className={styles.fileList}>
                                  {reviewForm.reviewCharts.map((file, index) => (
                                    <div key={index} className={styles.fileItem}>
                                      <span>{file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeReviewChart(index)}
                                        className={styles.removeFileButton}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

            <div className={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={() => navigate('/')}
                className={styles.skipButton}
              >
                Skip Review
              </button>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Complete Review'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeReview;
