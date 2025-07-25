import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./TradeLog.module.css";
import PageHeader from "../components/PageHeader";
import TickerSearch from "../components/TickerSearch";
import { createTrade, updateTrade, addPostAnalysis, fetchExitTactics, fetchSetups } from '../api/tradeApi';
import { useNotification } from '../components/NotificationProvider';
import ErrorPage from '../components/ErrorPage';
import { getTickerBySymbol } from '../data/tickerData';

const initialState = {
  tradeId: "",
  ticker: "",
  companyName: "",
  symbol: "",
  instrumentType: "Stocks",
  market: "India",
  positionType: "Swing",
  direction: "Long", // Default to Long (capitalized to match backend)
  reasonForEntry: "",
  entryCharts: [],
  entryDate: "",
  entryOrderPrice: "",
  entryFilledShares: "",
  exitDate: "",
  exitOrderPrice: "",
  exitFilledShares: "",
  reasonForExit: "",
  exitTactic: "",
  exitCharts: [],
  postTradeAnalysis: "",
  postTradeFiles: [],
  setupType: "",
  timeframesUsed: [],
  riskPerTrade: "",
  stopLossPrice: "",
  stopLossMethod: "",
  target1: "",
  target2: "",
  target3: "",
  atrValue: "",
  setupConfidence: "",
  exitEmotionalState: "",
  exitMistake: false,
  exitMistakeNotes: "",
  exitLessons: "",
  exitConfidence: "",
  exitNotes: "",
  tradeStatus: "Planned"
};

function mapTradeDataToForm(tradeData) {
  // Use trade_setup_id directly since that's what we store and what the dropdown uses
  const setupValue = tradeData.trade_setup_id || "";
  
  // Helper function to safely format dates for input[type="date"]
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      
      // Return date in YYYY-MM-DD format required by input[type="date"]
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return "";
    }
  };
  
  return {
    ...initialState,
    ticker: tradeData.ticker || "",
    companyName: tradeData.ticker ? (getTickerBySymbol(tradeData.ticker)?.name || "") : "",
    direction: tradeData.direction || "Long",
    reasonForEntry: tradeData.reason_for_entry || "",
    entryDate: formatDateForInput(tradeData.entry_date),
    entryOrderPrice: tradeData.entry_price ?? "",
    entryFilledShares: tradeData.entry_filled_shares ?? tradeData.quantity ?? "",
    exitDate: formatDateForInput(tradeData.exit_date),
    exitOrderPrice: tradeData.exit_order_price ?? "",
    exitFilledShares: tradeData.exit_filled_shares ?? "",
    reasonForExit: tradeData.reason_for_exit ?? "",
    exitTactic: tradeData.exit_tactic_id ?? "",
    postTradeAnalysis: tradeData.post_trade_analysis ?? "",
    entryCharts: [],
    exitCharts: [],
    postTradeFiles: [],
    id: tradeData.id,
    setupType: setupValue,
    timeframesUsed: tradeData.timeframes_used || [],
    riskPerTrade: tradeData.risk_per_trade || "",
    stopLossPrice: tradeData.stop_loss_price || "",
    stopLossMethod: tradeData.stop_loss_method || "",
    target1: tradeData.target1 || "",
    target2: tradeData.target2 || "",
    target3: tradeData.target3 || "",
    atrValue: tradeData.atr_value || "",
    setupConfidence: tradeData.setup_confidence || "",
    tradeStatus: tradeData.trade_status || "Planned"
  };
}

export default function TradeLog({ mode = "add", tradeData = null, onSubmit }) {
  const [form, setForm] = useState(tradeData ? mapTradeDataToForm(tradeData) : initialState);
  // Define mode flags at the top so they're available everywhere
  const isAdd = mode === "add";
  const isUpdate = mode === "update";
  const isReview = mode === "review";
  // Generate Trade ID when form changes (only for add mode)
  useEffect(() => {
    if (isAdd) {
      const marketCodeMap = {
        "India": "IN",
        "US": "US",
        "Japan": "JP",
        "Germany": "GE",
        "Canada": "CN",
        "Singapore": "SG"
      };
      const marketCode = marketCodeMap[form.market] || "IN";
      const dateStr = form.entryDate ? form.entryDate.replace(/-/g, "") : "";
      const symbol = form.ticker || "XXX";
      const randomStr = Array(3).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
      const tradeId = `${marketCode}-${dateStr}-${symbol}-${randomStr}`;
      setForm(prev => ({ ...prev, tradeId }));
    }
  }, [form.market, form.entryDate, form.ticker, isAdd]);
  const [exitTactics, setExitTactics] = useState([]);
  const [setups, setSetups] = useState([]);
  const [setupsLoaded, setSetupsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];
  const navigate = useNavigate();
  const notification = useNotification();

  useEffect(() => {
    fetchExitTactics()
      .then(res => setExitTactics(res.data))
      .catch((err) => {
        console.error('Failed to fetch exit tactics:', err);
        setExitTactics([]);
        if (err.type === 'NETWORK_ERROR') {
          setError(err);
        }
      });
  }, []);

  useEffect(() => {
    fetchSetups()
      .then(res => {
        setSetups(res.data);
        setSetupsLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to fetch setups:', err);
        setSetups([]);
        setSetupsLoaded(true);
        if (err.type === 'NETWORK_ERROR') {
          setError(err);
        }
      });
  }, []);

  useEffect(() => {
    if (tradeData) setForm(mapTradeDataToForm(tradeData));
  }, [tradeData]);

  const entryDisabled = isUpdate || isReview;
  const exitDisabled = isAdd || isReview;
  const postDisabled = isAdd || isUpdate;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setForm((prev) => {
      const newForm = { ...prev, [name]: value };
      
      // If entry date changes and exit date is before the new entry date, clear exit date
      if (name === 'entryDate' && prev.exitDate && value && prev.exitDate < value) {
        newForm.exitDate = '';
      }
      
      return newForm;
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: Array.from(files) }));
  };

  // Handle ticker search change (when user types)
  const handleTickerChange = (value) => {
    setForm((prev) => ({ 
      ...prev, 
      ticker: value,
      companyName: "" // Clear company name when ticker changes
    }));
  };

  // Handle ticker selection (when user selects from dropdown)
  const handleTickerSelect = (tickerData) => {
    setForm((prev) => ({ 
      ...prev, 
      ticker: tickerData.symbol,
      companyName: tickerData.name // Auto-populate company name
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create form data without frontend-only fields
      const { companyName, ...formDataForBackend } = form;
      
      if (isAdd) {
        await createTrade(formDataForBackend);
        notification.success("Trade added successfully!");
        navigate("/trades", { replace: true });
        window.location.reload();
        return;
      } else if (isUpdate) {
        await updateTrade(formDataForBackend.id, formDataForBackend);
        notification.success("Trade updated successfully!");
      } else if (isReview) {
        await addPostAnalysis(formDataForBackend.id, { postTradeAnalysis: formDataForBackend.postTradeAnalysis, postTradeFiles: formDataForBackend.postTradeFiles });
        notification.success("Post trade analysis saved successfully!");
      }
      if (onSubmit) onSubmit();
    } catch (err) {
      console.error('Operation failed:', err);
      let errorMessage = "Operation failed. Please try again.";
      
      if (err.type === 'NETWORK_ERROR') {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (err.type === 'SERVER_ERROR') {
        errorMessage = "Server error. Please try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      notification.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Retry loading the initial data
    window.location.reload();
  };

  // Show error page if there's a network error during initial load
  if (error && error.type === 'NETWORK_ERROR') {
    return (
      <ErrorPage
        title="Unable to Connect"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className={styles.container}>
      {!onSubmit && (
        <PageHeader 
          title={isAdd ? "Add New Trade" : isUpdate ? "Update Trade Exit" : "Review Trade"}
          subtitle={isAdd ? "Enter the details for your new trade" : isUpdate ? "Update the exit details for this trade" : "Add your post-trade analysis"}
        />
      )}

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Trade Status */}
          <div className={styles.cardSection}>
            <h2 className={styles.sectionTitle}>Trade Status & Setup</h2>
            <div className={styles.gridTwoCol}>
              {/* Instrument Type */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Instrument Type</label>
                <select
                  name="instrumentType"
                  value={form.instrumentType}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={isReview}
                >
                  <option value="Stocks">Stocks</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Forex">Forex</option>
                  <option value="Options">Options</option>
                  <option value="Indices">Indices</option>
                </select>
              </div>
              {/* Market */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Market</label>
                <select
                  name="market"
                  value={form.market}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={isReview}
                >
                  <option value="India">India</option>
                  <option value="US">US</option>
                  <option value="Japan">Japan</option>
                  <option value="Germany">Germany</option>
                  <option value="Canada">Canada</option>
                  <option value="Singapore">Singapore</option>
                </select>
              </div>
              {/* Position Type */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Position Type</label>
                <select
                  name="positionType"
                  value={form.positionType}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={isReview}
                >
                  <option value="Swing">Swing</option>
                  <option value="Positional">Positional</option>
                  <option value="Intraday">Intraday</option>
                </select>
              </div>
              {/* Trade Status */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Trade Status</label>
                <select
                  name="tradeStatus"
                  value={form.tradeStatus}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={isReview}
                >
                  <option value="Planned">Planned</option>
                  <option value="Executed">Executed</option>
                  <option value="Closed">Closed</option>
                  <option value="Missed">Missed</option>
                  <option value="Aborted">Aborted</option>
                </select>
              </div>
              {/* Setup Type */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Setup Type</label>
                {entryDisabled ? (
                  <div className={styles.readOnlyField}>
                    {!setupsLoaded 
                      ? "Loading..." 
                      : (setups.find(s => String(s.trade_setup_id) === String(form.setupType))?.name || "N/A")
                    }
                  </div>
                ) : (
                  <select
                    name="setupType"
                    value={form.setupType}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={entryDisabled}
                  >
                    <option value="">Select setup...</option>
                    {setups.map((setup) => (
                      <option key={setup.trade_setup_id} value={setup.trade_setup_id}>
                        {setup.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className={styles.sectionDivider} />

          {/* Entry Section */}
          <div className={styles.cardSection}>
            <h2 className={styles.sectionTitle}>Entry Details</h2>
            {/* Trade ID (hidden) */}
            {isAdd && (
              <input type="hidden" name="tradeId" value={form.tradeId} />
            )}
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Ticker Symbol</label>
                {entryDisabled ? (
                  <input
                    type="text"
                    value={form.ticker}
                    className={`${styles.input} ${styles.inputDisabled}`}
                    disabled
                    readOnly
                  />
                ) : (
                  <TickerSearch
                    value={form.ticker}
                    onChange={handleTickerChange}
                    onSelect={handleTickerSelect}
                    placeholder="Search ticker (e.g. AAPL, RELIANCE)"
                  />
                )}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  className={`${styles.input} ${styles.inputDisabled}`}
                  placeholder="Auto-populated when ticker is selected"
                  disabled
                  readOnly
                />
              </div>
            </div>
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Direction</label>
                <select
                  name="direction"
                  value={form.direction}
                  onChange={handleChange}
                  className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                  disabled={entryDisabled}
                >
                  <option value="Long">Long (Buy)</option>
                  <option value="Short">Short (Sell)</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Entry Chart(s)</label>
                <input
                  type="file"
                  name="entryCharts"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={entryDisabled}
                  className={`${styles.fileInput} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Reason for Entry</label>
              <textarea
                name="reasonForEntry"
                value={form.reasonForEntry}
                onChange={handleChange}
                rows={4}
                className={`${styles.textarea} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                placeholder="Describe your reason for entry..."
                disabled={entryDisabled}
              />
            </div>
          </div>

          <div className={styles.sectionDivider} />

          {/* Entry Information */}
          <div className={styles.cardSection}>
            <h2 className={styles.sectionTitle}>Entry Information</h2>
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Entry Date</label>
                <input
                  type="date"
                  name="entryDate"
                  value={form.entryDate}
                  onChange={handleChange}
                  max={today}
                  className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Average Price ($)</label>
                <input
                  type="text"
                  name="entryOrderPrice"
                  value={form.entryOrderPrice || ""}
                  onChange={handleChange}
                  className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                  placeholder="0.00"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Quantity</label>
                <input
                  type="text"
                  name="entryFilledShares"
                  value={form.entryFilledShares || ""}
                  onChange={handleChange}
                  className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                  placeholder="100"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Timeframe(s) Used</label>
                <select
                  name="timeframesUsed"
                  value={form.timeframesUsed}
                  onChange={e => setForm(prev => ({ ...prev, timeframesUsed: Array.from(e.target.selectedOptions, option => option.value) }))}
                  multiple
                  className={styles.select}
                  disabled={entryDisabled}
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                  <option value="Hourly">Hourly</option>
                  <option value="15min">15min</option>
                  <option value="5min">5min</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Risk per Trade ({form.market === "India" ? "₹" : "$"} or %)</label>
                <input
                  type="text"
                  name="riskPerTrade"
                  value={form.riskPerTrade}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder={form.market === "India" ? "e.g. 2% or ₹1000" : "e.g. 2% or $1000"}
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Stop Loss Price</label>
                <input
                  type="text"
                  name="stopLossPrice"
                  value={form.stopLossPrice}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. 2450"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Stop Loss Method</label>
                <input
                  type="text"
                  name="stopLossMethod"
                  value={form.stopLossMethod}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. ATR, Structure, Fixed"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Target 1 (Price)</label>
                <input
                  type="text"
                  name="target1"
                  value={form.target1}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. 2500"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Target 2 (Price)</label>
                <input
                  type="text"
                  name="target2"
                  value={form.target2}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. 2550"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Target 3 (Price)</label>
                <input
                  type="text"
                  name="target3"
                  value={form.target3}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. 2600"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>ATR Value</label>
                <input
                  type="text"
                  name="atrValue"
                  value={form.atrValue}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. 20.5"
                  disabled={entryDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Setup Confidence</label>
                <select
                  name="setupConfidence"
                  value={form.setupConfidence}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={entryDisabled}
                >
                  <option value="">Select confidence...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.sectionDivider} />

          {/* Exit Section */}
          {!isAdd && (
            <div className={styles.cardSection}>
              <h2 className={styles.sectionTitle}>Exit Information</h2>
              <div className={styles.gridTwoCol}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Exit Date</label>
                  <input
                    type="date"
                    name="exitDate"
                    value={form.exitDate}
                    onChange={handleChange}
                    min={form.entryDate || undefined}
                    max={today}
                    className={`${styles.input} ${exitDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                    disabled={exitDisabled}
                  />
                </div>
                <div className={styles.fieldGroup}>
                <label className={styles.label}>Average Price ({form.market === "India" ? "₹" : "$"})</label>
                  <input
                    type="text"
                    name="exitOrderPrice"
                    value={form.exitOrderPrice || ""}
                    onChange={handleChange}
                    className={`${styles.input} ${exitDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                    placeholder="0.00"
                    disabled={exitDisabled}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Quantity</label>
                  <input
                    type="text"
                    name="exitFilledShares"
                    value={form.exitFilledShares || ""}
                    onChange={handleChange}
                    className={`${styles.input} ${exitDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                    placeholder="100"
                    disabled={exitDisabled}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Exit Tactic</label>
                  {exitDisabled ? (
                    <div className={styles.readOnlyField}>
                      {exitTactics.find(t => t.id === form.exitTactic)?.name || "N/A"}
                    </div>
                  ) : (
                    <select
                      name="exitTactic"
                      value={form.exitTactic}
                      onChange={handleChange}
                      className={`${styles.select} ${exitDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                      disabled={exitDisabled}
                    >
                      <option value="">Select tactic...</option>
                      {exitTactics.map((tactic) => (
                        <option key={tactic.id} value={tactic.id}>
                          {tactic.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className={styles.gridTwoCol}>
                <div className={styles.fieldGroup}>
                <label className={styles.label}>P&L ({form.market === "India" ? "₹" : "$"})</label>
                  <input
                    type="text"
                    value={(() => {
                      const entry = parseFloat(form.entryOrderPrice || 0);
                      const exit = parseFloat(form.exitOrderPrice || 0);
                      const qty = parseFloat(form.exitFilledShares || 0);
                      return qty && entry ? ((exit - entry) * qty).toFixed(2) : "";
                    })()}
                    readOnly
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>% Gain/Loss</label>
                  <input
                    type="text"
                    value={(() => {
                      const entry = parseFloat(form.entryOrderPrice || 0);
                      const exit = parseFloat(form.exitOrderPrice || 0);
                      return entry ? (((exit - entry) / entry) * 100).toFixed(2) : "";
                    })()}
                    readOnly
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>R-Multiple Achieved</label>
                  <input
                    type="text"
                    value={(() => {
                      const entry = parseFloat(form.entryOrderPrice || 0);
                      const exit = parseFloat(form.exitOrderPrice || 0);
                      const qty = parseFloat(form.exitFilledShares || 0);
                      const risk = parseFloat(form.riskPerTrade || 0);
                      return (risk && qty && entry) ? (((exit - entry) * qty) / risk).toFixed(2) : "";
                    })()}
                    readOnly
                    className={styles.input}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Holding Period (days)</label>
                  <input
                    type="text"
                    value={(() => {
                      if (form.entryDate && form.exitDate) {
                        const entry = new Date(form.entryDate);
                        const exit = new Date(form.exitDate);
                        const diff = (exit - entry) / (1000 * 60 * 60 * 24);
                        return diff >= 0 ? Math.round(diff) : "";
                      }
                      return "";
                    })()}
                    readOnly
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Reason for Exit</label>
                <textarea
                  name="reasonForExit"
                  value={form.reasonForExit}
                  onChange={handleChange}
                  rows={4}
                  className={`${styles.textarea} ${exitDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                  placeholder="Describe your reason for exit..."
                  disabled={exitDisabled}
                />
              </div>
              <div className={styles.gridTwoCol}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Emotional State</label>
                  <select
                    name="exitEmotionalState"
                    value={form.exitEmotionalState}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={exitDisabled}
                  >
                    <option value="">Select emotional state...</option>
                    <option value="Calm">Calm</option>
                    <option value="Impatient">Impatient</option>
                    <option value="Fearful">Fearful</option>
                    <option value="Confident">Confident</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Mistake Made?</label>
                  <input
                    type="checkbox"
                    name="exitMistake"
                    checked={form.exitMistake}
                    onChange={e => setForm(prev => ({ ...prev, exitMistake: e.target.checked }))}
                    disabled={exitDisabled}
                  />
                  <textarea
                    name="exitMistakeNotes"
                    value={form.exitMistakeNotes}
                    onChange={handleChange}
                    rows={2}
                    className={styles.textarea}
                    placeholder="Describe the mistake (if any)..."
                    disabled={exitDisabled}
                  />
                </div>
              </div>
              <div className={styles.gridTwoCol}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Lessons Learned</label>
                  <textarea
                    name="exitLessons"
                    value={form.exitLessons}
                    onChange={handleChange}
                    rows={2}
                    className={styles.textarea}
                    placeholder="Any lessons or reflections..."
                    disabled={exitDisabled}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Exit Confidence</label>
                  <select
                    name="exitConfidence"
                    value={form.exitConfidence}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={exitDisabled}
                  >
                    <option value="">Select confidence...</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Notes (Optional)</label>
                <textarea
                  name="exitNotes"
                  value={form.exitNotes}
                  onChange={handleChange}
                  rows={2}
                  className={styles.textarea}
                  placeholder="Any extra comment, market context, etc."
                  disabled={exitDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Exit Chart(s)</label>
                <input
                  type="file"
                  name="exitCharts"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={exitDisabled}
                  className={`${styles.fileInput} ${exitDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                />
              </div>
            </div>
          )}

          <div className={styles.sectionDivider} />

          {/* Post Trade Analysis */}
          {isReview && (
            <div className={styles.cardSection}>
              <h2 className={styles.sectionTitle}>Post Trade Analysis</h2>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Analysis Notes</label>
                <textarea
                  name="postTradeAnalysis"
                  value={form.postTradeAnalysis}
                  onChange={handleChange}
                  rows={6}
                  className={`${styles.textarea} ${postDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                  placeholder="Your notes or analysis..."
                  disabled={postDisabled}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Post Trade Files</label>
                <input
                  type="file"
                  name="postTradeFiles"
                  multiple
                  onChange={handleFileChange}
                  disabled={postDisabled}
                  className={`${styles.fileInput} ${postDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                />
              </div>
            </div>
          )}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading 
              ? "Processing..." 
              : (isAdd ? "Add Trade" : isUpdate ? "Update Trade" : "Save Analysis")
            }
          </button>
        </form>
      </div>
    </div>
  );
}
