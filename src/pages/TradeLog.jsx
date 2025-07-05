import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import { createTrade, updateTrade, addPostAnalysis, fetchExitTactics, fetchSetups } from '../api/tradeApi';

const initialState = {
  ticker: "",
  symbol: "",
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
  return {
    ...initialState,
    ticker: tradeData.ticker || "",
    reasonForEntry: tradeData.reason_for_entry || "",
    entryDate: tradeData.entry_date ? tradeData.entry_date.slice(0, 10) : "",
    entryOrderPrice: tradeData.entry_price ?? "",
    entryFilledShares: tradeData.entry_filled_shares ?? tradeData.quantity ?? "",
    exitDate: tradeData.exit_date ? tradeData.exit_date.slice(0, 10) : "",
    exitOrderPrice: tradeData.exit_order_price ?? "",
    exitFilledShares: tradeData.exit_filled_shares ?? "",
    reasonForExit: tradeData.reason_for_exit ?? "",
    exitTactic: tradeData.exit_tactic_id ?? "",
    postTradeAnalysis: tradeData.post_trade_analysis ?? "",
    entryCharts: [],
    exitCharts: [],
    postTradeFiles: [],
    id: tradeData.id,
    setupType: tradeData.trade_setup_id ?? "",
  };
}

export default function TradeLog({ mode = "add", tradeData = null, onSubmit }) {
  // mode: "add" | "update" | "review"
  const [form, setForm] = useState(tradeData ? mapTradeDataToForm(tradeData) : initialState);
  const [exitTactics, setExitTactics] = useState([]);
  const [setups, setSetups] = useState([]);
  const navigate = useNavigate();

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

  // Update form if tradeData changes (for update/review)
  useEffect(() => {
    if (tradeData) setForm(mapTradeDataToForm(tradeData));
  }, [tradeData]);

  const isAdd = mode === "add";
  const isUpdate = mode === "update";
  const isReview = mode === "review";

  // Helper for disabling fields
  const entryDisabled = isUpdate || isReview;
  const exitDisabled = isAdd || isReview;
  const postDisabled = isAdd || isUpdate;

  // Handle text/number input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file input
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: Array.from(files) }));
  };

  // Submit handler (replace with your API call)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdd) {
      await createTrade(form);
      alert("Trade added!");
      navigate("/trades", { replace: true });
      window.location.reload();
      return;
    } else if (isUpdate) {
      await updateTrade(form.id, form);
      alert("Trade updated!");
    } else if (isReview) {
      await addPostAnalysis(form.id, { postTradeAnalysis: form.postTradeAnalysis, postTradeFiles: form.postTradeFiles });
      alert("Post trade analysis saved!");
    }
    if (onSubmit) onSubmit();
  };

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.heading}>
        {isAdd && "Add New Trade"}
        {isUpdate && "Update Trade (Exit)"}
        {isReview && "Review Trade"}
      </h2>
      <form onSubmit={handleSubmit} className="tradeLogForm" style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {/* Entry Section */}
        <div className={styles.card}>
          <div className={styles.responsiveFlex}>
            <div style={{ flex: 1 }}>
              <label className={styles.formLabel}>Ticker</label>
              <input
                type="text"
                name="ticker"
                value={form.ticker}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="e.g. AAPL"
                required
                disabled={entryDisabled}
              />
            </div>

          </div>
          <h3>Reason for Entry</h3>
          <textarea
            name="reasonForEntry"
            value={form.reasonForEntry}
            onChange={handleChange}
            rows={3}
            className={styles.formTextarea}
            placeholder="Describe your reason for entry..."
            disabled={entryDisabled}
          />
          <div>
            <label>
              Entry Chart(s):{" "}
              <input
                type="file"
                name="entryCharts"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={entryDisabled}
              />
            </label>
          </div>
        </div>

        {/* Entry Inputs */}
        <div className={styles.card}>
          <h3 style={{ color: "#4f8cff" }}>Entry</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 8,
              fontWeight: 600,
              color: "#b0c4d8"
            }}
          >
            <span>Date</span>
            <span>Average Price</span>
            <span>Quantity</span>
            <span>Setup</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 8
            }}
          >
            <input
              type="date"
              name="entryDate"
              value={form.entryDate}
              onChange={handleChange}
              className={styles.formInput}
              disabled={entryDisabled}
            />
            <input
              type="text"
              name="entryOrderPrice"
              value={form.entryOrderPrice || ""}
              onChange={handleChange}
              className={styles.formInput}
              disabled={entryDisabled}
            />
            <input
              type="text"
              name="entryFilledShares"
              value={form.entryFilledShares || ""}
              onChange={handleChange}
              className={styles.formInput}
              disabled={entryDisabled}
            />
            <select
              name="setupType"
              value={form.setupType}
              onChange={handleChange}
              className={styles.formSelect}
              required
              disabled={entryDisabled}
              style={{ minWidth: 0 }}
            >
              <option value="">Select setup...</option>
              {setups.map((setup) => (
                <option key={setup.id || setup.trade_setup_id} value={setup.id || setup.trade_setup_id}>
                  {setup.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Exit Section */}
        {!isAdd && (
          <div className={styles.card}>
            <h3 style={{ color: "#4f8cff" }}>Exit</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 8, fontWeight: 600, color: "#b0c4d8" }}>
              <span>Date</span>
              <span>Average Price</span>
              <span>Quantity</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <input type="date" name="exitDate" value={form.exitDate} onChange={handleChange} className={styles.formInput} disabled={exitDisabled} />
              <input type="text" name="exitOrderPrice" value={form.exitOrderPrice || ""} onChange={handleChange} className={styles.formInput} disabled={exitDisabled} />
              <input type="text" name="exitFilledShares" value={form.exitFilledShares || ""} onChange={handleChange} className={styles.formInput} disabled={exitDisabled} />
            </div>
            <h3>Reason for Exit & Exit Tactic</h3>
            <textarea
              name="reasonForExit"
              value={form.reasonForExit}
              onChange={handleChange}
              rows={2}
              className={styles.formTextarea}
              placeholder="Describe your reason for exit..."
              disabled={exitDisabled}
            />
            <div>
              <label>
                Exit Chart(s):{" "}
                <input
                  type="file"
                  name="exitCharts"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={exitDisabled}
                />
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              <label className={styles.formLabel}>Exit Tactic</label>
              <select
                name="exitTactic"
                value={form.exitTactic}
                onChange={handleChange}
                className={styles.formSelect}
                disabled={exitDisabled}
              >
                <option value="">Select tactic...</option>
                {exitTactics.map((t) => (
                  <option key={t.tactic_id || t.id} value={t.tactic_id || t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Post Trade Analysis */}
        {isReview && (
          <div className={styles.card}>
            <h3 style={{ color: "#4f8cff" }}>Post Trade Analysis</h3>
            <textarea
              name="postTradeAnalysis"
              value={form.postTradeAnalysis}
              onChange={handleChange}
              rows={2}
              className={styles.formTextarea}
              placeholder="Your notes or analysis..."
              disabled={postDisabled}
            />
            <div>
              <label>
                Attach File:{" "}
                <input
                  type="file"
                  name="postTradeFiles"
                  multiple
                  onChange={handleFileChange}
                  disabled={postDisabled}
                />
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: "10px 32px",
            fontSize: 18,
            borderRadius: 8,
            background: "#4f8cff",
            color: "#fff",
            border: "none",
            marginTop: 24
          }}
        >
          {isAdd ? "Add Trade" : isUpdate ? "Update Trade" : "Save Analysis"}
        </button>
      </form>
    </div>
  );
}