import React from "react";

export default function ExitSection(props) {
  const { form, handleChange, exitDisabled, exitTactics, today, styles } = props;
  return (
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
