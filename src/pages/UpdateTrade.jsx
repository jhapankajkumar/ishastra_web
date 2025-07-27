import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./UpdateTrade.module.css";
import PageHeader from "../components/PageHeader";
import { getTradeById, updateTrade, partialExitTrade, addPostAnalysis, fetchExitTactics } from '../api/tradeApi';
import { getCurrentPrice } from '../api/tickerApi';
import { useNotification } from '../components/NotificationProvider';
import ErrorPage from '../components/ErrorPage';

const UpdateTrade = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const showNotification = useNotification();
  
  const [activeTab, setActiveTab] = useState('exit');
  const [loading, setLoading] = useState(true);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [exitTactics, setExitTactics] = useState([]);
  
  const [trade, setTrade] = useState(null);
  const [exitForm, setExitForm] = useState({
    exitDate: new Date().toISOString().split('T')[0], // Default to today
    exitOrderPrice: '',
    exitFilledShares: '',
    exitGrade: '',
    reasonForExit: '',
    exitTactic: '',
    exitCharts: [],
    tradeStatus: 'Closed'
  });
  
  const [postAnalysisForm, setPostAnalysisForm] = useState({
    postTradeAnalysis: '',
    lessonsLearned: '',
    emotionalState: '',
    postTradeFiles: []
  });

  // Get today's date for max date validation
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadInitialData = async () => {
      await loadTradeData();
      await loadExitTactics();
    };
    loadInitialData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTradeData = async () => {
    try {
      setLoading(true);
      const response = await getTradeById(id);
      const tradeData = response.data;
      setTrade(tradeData);
      
      // Pre-fill exit form with existing data
      setExitForm({
        exitDate: formatDateForInput(tradeData.exit_date) || new Date().toISOString().split('T')[0],
        exitOrderPrice: tradeData.exit_order_price || '',
        exitFilledShares: tradeData.exit_filled_shares || '', // Don't pre-fill with remaining quantity
        exitGrade: tradeData.exit_grade || '',
        reasonForExit: tradeData.reason_for_exit || '',
        exitTactic: tradeData.exit_tactic_id || '',
        exitCharts: [],
        tradeStatus: tradeData.trade_status || (tradeData.remaining_quantity === tradeData.quantity ? 'Closed' : 'Partial Closed')
      });
      
      // Pre-fill post analysis form
      setPostAnalysisForm({
        postTradeAnalysis: tradeData.post_trade_analysis || '',
        lessonsLearned: tradeData.lessons_learned || '',
        emotionalState: tradeData.emotional_state || '',
        postTradeFiles: []
      });

      // Fetch current price if exit price is not already set (don't block on failure)
      if (!tradeData.exit_order_price && tradeData.ticker) {
        fetchCurrentPrice(tradeData.ticker).catch(() => {
          // Silently handle price fetch failure - don't block the main flow
          console.log('Price fetch failed, continuing without current price');
        });
      }
      
    } catch (err) {
      console.error('Error loading trade:', err);
      // Only show full-screen error for critical trade loading failures
      if (err.response?.status === 404) {
        setError('Trade not found');
      } else {
        setError('Failed to load trade data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPrice = async (ticker) => {
    try {
      setLoadingPrice(true);
      setPriceError(null);
      const response = await getCurrentPrice(ticker);
      const currentPrice = response.data?.price || response.data?.regularMarketPrice;
      
      if (currentPrice) {
        setExitForm(prev => ({
          ...prev,
          exitOrderPrice: currentPrice.toString()
        }));
        // Only show notification if showNotification is available
        if (typeof showNotification === 'function') {
          showNotification(`Current price loaded: $${currentPrice}`, 'success');
        }
      } else {
        setPriceError('No price data available');
      }
    } catch (err) {
      console.error('Error fetching current price:', err);
      setPriceError('Unable to fetch current price');
      // Don't show error notifications for price fetch failures
      // This is a nice-to-have feature, not critical
    } finally {
      setLoadingPrice(false);
    }
  };

  const loadExitTactics = async () => {
    try {
      const response = await fetchExitTactics();
      setExitTactics(response.data || []);
    } catch (err) {
      console.error('Error loading exit tactics:', err);
      // Don't block the UI for exit tactics failure
      // Just use empty array and let user continue
      setExitTactics([]);
    }
  };

  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return "";
    }
  };

  const handleExitFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setExitForm(prev => ({ ...prev, [name]: Array.from(files) }));
    } else {
      setExitForm(prev => {
        const updated = { ...prev, [name]: value };
        
        // Auto-update trade status based on exit quantity
        if (name === 'exitFilledShares' && value && trade) {
          const exitQty = parseInt(value);
          const remainingQty = trade.remaining_quantity || trade.quantity || 0;
          
          if (exitQty === remainingQty) {
            updated.tradeStatus = 'Closed';
          } else if (exitQty < remainingQty) {
            updated.tradeStatus = 'Partial Closed';
          }
        }
        
        return updated;
      });
    }
  };

  const handlePostAnalysisFormChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setPostAnalysisForm(prev => ({ ...prev, [name]: Array.from(files) }));
    } else {
      setPostAnalysisForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleExitSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const exitQuantity = parseInt(exitForm.exitFilledShares);
      const remainingQuantity = trade.remaining_quantity || trade.quantity;
      const isPartialExit = exitQuantity < remainingQuantity;
      
      // Use the appropriate API based on whether it's a partial exit
      if (isPartialExit) {
        await partialExitTrade(id, {
          ...exitForm,
          exitQuantity: exitQuantity
        });
      } else {
        await updateTrade(id, {
          ...exitForm,
          exitQuantity: exitQuantity
        });
      }
      
      if (typeof showNotification === 'function') {
        const message = isPartialExit 
          ? `Partial exit of ${exitQuantity} shares recorded successfully!`
          : 'Trade completely exited successfully!';
        showNotification(message, 'success');
      }
      
      // Reload trade data to reflect the changes
      await loadTradeData();
      
      // Reset form for potential additional exits
      if (isPartialExit) {
        setExitForm(prev => ({
          ...prev,
          exitOrderPrice: '',
          exitFilledShares: '',
          reasonForExit: '',
          exitTactic: '',
          exitCharts: []
        }));
      } else {
        // If complete exit, navigate based on post-analysis
        if (activeTab === 'exit' && postAnalysisForm.postTradeAnalysis) {
          setActiveTab('analysis');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Error updating trade:', err);
      if (typeof showNotification === 'function') {
        showNotification('Failed to update trade exit. Please try again.', 'error');
      }
      // Don't show full-screen error, just let user retry
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostAnalysisSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await addPostAnalysis(id, postAnalysisForm);
      if (typeof showNotification === 'function') {
        showNotification('Post-trade analysis added successfully!', 'success');
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Error adding post-trade analysis:', err);
      if (typeof showNotification === 'function') {
        showNotification('Failed to add post-trade analysis. Please try again.', 'error');
      }
      // Don't show full-screen error, just let user retry
    } finally {
      setSubmitting(false);
    }
  };

  const removeExitChart = (index) => {
    setExitForm(prev => ({
      ...prev,
      exitCharts: prev.exitCharts.filter((_, i) => i !== index)
    }));
  };

  const removePostFile = (index) => {
    setPostAnalysisForm(prev => ({
      ...prev,
      postTradeFiles: prev.postTradeFiles.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <PageHeader 
          title="Update Trade" 
          showBackButton={true}
          onBackClick={() => navigate('/dashboard')}
        />
        <div className={styles.loading}>Loading trade data...</div>
      </div>
    );
  }

  if (error) {
    return <ErrorPage message={error} />;
  }

  if (!trade) {
    return <ErrorPage message="Trade not found" />;
  }

  // Calculate trade metrics
  const calculatePnL = () => {
    if (!trade.entry_price || !exitForm.exitOrderPrice || !exitForm.exitFilledShares) return 0;
    const entryPrice = parseFloat(trade.entry_price);
    const exitPrice = parseFloat(exitForm.exitOrderPrice);
    const quantity = parseFloat(exitForm.exitFilledShares);
    
    if (isNaN(entryPrice) || isNaN(exitPrice) || isNaN(quantity)) return 0;
    
    const priceDiff = trade.direction?.toLowerCase() === 'long' 
      ? exitPrice - entryPrice 
      : entryPrice - exitPrice;
    return priceDiff * quantity;
  };

  const calculatePercentGain = () => {
    if (!trade.entry_price || !exitForm.exitOrderPrice) return 0;
    const entryPrice = parseFloat(trade.entry_price);
    const exitPrice = parseFloat(exitForm.exitOrderPrice);
    
    if (isNaN(entryPrice) || isNaN(exitPrice) || entryPrice === 0) return 0;
    
    const percentChange = trade.direction?.toLowerCase() === 'long' 
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100;
    return percentChange;
  };

  const calculateHoldingPeriod = () => {
    if (!trade.entry_date || !exitForm.exitDate) return 0;
    const entryDate = new Date(trade.entry_date);
    const exitDate = new Date(exitForm.exitDate);
    
    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return 0;
    
    const diffTime = Math.abs(exitDate - entryDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={styles.container}>
      <PageHeader 
        title={`Update Trade - ${trade.ticker}`} 
        subtitle="Add exit details and post-trade analysis"
        showBackButton={true}
        onBackClick={() => navigate('/dashboard')}
      />

      <div className={styles.formContainer}>
        {/* Trade Summary - Essential Entry Details + Calculated Metrics */}
        <div className={styles.tradeSummary}>
          <h3>🔒 Entry Summary</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Ticker:</span>
              <span className={styles.summaryValue}>{trade.ticker}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Direction:</span>
              <span className={styles.summaryValue}>{trade.direction}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Entry Price:</span>
              <span className={styles.summaryValue}>
                {trade.market === "India" ? "₹" : "$"}{trade.entry_price || 'N/A'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Original Quantity:</span>
              <span className={styles.summaryValue}>{trade.quantity || 'N/A'}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Remaining Quantity:</span>
              <span className={styles.summaryValue}>
                {trade.remaining_quantity || trade.quantity || 'N/A'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Status:</span>
              <span className={`${styles.summaryValue} ${styles.statusValue}`}>
                {trade.trade_status || 'Open'}
              </span>
            </div>
          </div>

          {/* Live Calculated Metrics */}
          {(exitForm.exitOrderPrice || exitForm.exitDate || exitForm.exitFilledShares) && (
            <div className={styles.calculatedMetrics}>
              <h4>📊 Live Calculations (For This Exit)</h4>
              <div className={styles.summaryGrid}>
                {exitForm.exitOrderPrice && exitForm.exitFilledShares && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>P&L Amount:</span>
                    <span className={`${styles.summaryValue} ${calculatePnL() >= 0 ? styles.profitValue : styles.lossValue}`}>
                      {calculatePnL() >= 0 ? '+' : ''}{trade.market === "India" ? "₹" : "$"}{calculatePnL().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {exitForm.exitOrderPrice && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>% Gain/Loss:</span>
                    <span className={`${styles.summaryValue} ${calculatePercentGain() >= 0 ? styles.profitValue : styles.lossValue}`}>
                      {calculatePercentGain() >= 0 ? '+' : ''}{calculatePercentGain().toFixed(2)}%
                    </span>
                  </div>
                )}
                {exitForm.exitDate && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Holding Period:</span>
                    <span className={styles.summaryValue}>
                      {calculateHoldingPeriod()} day{calculateHoldingPeriod() !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {exitForm.exitFilledShares && (
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Remaining After Exit:</span>
                    <span className={styles.summaryValue}>
                      {Math.max(0, (trade.remaining_quantity || trade.quantity || 0) - parseInt(exitForm.exitFilledShares || 0))} shares
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNavigation}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'exit' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('exit')}
          >
            Exit Details
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Post-Analysis
          </button>
        </div>

        {/* Exit Details Tab */}
        {activeTab === 'exit' && (
          <div className={styles.tabContent}>
            <form onSubmit={handleExitSubmit}>
              <div className={styles.cardSection}>
                <h2 className={styles.sectionTitle}>Exit Information</h2>
                
                <div className={styles.gridTwoCol}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Trade Status *</label>
                    <select 
                      name="tradeStatus" 
                      value={exitForm.tradeStatus} 
                      onChange={handleExitFormChange} 
                      className={styles.select}
                      required
                    >
                      {/* Auto-determine status based on exit quantity */}
                      {exitForm.exitFilledShares && parseInt(exitForm.exitFilledShares) === (trade.remaining_quantity || trade.quantity || 0) ? (
                        <option value="Closed">Closed (Exiting all remaining shares)</option>
                      ) : exitForm.exitFilledShares && parseInt(exitForm.exitFilledShares) < (trade.remaining_quantity || trade.quantity || 0) ? (
                        <option value="Partial Closed">Partial Closed (Keeping some shares)</option>
                      ) : (
                        <>
                          <option value="Closed">Closed</option>
                          <option value="Partial Closed">Partial Closed</option>
                        </>
                      )}
                    </select>
                    {exitForm.exitFilledShares && (
                      <div className={styles.statusHint}>
                        {parseInt(exitForm.exitFilledShares) === (trade.remaining_quantity || trade.quantity || 0) 
                          ? '🔒 Closing entire position' 
                          : `📊 Keeping ${Math.max(0, (trade.remaining_quantity || trade.quantity || 0) - parseInt(exitForm.exitFilledShares))} shares open`
                        }
                      </div>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Exit Date *</label>
                    <input
                      type="date"
                      name="exitDate"
                      value={exitForm.exitDate}
                      onChange={handleExitFormChange}
                      min={trade.entry_date ? formatDateForInput(trade.entry_date) : undefined}
                      max={today}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Exit Price ({trade.market === "India" ? "₹" : "$"}) *
                    </label>
                    <div className={styles.priceInputGroup}>
                      <input
                        type="number"
                        step="0.01"
                        name="exitOrderPrice"
                        value={exitForm.exitOrderPrice}
                        onChange={handleExitFormChange}
                        className={styles.input}
                        placeholder="0.00"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => fetchCurrentPrice(trade.ticker)}
                        className={styles.refreshPriceButton}
                        disabled={loadingPrice}
                        title="Fetch current market price"
                      >
                        {loadingPrice ? '⏳' : '🔄'}
                      </button>
                    </div>
                    {priceError && (
                      <div className={styles.priceError}>
                        {priceError}
                      </div>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Exit Quantity * 
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 'normal' }}>
                        (Max: {trade.remaining_quantity || trade.quantity || 0} shares available)
                      </span>
                    </label>
                    <div className={styles.quantityInputGroup}>
                      <input
                        type="number"
                        name="exitFilledShares"
                        value={exitForm.exitFilledShares}
                        onChange={handleExitFormChange}
                        className={styles.input}
                        placeholder={`Max ${trade.remaining_quantity || trade.quantity || 0}`}
                        min="1"
                        max={trade.remaining_quantity || trade.quantity || 0}
                        required
                      />
                      <div className={styles.quantityButtons}>
                        <button
                          type="button"
                          onClick={() => setExitForm(prev => ({ 
                            ...prev, 
                            exitFilledShares: Math.floor((trade.remaining_quantity || trade.quantity || 0) * 0.25).toString() 
                          }))}
                          className={styles.quantityButton}
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => setExitForm(prev => ({ 
                            ...prev, 
                            exitFilledShares: Math.floor((trade.remaining_quantity || trade.quantity || 0) * 0.5).toString() 
                          }))}
                          className={styles.quantityButton}
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setExitForm(prev => ({ 
                            ...prev, 
                            exitFilledShares: (trade.remaining_quantity || trade.quantity || 0).toString() 
                          }))}
                          className={styles.quantityButton}
                        >
                          All
                        </button>
                      </div>
                    </div>
                    {exitForm.exitFilledShares && parseInt(exitForm.exitFilledShares) > (trade.remaining_quantity || trade.quantity || 0) && (
                      <div className={styles.quantityError}>
                        Cannot exit more than {trade.remaining_quantity || trade.quantity || 0} remaining shares
                      </div>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Exit Grade</label>
                    <select 
                      name="exitGrade" 
                      value={exitForm.exitGrade} 
                      onChange={handleExitFormChange} 
                      className={styles.select}
                    >
                      <option value="">Select grade...</option>
                      <option value="A+">A+ (Excellent)</option>
                      <option value="A">A (Good)</option>
                      <option value="B">B (Average)</option>
                      <option value="C">C (Poor)</option>
                      <option value="D">D (Very Poor)</option>
                    </select>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Exit Tactic</label>
                    <select 
                      name="exitTactic" 
                      value={exitForm.exitTactic} 
                      onChange={handleExitFormChange} 
                      className={styles.select}
                    >
                      <option value="">Select exit tactic...</option>
                      {exitTactics.map(tactic => (
                        <option key={tactic.id} value={tactic.id}>
                          {tactic.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Reason for Exit *</label>
                  <textarea
                    name="reasonForExit"
                    value={exitForm.reasonForExit}
                    onChange={handleExitFormChange}
                    className={styles.textarea}
                    rows="4"
                    placeholder="Explain why you exited this trade..."
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Exit Charts (Optional)</label>
                  <input
                    type="file"
                    name="exitCharts"
                    onChange={handleExitFormChange}
                    className={styles.fileInput}
                    multiple
                    accept="image/*"
                  />
                  {exitForm.exitCharts.length > 0 && (
                    <div className={styles.fileList}>
                      {exitForm.exitCharts.map((file, index) => (
                        <div key={index} className={styles.fileItem}>
                          <span>{file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => removeExitChart(index)}
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
                    onClick={() => navigate('/dashboard')}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? 'Updating...' : 'Update Exit Details'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Post-Trade Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className={styles.tabContent}>
            <form onSubmit={handlePostAnalysisSubmit}>
              <div className={styles.cardSection}>
                <h2 className={styles.sectionTitle}>Post-Trade Analysis</h2>
                
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Emotional State During Trade</label>
                  <select 
                    name="emotionalState" 
                    value={postAnalysisForm.emotionalState} 
                    onChange={handlePostAnalysisFormChange} 
                    className={styles.select}
                  >
                    <option value="">Select emotional state...</option>
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
                  <label className={styles.label}>Key Lessons Learned *</label>
                  <textarea
                    name="lessonsLearned"
                    value={postAnalysisForm.lessonsLearned}
                    onChange={handlePostAnalysisFormChange}
                    className={styles.textarea}
                    rows="4"
                    placeholder="What specific lessons did you learn from this trade? What would you do differently?"
                    required
                  />
                </div>
                
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Detailed Analysis (Optional)</label>
                  <textarea
                    name="postTradeAnalysis"
                    value={postAnalysisForm.postTradeAnalysis}
                    onChange={handlePostAnalysisFormChange}
                    className={styles.textarea}
                    rows="6"
                    placeholder="Deep dive analysis: market conditions, setup quality, execution details, what worked, what didn't..."
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Analysis Files (Optional)</label>
                  <input
                    type="file"
                    name="postTradeFiles"
                    onChange={handlePostAnalysisFormChange}
                    className={styles.fileInput}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  {postAnalysisForm.postTradeFiles.length > 0 && (
                    <div className={styles.fileList}>
                      {postAnalysisForm.postTradeFiles.map((file, index) => (
                        <div key={index} className={styles.fileItem}>
                          <span>{file.name}</span>
                          <button 
                            type="button" 
                            onClick={() => removePostFile(index)}
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
                    onClick={() => navigate('/dashboard')}
                    className={styles.cancelButton}
                  >
                    Skip Analysis
                  </button>
                  <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Analysis'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateTrade;
