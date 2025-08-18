import React from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";
import { useTheme } from '../contexts/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

function getSectorData(investments) {
  const sectorMap = {};
  investments.forEach(inv => {
    const sector = inv.sector.toUpperCase() || 'Other';
    const value = (inv.currentPrice || 0) * (inv.quantity || 0);
    sectorMap[sector] = (sectorMap[sector] || 0) + value;
  });
  const labels = Object.keys(sectorMap);
  const data = Object.values(sectorMap);
  return { labels, data };
}

const palette = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#F472B6', '#FBBF24', '#6EE7B7', '#818CF8', '#F87171', '#A3E635', '#FDE68A'
];

const SectorDonutChart = ({ investments }) => {
  const { theme } = useTheme();
  const { labels, data } = getSectorData(investments);
  
  // Get colors based on theme
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
  const mutedTextColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
  
  if (!labels.length) return <div style={{ color: mutedTextColor, fontSize: 16 }}>No sector data</div>;
  return (
    <Doughnut
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
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false
      }}
      height={220}
    />
  );
};

export default SectorDonutChart;
