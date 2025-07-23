import React from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Header.module.css";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/trades", label: "Trades" },
  { to: "/trades/new", label: "Add Trade" },
  { to: "/journal", label: "Journal" },
  { to: "/journal/new", label: "Add Journal" },
  { to: "/risk-management", label: "Risk Management" }
  // Add more links if you add more routes
];

export default function Header() {
  const location = useLocation();
  
  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.logo}>
          <span className={styles.logoText}>
            Ishastra
          </span>
        </div>
        <nav className={styles.nav}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`${styles.navLink} ${location.pathname === link.to ? styles.navLinkActive : ''}`}
            >
              {link.label}
              {location.pathname === link.to && (
                <div className={styles.activeIndicator} />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}