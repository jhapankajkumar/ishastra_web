import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import styles from "./TradeAdd.module.css";
import PageHeader from "../../components/PageHeader";
import ErrorPage from "../../components/ErrorPage";
import { getTradeById, editTrade } from "../../api/tradeApi";
import { useNotification } from "../../components/NotificationProvider";

const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export default function TradeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notification = useNotification();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [trade, setTrade] = useState(null);
  const isQuantityLocked = trade?.status === 'Partial Closed' || trade?.status === 'Closed' || (trade?.tradeTransactions || []).length > 0;
  const [form, setForm] = useState({
    entryDate: "",
    entryPrice: "",
    stopLoss: "",
    quantity: ""
  });

  useEffect(() => {
    const loadTrade = async () => {
      try {
        setLoading(true);
        const response = await getTradeById(id);
        const tradeData = response.data;
        setTrade(tradeData);
        setForm({
          entryDate: formatDateForInput(tradeData.entryDate),
          entryPrice: tradeData.entryPrice ?? "",
          stopLoss: tradeData.stopLoss ?? "",
          quantity: tradeData.quantity ?? ""
        });
      } catch (err) {
        console.error("Failed to load trade:", err);
        setError(err.response?.data?.error || "Failed to load trade data.");
      } finally {
        setLoading(false);
      }
    };

    loadTrade();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await editTrade(id, form);
      notification.success("Trade updated successfully!");
      navigate("/trades", { replace: true });
    } catch (err) {
      console.error("Failed to update trade:", err);
      const message =
        err.response?.data?.error ||
        err.message ||
        "Failed to update trade. Please try again.";
      notification.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <PageHeader title="Edit Trade" showBackButton onBack={() => navigate("/trades")} />
        <div style={{ padding: "24px", color: "var(--text-secondary)" }}>Loading trade data...</div>
      </div>
    );
  }

  if (error) {
    return <ErrorPage title="Unable to Load Trade" message={error} onRetry={() => navigate("/trades")} />;
  }

  return (
    <div className={styles.container}>
      <PageHeader
        title="Edit Trade"
        subtitle={trade?.ticker ? `Update entry details for ${trade.ticker}` : "Update existing trade entry details"}
        showBackButton
        onBack={() => navigate("/trades")}
      />

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.cardSection}>
            <h2 className={styles.sectionTitle}>Edit Entry Details</h2>
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Ticker</label>
                <input
                  type="text"
                  value={trade?.ticker || ""}
                  className={`${styles.input} ${styles.inputDisabled}`}
                  disabled
                  readOnly
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Entry Date</label>
                <input
                  type="date"
                  name="entryDate"
                  value={form.entryDate}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Entry Price</label>
                <input
                  type="number"
                  step="0.01"
                  name="entryPrice"
                  value={form.entryPrice}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>SL Price</label>
                <input
                  type="number"
                  step="0.01"
                  name="stopLoss"
                  value={form.stopLoss}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>QTY</label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="100"
                  disabled={isQuantityLocked}
                  readOnly={isQuantityLocked}
                />
                {isQuantityLocked && (
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>
                    Quantity is locked because this trade already has exit activity.
                  </small>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={submitting}>
            {submitting ? "Updating..." : (
              <>
                <SaveOutlinedIcon fontSize="inherit" />
                <span>Update Trade</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
