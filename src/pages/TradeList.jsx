import React, { useEffect, useState } from "react";
import { getAllTrades, getTradeById } from "../api/tradeApi";
import TradeLog from "./TradeLog";
import styles from "./Dashboard.module.css";

export default function TradeList() {
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [mode, setMode] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [error, setError] = useState(false); // Add error state

  useEffect(() => {
    getAllTrades()
      .then(res => {
        const sorted = [...res.data].sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
        setTrades(sorted);
        setError(false);
      })
      .catch(err => {
        setError(true);
      });
  }, []);

  const handleEdit = async (id) => {
    try {
      const res = await getTradeById(id);
      setSelectedTrade(res.data);
      setMode("update");
    } catch (err) {
      setError(true);
    }
  };

  const handleReview = async (id) => {
    try {
      const res = await getTradeById(id);
      setSelectedTrade(res.data);
      setMode("review");
    } catch (err) {
      setError(true);
    }
  };

  const handleBack = () => {
    setSelectedTrade(null);
    setMode(null);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = d.toLocaleString('en-US', { month: 'short' });
    const yyyy = d.getFullYear();
    return `${dd} ${mmm} ${yyyy}`;
  };

  const getInvested = (trade) => {
    if (trade.entry_price && trade.quantity) {
      return (Number(trade.entry_price) * Number(trade.quantity)).toFixed(2);
    }
    return "-";
  };

  const getPL = (trade) => {
    if (
      trade.exit_price !== undefined &&
      trade.exit_price !== null &&
      trade.entry_price !== undefined &&
      trade.entry_price !== null &&
      trade.quantity !== undefined &&
      trade.quantity !== null
    ) {
      const pl = (Number(trade.exit_price) - Number(trade.entry_price)) * Number(trade.quantity);
      return pl.toFixed(2);
    }
    return "-";
  };

  // Helper to render chart images row
  const renderChartImagesRow = (trade) => {
    const entry = trade.trade_images?.find(img => img.image_type === "entry");
    const exit = trade.trade_images?.find(img => img.image_type === "exit");
    const post = trade.trade_images?.find(img => img.image_type === "post");

    const images = [
      entry && { src: entry.image_url || entry.file_path, label: "Entry Chart" },
      exit && { src: exit.image_url || exit.file_path, label: "Exit Chart" },
      post && { src: post.image_url || post.file_path, label: "Post Trade" }
    ].filter(Boolean);

    if (images.length === 0) return null;

    const justify = images.length === 1 ? "center" : "flex-start";

    return (
      <tr>
        <td colSpan={10} style={{ background: "#222b3a" }}>
          <div style={{
            display: "flex",
            justifyContent: justify,
            alignItems: "center",
            gap: 24,
            padding: "16px 0"
          }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ textAlign: "center" }}>
                <img
                  src={`http://localhost:8000/${img.src}`}
                  alt={img.label}
                  style={{ objectFit: "contain", borderRadius: 6, boxShadow: "0 2px 8px #0002", maxWidth: "100%", maxHeight: "400px" }}
                />
                <div style={{ marginTop: 8, color: "#aaa", fontSize: 14 }}>{img.label}</div>
              </div>
            ))}
          </div>
        </td>
      </tr>
    );
  };

  if (selectedTrade && mode) {
    return (
      <div>
        <button onClick={handleBack} style={{ marginBottom: 16 }}>Back to List</button>
        <TradeLog mode={mode} tradeData={selectedTrade} onSubmit={handleBack} />
      </div>
    );
  }

  if (error) {
    // Show blank page (or you can return a custom message)
    return null;
    // Or for a custom message:
    // return <div style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>Failed to load trades.</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.heading}>Trade List</h2>
      <table className={styles.tradesTableWrapper}>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Entry Date</th>
            <th>Exit Date</th>
            <th>Entry Price</th>
            <th>Quantity</th>
            <th>Exit Price</th>
            <th>Invested</th>
            <th>P&amp;L</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {trades.map(trade => (
            <React.Fragment key={trade.id}>
              <tr
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedRow(expandedRow === trade.id ? null : trade.id)}
              >
                <td>{trade.ticker}</td>
                <td>{trade.entry_date ? formatDate(trade.entry_date) : "-"}</td>
                <td>{trade.exit_date ? formatDate(trade.exit_date) : "-"}</td>
                <td>{trade.entry_price !== undefined && trade.entry_price !== null ? Number(trade.entry_price).toFixed(2) : "-"}</td>
                <td>{trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity) : "-"}</td>
                <td>{trade.exit_price !== undefined && trade.exit_price !== null ? Number(trade.exit_price).toFixed(2) : "-"}</td>
                <td>{getInvested(trade) !== "-" ? `$${getInvested(trade)}` : "-"}</td>
                <td style={{ color: getPL(trade) > 0 ? "green" : getPL(trade) < 0 ? "red" : undefined }}>
                  {getPL(trade) !== "-" ? `$${getPL(trade)}` : "-"}
                </td>
                <td>
                  {trade.exit_price
                    ? <button onClick={e => { e.stopPropagation(); handleReview(trade.id); }}>Review</button>
                    : <button onClick={e => { e.stopPropagation(); handleEdit(trade.id); }}>Update</button>
                  }
                </td>
              </tr>
              {expandedRow === trade.id && renderChartImagesRow(trade)}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}