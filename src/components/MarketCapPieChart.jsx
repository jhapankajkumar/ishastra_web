import React from "react";
import { useTheme } from '../contexts/ThemeContext';
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function getMarketCapData(investments) {
  const capMap = {};
  investments.forEach(inv => {
    const cap = inv.marketCap.toUpperCase() || 'UNKNOWN';
    const value = (inv.currentPrice || 0) * (inv.quantity || 0);
    capMap[cap] = (capMap[cap] || 0) + value;
  });
  const labels = Object.keys(capMap);
  const data = Object.values(capMap);
  return { labels, data };
}

const palette = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#F472B6', '#FBBF24', '#6EE7B7', '#818CF8', '#F87171', '#A3E635', '#FDE68A'
];

const MarketCapPieChart = ({ investments, currencySymbol = "₹" }) => {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const legendColor = isDark ? '#E5E7EB' : '#475569';
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 700;
  const { labels, data } = getMarketCapData(investments);
  if (!labels.length) return <div style={{ color: '#9CA3AF', fontSize: 13 }}>No market cap data</div>;
  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            data,
            backgroundColor: palette,
            borderWidth: 2,
            borderColor: '#181F2A',
            hoverOffset: 8
          }
        ]
      }}
      options={{
        plugins: {
          legend: {
            display: true,
            position: isSmall ? 'bottom' : 'right',
            align: 'center',
            labels: { color: legendColor, font: { size: isSmall ? 9 : 10 }, boxWidth: 10, boxHeight: 10, padding: 10, usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${currencySymbol}${ctx.parsed.toLocaleString()}` } }
        },
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: isSmall ? 0 : 8 } }
      }}
    />
  );
};

export default MarketCapPieChart;
