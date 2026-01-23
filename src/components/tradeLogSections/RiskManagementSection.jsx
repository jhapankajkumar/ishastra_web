import React from "react";

export default function RiskManagementSection({
  handleChange,
  entryDisabled,
  styles,
  stopLossMethod,
  fixedPercent,
  stopLossPrice,
  targets,
  riskPerTrade,
  riskValue,
  market
}) {
  return (
    <div className={styles.cardSection} style={{ marginTop: 0 }}>
      <h2 className={styles.sectionTitle}>Risk Management</h2>
      <div className={styles.gridTwoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Risk per Trade ({market === "India" ? "₹" : "$"} or %)</label>
              <input
                type="text"
                name="riskPerTrade"
                value={riskPerTrade}
                className={styles.input}
                placeholder="1%"
                disabled
                readOnly
              />
              <div style={{ color: '#aaa', fontSize: '0.95em', marginTop: 2 }}>
                Risk per Trade Amount: <b>{riskValue.toLocaleString(undefined, {maximumFractionDigits: 2})} {market === "India" ? "₹" : "$"}</b>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Stop Loss Method</label>
              <select name="stopLossMethod" value={stopLossMethod} onChange={handleChange} className={styles.input} disabled={entryDisabled}>
                <option value="Fixed Value">Fixed Value</option>
                <option value="Fixed %">Fixed %</option>
              </select>
            </div>
            {stopLossMethod === "Fixed %" && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Fixed % Value</label>
                <input type="number" name="fixedPercent" value={fixedPercent} onChange={handleChange} className={styles.input} placeholder="e.g. 5" min="0" max="100" disabled={entryDisabled} />
              </div>
            )}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Stop Loss Price</label>
              <input
                type="number"
                name="stopLossPrice"
                value={stopLossPrice}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter stop loss price"
                readOnly={stopLossMethod !== "Fixed Value"}
                disabled={entryDisabled}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Target 1 (1:2)</label>
              <input type="text" name="target1" value={targets[0]} readOnly className={styles.input} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Target 2 (1:3)</label>
              <input type="text" name="target2" value={targets[1]} readOnly className={styles.input} />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Target 3 (1:4)</label>
              <input type="text" name="target3" value={targets[2]} readOnly className={styles.input} />
            </div>
          </div>
    </div>
  );
}
