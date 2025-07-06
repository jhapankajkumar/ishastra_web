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
  ticker: "",
  companyName: "",
  symbol: "",
  direction: "long", // Default to long
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
    direction: tradeData.direction || "long",
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
  };
}

export default function TradeLog({ mode = "add", tradeData = null, onSubmit }) {
  const [form, setForm] = useState(tradeData ? mapTradeDataToForm(tradeData) : initialState);
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

  const isAdd = mode === "add";
  const isUpdate = mode === "update";
  const isReview = mode === "review";

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
          {/* Entry Section */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.entryTitle}`}>
              Entry Details
            </h3>
            
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

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Direction</label>
              <select
                name="direction"
                value={form.direction}
                onChange={handleChange}
                className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
                disabled={entryDisabled}
              >
                <option value="long">Long (Buy)</option>
                <option value="short">Short (Sell)</option>
              </select>
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

          {/* Entry Information */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.entryInfoTitle}`}>
              Entry Information
            </h3>
            
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
                    className={`${styles.select} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
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

          {/* Exit Section */}
          {!isAdd && (
            <div className={styles.card}>
              <h3 className={`${styles.cardTitle} ${styles.exitTitle}`}>
                Exit Information
              </h3>
              
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
                  <label className={styles.label}>Average Price ($)</label>
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

          {/* Post Trade Analysis */}
          {isReview && (
            <div className={styles.card}>
              <h3 className={`${styles.cardTitle} ${styles.postAnalysisTitle}`}>
                Post Trade Analysis
              </h3>

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
