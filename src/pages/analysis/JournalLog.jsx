import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./JournalLog.module.css";
import PageHeader from "../../components/PageHeader";
import TickerSearch from "../../components/TickerSearch";
import { createJournal, updateJournal, getJournalById } from '../../api/journalApi';
import { fetchSetups } from '../../api/firebaseMetaApi';
import { getTechnicalIndicators } from '../../api/tickerApi';
import { useNotification } from '../../components/NotificationProvider';
import ErrorPage from '../../components/ErrorPage';
import { getTickerBySymbol } from '../../data/tickerData';
import CommonAddChart from "../../components/CommonAddChart";

const todayStr = new Date().toISOString().split('T')[0];
const initialState = {
  date: todayStr,
  stock: "",
  companyName: "",
  trend: "",
  candleType: "",
  nearSupport: false,
  nearResistance: false,
  supportLevel: "",
  resistanceLevel: "",
  emaTouch: false,
  volumeSpike: false,
  rsiValue: "",
  entryConsidered: false,
  setupType: 2002,
  setupConfidence: "",
  actionPlan: "",
  notes: "",
  entryCharts: [],
};

export default function StockAnalysisAdd({ onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [setups, setSetups] = useState([]);
  const [setupsLoaded, setSetupsLoaded] = useState(false);

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];
  const navigate = useNavigate();
  const notification = useNotification();
  const { id } = useParams(); // Get ID from URL for edit mode

  const isEditMode = !!id;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const { files } = e.target;
    if (files) {
      setForm(prev => ({ ...prev, entryCharts: Array.from(files) }));
    }
  };

  // Handle ticker search change (when user types)
  const handleTickerChange = (value) => {
    setForm((prev) => ({
      ...prev,
      stock: value,
      companyName: "" // Clear company name when ticker changes
    }));
  };

  // Handle ticker selection (when user selects from dropdown)
  const handleTickerSelect = async (tickerData) => {
    const { symbol, name } = tickerData;
    let rsi = "";
    let support = "";
    let resistance = "";
    try {
      const indicatorsRes = await getTechnicalIndicators(symbol);
      const indicators = indicatorsRes.data || {};
      rsi = indicators.rsi14 || "";
      support = indicators.support || "";
      resistance = indicators.resistance || "";
    } catch (e) {
      // fallback to blank
    }
    setForm((prev) => ({
      ...prev,
      stock: symbol,
      companyName: name,
      rsiValue: rsi,
      supportLevel: support,
      resistanceLevel: resistance
    }));
  };
  // Fetch setups on mount
  useEffect(() => {
    let mounted = true;
    setSetupsLoaded(false);
    fetchSetups().then((data) => {
      if (mounted) {
        setSetups(data || []);
        setSetupsLoaded(true);
      }
    }).catch((error) => {
      console.error('Error fetching setups:', error);
      setSetupsLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create form data without frontend-only fields
      const { companyName, ...formDataForBackend } = form;

      if (isEditMode) {
        await updateJournal(id, formDataForBackend);
        notification.success("Journal entry updated successfully!");
      } else {
        await createJournal(formDataForBackend);
        notification.success("Journal entry added successfully!");
      }

      navigate("/journal", { replace: true });
      window.location.reload();
    } catch (err) {
      console.error('Operation failed:', err);
      let errorMessage = isEditMode ? "Failed to update journal entry. Please try again." : "Operation failed. Please try again.";

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
  const removeEntryChart = (index) => {
    setForm(prev => ({
      ...prev,
      entryCharts: prev.entryCharts.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className={styles.container}>
      {!onSubmit && (
        <PageHeader
          title={isEditMode ? "Edit Chart Reading" : "Add Chart Reading"}
          subtitle={isEditMode ? "Update your chart analysis and observations" : "Log your chart analysis and market observations"}
        />
      )}

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.basicTitle}`}>
              Basic Information
            </h3>

            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  max={today}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  title="Select the date for this chart reading (today or earlier)"
                  placeholder="Select date..."
                  disabled={isEditMode}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Stock Symbol</label>
                <TickerSearch
                  value={form.stock}
                  onChange={handleTickerChange}
                  onSelect={handleTickerSelect}
                  placeholder="Search ticker (e.g. AAPL, RELIANCE)"
                  disabled={isEditMode}
                  instrumentType={"Stocks"}
                  apiSource="yahoo" // Use the same prop as Add Trade for ticker search API
                />
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
                <label className={styles.label}>Overall Trend</label>
                <select
                  name="trend"
                  value={form.trend}
                  onChange={handleChange}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  disabled={isEditMode}
                  required
                >
                  <option value="">Select trend...</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                  <option value="Sideways">Sideways</option>
                  <option value="Uncertain">Uncertain</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Setup Type</label>
                <select
                  name="setupType"
                  value={form.setupType}
                  onChange={handleChange}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  disabled={isEditMode}
                  required
                >
                  <option value="">{setupsLoaded ? "Select setup..." : "Loading..."}</option>
                  {setups.map((setup) => (
                    <option key={setup.id} value={setup.id}>{setup.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Setup Confidence</label>
                <select
                  name="setupConfidence"
                  value={form.setupConfidence}
                  onChange={handleChange}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  disabled={isEditMode}
                  required
                >
                  <option value="">Select confidence...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Technical Analysis Section */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.technicalTitle}`}>
              Technical Analysis {isEditMode && "(Read-only)"}
            </h3>

            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Candle Type</label>
                <select
                  name="candleType"
                  value={form.candleType}
                  onChange={handleChange}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  disabled={isEditMode}
                >
                  <option value="">Select candle type...</option>
                  <option value="Doji">Doji</option>
                  <option value="Hammer">Hammer</option>
                  <option value="Shooting Star">Shooting Star</option>
                  <option value="Engulfing">Engulfing</option>
                  <option value="Spinning Top">Spinning Top</option>
                  <option value="Long Body">Long Body</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>RSI Value</label>
                <input
                  type="number"
                  name="rsiValue"
                  value={form.rsiValue}
                  onChange={handleChange}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  placeholder="0-100"
                  max="100"
                  disabled={isEditMode}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Support Level</label>
                <input
                  type="number"
                  name="supportLevel"
                  value={form.supportLevel}
                  onChange={handleChange}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  placeholder="0.00"
                  disabled={isEditMode}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Resistance Level</label>
                <input
                  type="number"
                  name="resistanceLevel"
                  value={form.resistanceLevel}
                  onChange={handleChange}
                  className={`${styles.input} ${isEditMode ? styles.inputDisabled : styles.inputEnabled}`}
                  placeholder="0.00"
                  disabled={isEditMode}
                />
              </div>
            </div>

            {/* Boolean Fields */}
            <div className={styles.checkboxGrid}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="nearSupport"
                  name="nearSupport"
                  checked={form.nearSupport}
                  onChange={handleChange}
                  className={styles.checkbox}
                  disabled={isEditMode}
                />
                <label htmlFor="nearSupport" className={styles.checkboxLabel}>
                  Near Support
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="nearResistance"
                  name="nearResistance"
                  checked={form.nearResistance}
                  onChange={handleChange}
                  className={styles.checkbox}
                  disabled={isEditMode}
                />
                <label htmlFor="nearResistance" className={styles.checkboxLabel}>
                  Near Resistance
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="emaTouch"
                  name="emaTouch"
                  checked={form.emaTouch}
                  onChange={handleChange}
                  className={styles.checkbox}
                  disabled={isEditMode}
                />
                <label htmlFor="emaTouch" className={styles.checkboxLabel}>
                  EMA Touch
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="volumeSpike"
                  name="volumeSpike"
                  checked={form.volumeSpike}
                  onChange={handleChange}
                  className={styles.checkbox}
                  disabled={isEditMode}
                />
                <label htmlFor="volumeSpike" className={styles.checkboxLabel}>
                  Volume Spike
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="entryConsidered"
                  name="entryConsidered"
                  checked={form.entryConsidered}
                  onChange={handleChange}
                  className={styles.checkbox}
                  disabled={isEditMode}
                />
                <label htmlFor="entryConsidered" className={styles.checkboxLabel}>
                  Potential Trade
                </label>
              </div>
            </div>
          </div>

          {/* Analysis Section - Only show in create mode */}
          {!isEditMode && (
            <div className={styles.card}>
              <h3 className={`${styles.cardTitle} ${styles.analysisTitle}`}>
                Analysis & Notes
              </h3>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Action Plan</label>
                <textarea
                  name="actionPlan"
                  value={form.actionPlan}
                  onChange={handleChange}
                  rows={4}
                  className={`${styles.textarea} ${styles.inputEnabled}`}
                  placeholder="What's your plan based on this analysis?"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={6}
                  className={`${styles.textarea} ${styles.inputEnabled}`}
                  placeholder="Additional observations, insights, or thoughts..."
                  required
                />
              </div>

              <CommonAddChart
                addChart={handleFileChange}
                removeChart={removeEntryChart}
                charts={form.entryCharts}
                title="Entry Charts"
              />
            </div>
          )}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? "Processing..." : (isEditMode ? "Update Journal Entry" : "Add Journal Entry")}
          </button>
        </form>
      </div>
    </div>
  );
}
