import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import PageHeader from "../components/PageHeader";
import { createTrade, updateTrade, addPostAnalysis, fetchExitTactics, fetchSetups } from '../api/tradeApi';

const initialState = {
  ticker: "",
  symbol: "",
  reasonForEntry: "",
  entryCharts: [],
  entryDate: "",
  entryOrderPrice: "",
  entryFilledShares: "",
  exitDate: "",
  exitOrderPrice: "",
  exitFilledShares: "",
  reasonForExit: "",
  exitTactic: "",
  exitCharts: [],
  postTradeAnalysis: "",
  postTradeFiles: [],
  setupType: "",
};

function mapTradeDataToForm(tradeData) {
  return {
    ...initialState,
    ticker: tradeData.ticker || "",
    reasonForEntry: tradeData.reason_for_entry || "",
    entryDate: tradeData.entry_date ? tradeData.entry_date.slice(0, 10) : "",
    entryOrderPrice: tradeData.entry_price ?? "",
    entryFilledShares: tradeData.entry_filled_shares ?? tradeData.quantity ?? "",
    exitDate: tradeData.exit_date ? tradeData.exit_date.slice(0, 10) : "",
    exitOrderPrice: tradeData.exit_order_price ?? "",
    exitFilledShares: tradeData.exit_filled_shares ?? "",
    reasonForExit: tradeData.reason_for_exit ?? "",
    exitTactic: tradeData.exit_tactic_id ?? "",
    postTradeAnalysis: tradeData.post_trade_analysis ?? "",
    entryCharts: [],
    exitCharts: [],
    postTradeFiles: [],
    id: tradeData.id,
    setupType: tradeData.trade_setup_id ?? "",
  };
}

export default function TradeLog({ mode = "add", tradeData = null, onSubmit }) {
  // mode: "add" | "update" | "review"
  const [form, setForm] = useState(tradeData ? mapTradeDataToForm(tradeData) : initialState);
  const [exitTactics, setExitTactics] = useState([]);
  const [setups, setSetups] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExitTactics()
      .then(res => setExitTactics(res.data))
      .catch(() => setExitTactics([]));
  }, []);

  useEffect(() => {
    fetchSetups()
      .then(res => setSetups(res.data))
      .catch(() => setSetups([]));
  }, []);

  // Update form if tradeData changes (for update/review)
  useEffect(() => {
    if (tradeData) setForm(mapTradeDataToForm(tradeData));
  }, [tradeData]);

  const isAdd = mode === "add";
  const isUpdate = mode === "update";
  const isReview = mode === "review";

  // Helper for disabling fields
  const entryDisabled = isUpdate || isReview;
  const exitDisabled = isAdd || isReview;
  const postDisabled = isAdd || isUpdate;

  // Handle text/number input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file input
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: Array.from(files) }));
  };

  // Submit handler (replace with your API call)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAdd) {
      await createTrade(form);
      alert("Trade added!");
      navigate("/trades", { replace: true });
      window.location.reload();
      return;
    } else if (isUpdate) {
      await updateTrade(form.id, form);
      alert("Trade updated!");
    } else if (isReview) {
      await addPostAnalysis(form.id, { postTradeAnalysis: form.postTradeAnalysis, postTradeFiles: form.postTradeFiles });
      alert("Post trade analysis saved!");
    }
    if (onSubmit) onSubmit();
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Only show header if not being used as a nested component */}
      {!onSubmit && (
        <PageHeader 
          title={isAdd ? "Add New Trade" : isUpdate ? "Update Trade Exit" : "Review Trade"}
          subtitle={isAdd ? "Enter the details for your new trade" : isUpdate ? "Update the exit details for this trade" : "Add your post-trade analysis"}
        />
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Entry Section */}
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid #2A3441"
        }}>
          <h3 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#fff",
            margin: "0 0 20px 0"
          }}>
            Entry Details
          </h3>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              display: "block",
              marginBottom: 8
            }}>
              Ticker Symbol
            </label>
            <input
              type="text"
              name="ticker"
              value={form.ticker}
              onChange={handleChange}
              style={{
                width: "200px",
                padding: "12px 16px",
                fontSize: "16px",
                border: "1px solid #2A3441",
                borderRadius: "8px",
                backgroundColor: entryDisabled ? "#0F1419" : "#1A2332",
                color: "#E5E7EB",
                outline: "none"
              }}
              placeholder="e.g. AAPL"
              required
              disabled={entryDisabled}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              display: "block",
              marginBottom: 8
            }}>
              Reason for Entry
            </label>
            <textarea
              name="reasonForEntry"
              value={form.reasonForEntry}
              onChange={handleChange}
              rows={4}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: "15px",
                border: "1px solid #2A3441",
                borderRadius: "8px",
                backgroundColor: entryDisabled ? "#0F1419" : "#1A2332",
                color: "#E5E7EB",
                outline: "none",
                resize: "vertical",
                lineHeight: "1.5",
                boxSizing: "border-box"
              }}
              placeholder="Describe your reason for entry..."
              disabled={entryDisabled}
            />
          </div>

          <div>
            <label style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              display: "block",
              marginBottom: 8
            }}>
              Entry Chart(s)
            </label>
            <input
              type="file"
              name="entryCharts"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={entryDisabled}
              style={{
                padding: "8px",
                border: "1px solid #2A3441",
                borderRadius: "8px",
                backgroundColor: entryDisabled ? "#0F1419" : "#1A2332",
                color: "#E5E7EB"
              }}
            />
          </div>
        </div>

        {/* Entry Details Grid */}
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          border: "1px solid #2A3441"
        }}>
          <h3 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#4F46E5",
            margin: "0 0 20px 0"
          }}>
            Entry Information
          </h3>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 20,
            marginBottom: 20
          }}>
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Entry Date
              </label>
              <input
                type="date"
                name="entryDate"
                value={form.entryDate}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "1px solid #2A3441",
                  borderRadius: "8px",
                  backgroundColor: entryDisabled ? "#0F1419" : "#1A2332",
                  color: "#E5E7EB",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                disabled={entryDisabled}
              />
            </div>                <div>
                  <label style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#9CA3AF",
                    display: "block",
                    marginBottom: 8
                  }}>
                    Average Price ($)
                  </label>
                  <input
                    type="text"
                    name="entryOrderPrice"
                    value={form.entryOrderPrice || ""}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "16px",
                      border: "1px solid #2A3441",
                      borderRadius: "8px",
                      backgroundColor: entryDisabled ? "#0F1419" : "#1A2332",
                      color: "#E5E7EB",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    placeholder="0.00"
                    disabled={entryDisabled}
                  />
                </div>
          </div>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 20
          }}>
            
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Quantity
              </label>
              <input
                type="text"
                name="entryFilledShares"
                value={form.entryFilledShares || ""}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "1px solid #2A3441",
                  borderRadius: "8px",
                  backgroundColor: entryDisabled ? "#0F1419" : "#1A2332",
                  color: "#E5E7EB",
                  outline: "none",
                  boxSizing: "border-box"
                }}
                placeholder="0"
                disabled={entryDisabled}
              />
            </div>
            
            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Setup Type
              </label>
              {isReview ? (
                <div style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "16px",
                  border: "1px solid #2A3441",
                  borderRadius: "8px",
                  backgroundColor: "#0F1419",
                  color: "#E5E7EB",
                  boxSizing: "border-box"
                }}>
                  {setups.find(setup => (setup.id || setup.trade_setup_id) == form.setupType)?.name || "N/A"}
                </div>
              ) : (
                <select
                  name="setupType"
                  value={form.setupType}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "16px",
                    border: "1px solid #2A3441",
                    borderRadius: "8px",
                    backgroundColor: "#1A2332",
                    color: "#E5E7EB",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  required
                >
                  <option value="">Select setup...</option>
                  {setups.map((setup) => (
                    <option key={setup.id || setup.trade_setup_id} value={setup.id || setup.trade_setup_id}>
                      {setup.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Exit Section */}
        {!isAdd && (
          <>
            {/* Exit Details Grid */}
            <div style={{
              backgroundColor: "#1A2332",
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              border: "1px solid #2A3441"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#F59E0B",
                margin: "0 0 20px 0"
              }}>
                Exit Information
              </h3>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20,
                marginBottom: 20
              }}>
                <div>
                  <label style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#9CA3AF",
                    display: "block",
                    marginBottom: 8
                  }}>
                    Exit Date
                  </label>
                  <input
                    type="date"
                    name="exitDate"
                    value={form.exitDate}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "16px",
                      border: "1px solid #2A3441",
                      borderRadius: "8px",
                      backgroundColor: exitDisabled ? "#0F1419" : "#1A2332",
                      color: "#E5E7EB",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    disabled={exitDisabled}
                  />
                </div>
                
                <div>
                  <label style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#9CA3AF",
                    display: "block",
                    marginBottom: 8
                  }}>
                    Average Price ($)
                  </label>
                  <input
                    type="text"
                    name="exitOrderPrice"
                    value={form.exitOrderPrice || ""}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "16px",
                      border: "1px solid #2A3441",
                      borderRadius: "8px",
                      backgroundColor: exitDisabled ? "#0F1419" : "#1A2332",
                      color: "#E5E7EB",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    placeholder="0.00"
                    disabled={exitDisabled}
                  />
                </div>
              </div>
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 20
              }}>
                <div>
                  <label style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#9CA3AF",
                    display: "block",
                    marginBottom: 8
                  }}>
                    Quantity
                  </label>
                  <input
                    type="text"
                    name="exitFilledShares"
                    value={form.exitFilledShares || ""}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "16px",
                      border: "1px solid #2A3441",
                      borderRadius: "8px",
                      backgroundColor: exitDisabled ? "#0F1419" : "#1A2332",
                      color: "#E5E7EB",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    placeholder="0"
                    disabled={exitDisabled}
                  />
                </div>
                
                <div>
                  <label style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#9CA3AF",
                    display: "block",
                    marginBottom: 8
                  }}>
                    Exit Tactic
                  </label>
                  <select
                    name="exitTactic"
                    value={form.exitTactic}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "16px",
                      border: "1px solid #2A3441",
                      borderRadius: "8px",
                      backgroundColor: exitDisabled ? "#0F1419" : "#1A2332",
                      color: "#E5E7EB",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                    disabled={exitDisabled}
                  >
                    <option value="">Select tactic...</option>
                    {exitTactics.map((t) => (
                      <option key={t.tactic_id || t.id} value={t.tactic_id || t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Exit Analysis */}
            <div style={{
              backgroundColor: "#1A2332",
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              border: "1px solid #2A3441"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#F59E0B",
                margin: "0 0 20px 0"
              }}>
                Exit Analysis
              </h3>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9CA3AF",
                  display: "block",
                  marginBottom: 8
                }}>
                  Reason for Exit
                </label>
                <textarea
                  name="reasonForExit"
                  value={form.reasonForExit}
                  onChange={handleChange}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "15px",
                    border: "1px solid #2A3441",
                    borderRadius: "8px",
                    backgroundColor: exitDisabled ? "#0F1419" : "#1A2332",
                    color: "#E5E7EB",
                    outline: "none",
                    resize: "vertical",
                    lineHeight: "1.5",
                    boxSizing: "border-box"
                  }}
                  placeholder="Describe your reason for exit..."
                  disabled={exitDisabled}
                />
              </div>

              <div>
                <label style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#9CA3AF",
                  display: "block",
                  marginBottom: 8
                }}>
                  Exit Chart(s)
                </label>
                <input
                  type="file"
                  name="exitCharts"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={exitDisabled}
                  style={{
                    padding: "8px",
                    border: "1px solid #2A3441",
                    borderRadius: "8px",
                    backgroundColor: exitDisabled ? "#0F1419" : "#1A2332",
                    color: "#E5E7EB"
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Post Trade Analysis */}
        {isReview && (
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            border: "1px solid #2A3441"
          }}>
            <h3 style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#8B5CF6",
              margin: "0 0 20px 0"
            }}>
              Post Trade Analysis
            </h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Analysis Notes
              </label>
              <textarea
                name="postTradeAnalysis"
                value={form.postTradeAnalysis}
                onChange={handleChange}
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "15px",
                  border: "1px solid #2A3441",
                  borderRadius: "8px",
                  backgroundColor: postDisabled ? "#0F1419" : "#1A2332",
                  color: "#E5E7EB",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.5",
                  boxSizing: "border-box"
                }}
                placeholder="Your notes or analysis..."
                disabled={postDisabled}
              />
            </div>

            <div>
              <label style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#9CA3AF",
                display: "block",
                marginBottom: 8
              }}>
                Post Trade Files
              </label>
              <input
                type="file"
                name="postTradeFiles"
                multiple
                onChange={handleFileChange}
                disabled={postDisabled}
                style={{
                  padding: "8px",
                  border: "1px solid #2A3441",
                  borderRadius: "8px",
                  backgroundColor: postDisabled ? "#0F1419" : "#1A2332",
                  color: "#E5E7EB"
                }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: "16px 32px",
            fontSize: "16px",
            fontWeight: "600",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
            color: "#fff",
            border: "none",
            marginTop: 32,
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)"
          }}
          onMouseOver={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.4)";
          }}
          onMouseOut={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.3)";
          }}
        >
          {isAdd ? "Add Trade" : isUpdate ? "Update Trade" : "Save Analysis"}
        </button>
      </form>
    </div>
  );
}