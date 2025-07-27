import React, { useEffect, useState } from "react";
import { getTradeTransactions } from '../../api/tradeApi';

export default function ExitSection(props) {
  const { form, handleChange, exitDisabled, exitTactics, today, styles } = props;
  const [partialExits, setPartialExits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!form.id) return;
    setLoading(true);
    getTradeTransactions(form.id)
      .then(res => setPartialExits(res.data || []))
      .catch(() => setPartialExits([]))
      .finally(() => setLoading(false));
  }, [form.id]);

  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Exit Information</h2>

      {/* Partial Exits Table */}
      {partialExits.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, color: '#F59E0B', margin: '0 0 12px 0' }}>Partial Exits</h3>
          <table style={{ width: '100%', background: '#181F2A', borderRadius: 8, borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr style={{ color: '#9CA3AF', fontWeight: 600, fontSize: 14 }}>
                <th style={{ padding: 8, borderBottom: '1px solid #2A3441' }}>Date</th>
                <th style={{ padding: 8, borderBottom: '1px solid #2A3441' }}>Quantity</th>
                <th style={{ padding: 8, borderBottom: '1px solid #2A3441' }}>Price</th>
                <th style={{ padding: 8, borderBottom: '1px solid #2A3441' }}>P&L</th>
              </tr>
            </thead>
            <tbody>
              {partialExits.map((exit, idx) => {
                const price = exit.exit_price || exit.price || exit.exitOrderPrice || '-';
                const qty = exit.exit_quantity || exit.quantity || '-';
                const entry = form.entryOrderPrice || form.entry_price || 0;
                const pl = (price && qty && entry) ? ((Number(price) - Number(entry)) * Number(qty)).toFixed(2) : '-';
                return (
                  <tr key={idx} style={{ color: '#E5E7EB', fontSize: 15 }}>
                    <td style={{ padding: 8 }}>{exit.exit_date ? new Date(exit.exit_date).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: 8 }}>{qty}</td>
                    <td style={{ padding: 8 }}>{price !== '-' ? `$${Number(price).toFixed(2)}` : '-'}</td>
                    <td style={{ padding: 8 }}>{pl !== '-' ? `$${pl}` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
            onChange={e => handleChange({ target: { name: 'exitMistake', type: 'checkbox', checked: e.target.checked } })}
            disabled={exitDisabled}
          />
          <textarea
            name="exitMistakeNotes"
            value={form.exitMistakeNotes}
            onChange={handleChange}
            rows={2}
            className={styles.textarea}
            placeholder="Describe the mistake (if any)"
            disabled={exitDisabled}
          />
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
            onChange={handleChange}
            disabled={exitDisabled}
            className={`${styles.fileInput} ${exitDisabled ? styles.inputDisabled : styles.inputEnabled}`}
          />
        </div>
      </div>
    </div>
  );
}
