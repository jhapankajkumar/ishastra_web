import React from "react";

export default function RiskManagementSection({
  form,
  handleChange,
  entryDisabled,
  today,
  styles,
  currentPrice,
  loadingPrice,
  atrValue,
  atrMultiplier,
  stopLossMethod,
  fixedPercent,
  stopLossPrice,
  targets,
  riskPerTrade,
  riskValue,
  market,
  qtyValue,
  autoQty,
  maxAllowedQty,
  qtyWarning
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className={styles.cardSection} style={{ marginTop: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Risk Management</h2>
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', color: '#7ecfff', fontSize: 18, cursor: 'pointer' }}
        >
          {collapsed ? '▼ Expand' : '▲ Collapse'}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className={styles.gridTwoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Risk per Trade ({market === "India" ? "₹" : "$"} or %)</label>
              <input type="text" name="riskPerTrade" value={riskPerTrade} onChange={handleChange} className={styles.input} placeholder={market === "India" ? "e.g. 2% or ₹1000" : "e.g. 2% or $1000"} disabled={entryDisabled} />
              <div style={{ color: '#aaa', fontSize: '0.95em', marginTop: 2 }}>
                Risk per Trade Amount: <b>{riskValue.toLocaleString(undefined, {maximumFractionDigits: 2})} {market === "India" ? "₹" : "$"}</b>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Stop Loss Method</label>
              <select name="stopLossMethod" value={stopLossMethod} onChange={handleChange} className={styles.input} disabled={entryDisabled}>
                <option value="ATR">ATR</option>
                <option value="Fixed Value">Fixed Value</option>
                <option value="Fixed %">Fixed %</option>
              </select>
            </div>
            {stopLossMethod === "ATR" && (
              <>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>ATR Value</label>
                  <input type="number" name="atrValue" value={atrValue} onChange={handleChange} className={styles.input} placeholder="e.g. 10" disabled={entryDisabled} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>ATR Multiplier</label>
                  <input type="number" name="atrMultiplier" value={atrMultiplier} onChange={handleChange} className={styles.input} placeholder="e.g. 1.5" min="0.1" step="0.1" disabled={entryDisabled} />
                </div>
              </>
            )}
            {stopLossMethod === "Fixed %" && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Fixed % Value</label>
                <input type="number" name="fixedPercent" value={fixedPercent} onChange={handleChange} className={styles.input} placeholder="e.g. 3" min="0" max="100" disabled={entryDisabled} />
              </div>
            )}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Stop Loss Price (auto)</label>
              <input type="text" name="stopLossPrice" value={stopLossPrice} readOnly className={styles.input} />
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
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Quantity</label>
            <input
              type="text"
              name="entryFilledShares"
              value={qtyValue}
              onChange={handleChange}
              className={`${styles.input} ${qtyWarning ? styles.inputWarning : entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
              placeholder={maxAllowedQty > 0 ? maxAllowedQty : "100"}
              disabled={entryDisabled}
              style={qtyWarning ? { backgroundColor: "orange" } : {}}
            />
            <div style={{ color: '#aaa', fontSize: '0.95em', marginTop: 2 }}>
              Calculated Quantity: <b>{autoQty || 0}</b>
            </div>
            {qtyWarning && (
              <div style={{ color: "orange", fontSize: "0.9em" }}>
                QTY exceeds allowed by risk per trade!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
