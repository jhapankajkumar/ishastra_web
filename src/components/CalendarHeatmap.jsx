// src/components/CalendarHeatmap.jsx
//
// GitHub-contributions-style grid of daily realized P&L for the trailing
// year. No existing chart in the app answers "which days/weeks was I
// actually profitable" at a glance — this is the most screenshot-worthy
// chart for a portfolio piece, and doesn't need a new charting library
// (pure CSS grid + color interpolation).
import React, { useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import styles from './CalendarHeatmap.module.css';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

function buildDailyPnlMap(trades) {
  const map = new Map();
  (trades || []).forEach(trade => {
    const entry = Number(trade.entryPrice || 0);
    const sign = (trade.direction || 'long').toLowerCase() === 'long' ? 1 : -1;
    const txs = trade.exitTransactions || [];
    if (txs.length === 0 && trade.exitPrice != null && trade.exitDate) {
      const soldQty = Number(trade.quantity || 0) - Number(trade.remainingQuantity || 0);
      if (soldQty > 0) {
        const key = String(trade.exitDate).slice(0, 10);
        map.set(key, (map.get(key) || 0) + sign * (Number(trade.exitPrice) - entry) * soldQty);
      }
    } else {
      txs.forEach(tx => {
        if (!tx.transactionDate || tx.price == null || tx.quantity == null) return;
        const key = typeof tx.transactionDate === 'number'
          ? new Date(tx.transactionDate).toISOString().slice(0, 10)
          : String(tx.transactionDate).slice(0, 10);
        map.set(key, (map.get(key) || 0) + sign * (Number(tx.price) - entry) * Number(tx.quantity));
      });
    }
  });
  return map;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CalendarHeatmap = ({ trades, currencySymbol = '₹' }) => {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [hover, setHover] = useState(null);

  const { weeks, monthMarkers, maxAbs } = useMemo(() => {
    const dailyPnl = buildDailyPnlMap(trades);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start on a Sunday, ~53 weeks back, so the grid always fills a clean rectangle.
    const start = new Date(today.getTime() - 371 * DAY_MS);
    start.setDate(start.getDate() - start.getDay());

    const days = [];
    let maxAbsVal = 0;
    for (let d = new Date(start); d <= today; d = new Date(d.getTime() + DAY_MS)) {
      const key = toDateKey(d);
      const pnl = dailyPnl.get(key) || 0;
      if (Math.abs(pnl) > maxAbsVal) maxAbsVal = Math.abs(pnl);
      days.push({ date: new Date(d), key, pnl });
    }

    const weeksArr = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksArr.push(days.slice(i, i + 7));
    }

    const markers = [];
    let lastMonth = null;
    weeksArr.forEach((week, i) => {
      const month = week[0].date.getMonth();
      if (month !== lastMonth) {
        markers.push({ index: i, label: MONTHS[month] });
        lastMonth = month;
      }
    });

    return { weeks: weeksArr, monthMarkers: markers, maxAbs: maxAbsVal || 1 };
  }, [trades]);

  const colorFor = (pnl) => {
    if (pnl === 0) return isDark ? '#2A3441' : '#e2e8f0';
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    const alpha = 0.25 + intensity * 0.75;
    return pnl > 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.monthLabels} style={{ gridTemplateColumns: `repeat(${weeks.length}, 17px)` }}>
        {weeks.map((_, i) => {
          const marker = monthMarkers.find(m => m.index === i);
          return <div key={i} className={styles.monthLabel}>{marker ? marker.label : ''}</div>;
        })}
      </div>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${weeks.length}, 14px)` }}>
        {weeks.map((week, wi) => (
          week.map((day, di) => (
            <div
              key={day.key}
              className={styles.cell}
              style={{ background: colorFor(day.pnl), gridColumn: wi + 1, gridRow: di + 1 }}
              onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, day })}
              onMouseMove={(e) => setHover(h => h && { ...h, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
            />
          ))
        ))}
      </div>
      <div className={styles.legend}>
        <span>Loss</span>
        <div className={styles.legendCell} style={{ background: 'rgba(239, 68, 68, 0.75)' }} />
        <div className={styles.legendCell} style={{ background: isDark ? '#2A3441' : '#e2e8f0' }} />
        <div className={styles.legendCell} style={{ background: 'rgba(16, 185, 129, 0.75)' }} />
        <span>Profit</span>
      </div>
      {hover && (
        <div className={styles.tooltip} style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <strong>{hover.day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
          <br />
          {hover.day.pnl === 0
            ? 'No closed trades'
            : `${hover.day.pnl > 0 ? '+' : ''}${currencySymbol}${hover.day.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        </div>
      )}
    </div>
  );
};

export default CalendarHeatmap;
