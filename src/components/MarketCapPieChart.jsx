import React from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { useTheme } from '../contexts/ThemeContext';

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

const MarketCapPieChart = ({ investments }) => {
  const { theme } = useTheme();
  const { labels, data } = getMarketCapData(investments);
  
  // Get colors based on theme
  const textColor = theme === 'light' ? '#6B7280' : '#9CA3AF';
  const borderColor = theme === 'light' ? '#FFFFFF' : '#1F2937';
  const mutedTextColor = theme === 'light' ? '#9CA3AF' : '#6B7280';
  
  if (!labels.length) return <div style={{ color: mutedTextColor, fontSize: 13 }}>No market cap data</div>;
  
  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            data,
            backgroundColor: palette,
            borderWidth: 2,
            borderColor: borderColor,
            hoverOffset: 8
          }
        ]
      }}
      options={{
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: { color: textColor, font: { size: 10 } }
          },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ₹${ctx.parsed.toLocaleString()}` } }
        },
        responsive: true,
        maintainAspectRatio: false
      }}
      height={220}
    />
  );
};

export default MarketCapPieChart;
