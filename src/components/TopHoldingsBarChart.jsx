import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function getTopHoldings(investments, topN = 10) {
  const sorted = [...investments]
    .map(inv => {
      const invested = (inv.avgBuyPrice || 0) * (inv.quantity || 0);
      const currentValue = (inv.currentPrice || 0) * (inv.quantity || 0);
      const profit = currentValue - invested;
      return {
        ticker: inv.ticker,
        invested,
        profit: profit > 0 ? profit : 0, // Only show positive profit in green
        loss: profit < 0 ? Math.abs(profit) : 0, // Optionally, could show loss in red
        currentValue
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, topN);
  return {
    labels: sorted.map(x => x.ticker),
    invested: sorted.map(x => x.invested),
    profit: sorted.map(x => x.profit),
    // loss: sorted.map(x => x.loss), // For future use if you want to show loss in red
    currentValue: sorted.map(x => x.currentValue)
  };
}

const TopHoldingsBarChart = ({ investments }) => {
  const { labels, invested, profit, currentValue } = getTopHoldings(investments);
  if (!labels.length) return <div style={{ color: '#9CA3AF', fontSize: 16 }}>No holdings data</div>;
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Invested Amount",
            data: invested,
            backgroundColor: '#F59E42', // Orange
            borderRadius: 8,
            maxBarThickness: 32,
            stack: 'stack1',
          },
          {
            label: "Profit",
            data: profit,
            backgroundColor: '#6366F1', // Indigo
            borderRadius: 8,
            maxBarThickness: 32,
            stack: 'stack1',
          }
        ]
      }}
      options={{
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const label = ctx.dataset.label || '';
                return `${label}: ₹${ctx.parsed.y.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: "rgba(156,163,175,0.08)" },
            ticks: { color: "#9CA3AF" }
          },
          y: {
            stacked: true,
            grid: { color: "rgba(156,163,175,0.08)" },
            ticks: { color: "#9CA3AF" }
          }
        },
        responsive: true,
        maintainAspectRatio: false,
        height: 220
      }}
      height={220}
    />
  );
};

export default TopHoldingsBarChart;
