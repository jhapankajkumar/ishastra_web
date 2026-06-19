import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { useTheme } from '../contexts/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthLabel(date) {
  return `${MONTHS[date.getMonth()]} '${String(date.getFullYear()).slice(2)}`;
}

// Build monthly portfolio value from exit transactions + open position unrealized P&L
function buildTradePortfolioHistory(trades, initialCapital) {
  if (!Array.isArray(trades) || trades.length === 0) return { labels: [], portfolioValue: [] };

  // Flatten all exit transactions with their realized P&L
  const allExits = [];
  trades.forEach(trade => {
    const entry = Number(trade.entryPrice || 0);
    const sign = (trade.direction || 'long').toLowerCase() === 'long' ? 1 : -1;
    const txs = trade.exitTransactions || [];

    if (txs.length === 0 && trade.exitPrice != null && trade.exitDate) {
      const soldQty = Number(trade.quantity || 0) - Number(trade.remainingQuantity || 0);
      if (soldQty > 0) {
        allExits.push({ date: new Date(trade.exitDate), pnl: sign * (Number(trade.exitPrice) - entry) * soldQty });
      }
    } else {
      txs.forEach(tx => {
        if (!tx.transactionDate || tx.price == null || tx.quantity == null) return;
        const d = typeof tx.transactionDate === 'number' ? new Date(tx.transactionDate) : new Date(tx.transactionDate);
        if (isNaN(d)) return;
        allExits.push({ date: d, pnl: sign * (Number(tx.price) - entry) * Number(tx.quantity) });
      });
    }
  });

  // Open/partial positions — spread their unrealized P&L from entry month onwards
  const openTrades = trades.filter(t => Number(t.remainingQuantity || 0) > 0 && t.entryDate && t.currentPrice);

  allExits.sort((a, b) => a.date - b.date);

  // Determine start date: earliest of first exit or first open trade entry
  const allStartDates = [
    ...(allExits.length ? [allExits[0].date] : []),
    ...openTrades.map(t => new Date(t.entryDate)),
  ];
  if (allStartDates.length === 0) return { labels: [], portfolioValue: [] };
  const firstDate = new Date(Math.min(...allStartDates.map(d => d.getTime())));

  // Group cumulative realized P&L deltas by month
  const realizedByMonth = new Map();
  let cumRealized = 0;
  allExits.forEach(exit => {
    cumRealized += exit.pnl;
    const key = getMonthLabel(exit.date);
    realizedByMonth.set(key, cumRealized);
  });

  // Fill month timeline
  const now = new Date();
  const result = [];
  let d = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  let lastRealized = 0;

  while (d <= now) {
    const key = getMonthLabel(d);
    if (realizedByMonth.has(key)) lastRealized = realizedByMonth.get(key);

    // Unrealized: only include trades that were already open at month d
    let unrealized = 0;
    openTrades.forEach(trade => {
      const entryMonth = new Date(new Date(trade.entryDate).getFullYear(), new Date(trade.entryDate).getMonth(), 1);
      if (entryMonth <= d) {
        const remQty = Number(trade.remainingQuantity || 0);
        const entry = Number(trade.entryPrice || 0);
        const current = Number(trade.currentPrice || 0);
        const sign = (trade.direction || 'long').toLowerCase() === 'long' ? 1 : -1;
        unrealized += sign * (current - entry) * remQty;
      }
    });

    result.push({ label: key, value: parseFloat((initialCapital + lastRealized + unrealized).toFixed(2)) });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }

  return {
    labels: result.map(r => r.label),
    portfolioValue: result.map(r => r.value),
  };
}

// Build monthly investment value history (for investments tab)
function getInvestmentValueHistory(investments) {
  if (!Array.isArray(investments) || investments.length === 0) return { labels: [], invested: [], totalValue: [] };
  const sorted = [...investments].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  let invested = 0, totalVal = 0;
  const labels = [], investedArr = [], totalValueArr = [];
  sorted.forEach((inv, idx) => {
    const date = inv.createdAt ? new Date(inv.createdAt) : new Date(Date.now() - (sorted.length - idx) * 86400000);
    const invAmount = (inv.avgBuyPrice || 0) * (inv.quantity || 0);
    invested += invAmount;
    const currVal = (inv.currentPrice != null ? inv.currentPrice : inv.avgBuyPrice || 0) * (inv.quantity || 0);
    totalVal += currVal;
    labels.push(date.toLocaleDateString());
    investedArr.push(invested);
    totalValueArr.push(totalVal);
  });
  return { labels, invested: investedArr, totalValue: totalValueArr };
}

const InvestmentValueChart = ({ investments, isTrade = false, initialCapital = 0 }) => {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#6B7280' : '#94a3b8';

  if (isTrade) {
    const { labels, portfolioValue } = buildTradePortfolioHistory(investments, initialCapital);
    if (!labels.length) return <div style={{ color: '#9CA3AF', fontSize: 14, padding: 20 }}>No exit history to display</div>;

    const isUp = portfolioValue.length > 0 && portfolioValue[portfolioValue.length - 1] >= (portfolioValue[0] || initialCapital);
    const lineColor = isUp ? '#10B981' : '#EF4444';
    const fillColor = isUp ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';

    return (
      <Line
        data={{
          labels,
          datasets: [{
            label: "Portfolio Value",
            data: portfolioValue,
            fill: true,
            borderColor: lineColor,
            backgroundColor: fillColor,
            pointRadius: labels.length > 24 ? 0 : 3,
            pointBackgroundColor: lineColor,
            borderWidth: 2,
            tension: 0.4
          }]
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? 'rgba(26,34,51,0.95)' : 'rgba(255,255,255,0.97)',
              titleColor: isDark ? '#fff' : '#1e293b',
              bodyColor: isDark ? '#E5E7EB' : '#475569',
              borderColor: lineColor,
              borderWidth: 1,
              padding: 10,
              callbacks: {
                label: ctx => {
                  const v = ctx.parsed.y;
                  const diff = v - initialCapital;
                  const pct = initialCapital > 0 ? ((diff / initialCapital) * 100).toFixed(2) : '0.00';
                  return `Portfolio: ₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}  (${diff >= 0 ? '+' : ''}${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 }, maxRotation: 45 } },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: tickColor, font: { size: 10 },
                callback: v => v >= 1000 ? `₹${Math.round(v / 1000)}K` : `₹${v}`
              }
            }
          }
        }}
      />
    );
  }

  // Investment tab — original behaviour
  const { labels, invested, totalValue } = getInvestmentValueHistory(investments);
  if (!labels.length) return <div style={{ color: '#9CA3AF', fontSize: 14 }}>No investment history data</div>;

  return (
    <Line
      data={{
        labels,
        datasets: [
          { label: "Invested Amount", data: invested, fill: false, borderColor: "#F59E0B", backgroundColor: "#F59E0B", pointRadius: 2, borderWidth: 2.5, tension: 0.55 },
          { label: "Total Value (with Profit)", data: totalValue, fill: false, borderColor: "#6366F1", backgroundColor: "#6366F1", pointRadius: 2, borderWidth: 2.5, tension: 0.55 }
        ]
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: true, labels: { color: isDark ? '#E5E7EB' : '#475569', font: { size: 11 } } },
          tooltip: {
            mode: 'index', intersect: false,
            backgroundColor: isDark ? 'rgba(26,34,51,0.95)' : 'rgba(255,255,255,0.95)',
            titleColor: isDark ? '#fff' : '#1e293b',
            bodyColor: isDark ? '#E5E7EB' : '#475569',
            borderColor: isDark ? '#374151' : '#e2e8f0', borderWidth: 1
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } }
        }
      }}
    />
  );
};

export default InvestmentValueChart;
