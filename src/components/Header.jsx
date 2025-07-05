import React from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "../pages/Dashboard.module.css"; // Import the CSS module

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/trades", label: "Trades" },
  { to: "/trades/new", label: "Add Trade" }
  // Add more links if you add more routes
];

export default function Header() {
  const location = useLocation();
  return (
    <header
      style={{
        background: "#181f2a",
        color: "#fff",
        borderBottom: "1px solid #222b3a",
        width: "80vw",
        maxWidth: "1400px",
        margin: "0 auto",
        boxSizing: "border-box"
      }}
    >
      <div className={styles.headerContainer}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* <img src="https://via.placeholder.com/36" alt="Ishastra Logo" style={{ height: 36 }} /> */}
          <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: 1 }}>Ishastra</span>
        </div>
        <nav style={{ display: "flex", gap: 28 }}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                color: location.pathname === link.to ? "#4f8cff" : "#fff",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 16
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}