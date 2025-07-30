import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function getInvestmentValueHistory(investments) {
  // Generate a time series of investment value over time
  // For demo: use createdAt or fallback to index, and accumulate value
  if (!Array.isArray(investments) || investments.length === 0) return { labels: [], data: [] };
  // Sort by date (if available)
  const sorted = [...investments].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt) : new Date();
    const db = b.createdAt ? new Date(b.createdAt) : new Date();
    return da - db;
  });
  let total = 0;
  const labels = [];
  const data = [];
  sorted.forEach((inv, idx) => {
    const date = inv.createdAt ? new Date(inv.createdAt) : new Date(Date.now() - (sorted.length - idx) * 86400000);
    total += (inv.avgBuyPrice || 0) * (inv.quantity || 0);
    labels.push(date.toLocaleDateString());
    data.push(total);
  });
  return { labels, data };
}

const InvestmentValueChart = ({ investments }) => {
  const { labels, data } = getInvestmentValueHistory(investments);
  if (!labels.length) return <div style={{ color: '#9CA3AF', fontSize: 16 }}>No investment history data</div>;
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: "Investment Value",
            data,
            fill: true,
            backgroundColor: "rgba(59,130,246,0.08)",
            borderColor: "#3B82F6",
            pointRadius: 3,
            tension: 0.3
          }
        ]
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
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
        }
      }}
    />
  );
};

export default InvestmentValueChart;
