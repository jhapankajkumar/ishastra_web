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
import { getPartialPL } from "../common/Helper";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function getInvestmentValueHistory(investments, isTrade ) {
  if (!Array.isArray(investments) || investments.length === 0) {
    console.log("No investments data available");
    return { labels: [], invested: [], totalValue: [] };
  }
  if (!Array.isArray(investments) || investments.length === 0) return { labels: [], invested: [], totalValue: [] };
  // Sort by date (if available)
  const sorted = [...investments].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt) : new Date();
    const db = b.createdAt ? new Date(b.createdAt) : new Date();
    return da - db;
  });
  let invested = 0;
  let totalVal = 0;
  const labels = [];
  const investedArr = [];
  const totalValueArr = [];
  if (isTrade == true) {
    sorted.forEach((inv, idx) => {
      const date = inv.createdAt ? new Date(inv.createdAt) : new Date(Date.now() - (sorted.length - idx) * 86400000);
      const invAmount = (inv.entryPrice || 0) * (inv.quantity || 0);
      const profit =  Number(getPartialPL(inv));
      const currVal = invAmount + profit;
      invested += invAmount;
      // For total value, use currentPrice if available, else avgBuyPrice
      totalVal += currVal;
      labels.push(date.toLocaleDateString());
      investedArr.push(invested);
      totalValueArr.push(totalVal);
    });
    return { labels, invested: investedArr, totalValue: totalValueArr };
  } else {
    sorted.forEach((inv, idx) => {
      const date = inv.createdAt ? new Date(inv.createdAt) : new Date(Date.now() - (sorted.length - idx) * 86400000);
      const invAmount = (inv.avgBuyPrice || 0) * (inv.quantity || 0);
      invested += invAmount;
      // For total value, use currentPrice if available, else avgBuyPrice
      const currVal = (inv.currentPrice != null ? inv.currentPrice : inv.avgBuyPrice || 0) * (inv.quantity || 0);
      totalVal += currVal;
      labels.push(date.toLocaleDateString());
      investedArr.push(invested);
      totalValueArr.push(totalVal);
    });
    return { labels, invested: investedArr, totalValue: totalValueArr };
  }

}

const InvestmentValueChart = ({ investments, isTrade = false }) => {
  const { labels, invested, totalValue } = getInvestmentValueHistory(investments, isTrade);
  if (!labels.length) return <div style={{ color: '#9CA3AF', fontSize: 16 }}>No investment history data</div>;
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: "Invested Amount",
            data: invested,
            fill: false,
            borderColor: "#F59E0B",
            backgroundColor: "#F59E0B",
            pointRadius: 2,
            pointBackgroundColor: '#F59E0B',
            borderWidth: 2.5,
            tension: 0.55
          },
          {
            label: "Total Value (with Profit)",
            data: totalValue,
            fill: false,
            borderColor: "#6366F1",
            backgroundColor: "#6366F1",
            pointRadius: 2,
            pointBackgroundColor: '#6366F1',
            borderWidth: 2.5,
            tension: 0.55
          }
        ]
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: true, labels: { color: '#E5E7EB', font: { size: 11 } } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            grid: { color: "rgba(156,163,175,0.08)" },
            ticks: { color: "#9CA3AF", font: { size: 10 } }
          },
          y: {
            grid: { color: "rgba(156,163,175,0.08)" },
            ticks: { color: "#9CA3AF", font: { size: 10 } }
          }
        }
      }}
    />
  );
};

export default InvestmentValueChart;
