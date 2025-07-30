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

function getTopHoldings(investments, topN = 5) {
  const sorted = [...investments]
    .map(inv => ({
      ticker: inv.ticker,
      value: (inv.currentPrice || 0) * (inv.quantity || 0)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
  return {
    labels: sorted.map(x => x.ticker),
    data: sorted.map(x => x.value)
  };
}

const TopHoldingsBarChart = ({ investments }) => {
  const { labels, data } = getTopHoldings(investments);
  if (!labels.length) return <div style={{ color: '#9CA3AF', fontSize: 16 }}>No holdings data</div>;
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Holding Value",
            data,
            backgroundColor: "#3B82F6",
            borderRadius: 8,
            maxBarThickness: 32
          }
        ]
      }}
      options={{
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `₹${ctx.parsed.y.toLocaleString()}` } }
        },
        scales: {
          x: {
            grid: { color: "rgba(156,163,175,0.08)" },
            ticks: { color: "#9CA3AF" }
          },
          y: {
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
