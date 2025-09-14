import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { getMarketIndices } from "../api/marketApi";
import { useTheme } from "../contexts/ThemeContext";
import styles from "./Header.module.css";

const navLinks = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/watchlist", label: "Watchlist", special: false, icon: "👀" },
  { to: "/trades", label: "Trades", icon: "💼" },
  { to: "/chart", label: "Chart", icon: "📈" },
  { to: "/investments", label: "Investments", icon: "💰" },
  { to: "/recommendations", label: "Recommendations", icon: "💡" },
  { to: "/journal", label: "Journal", icon: "📝" },
  { to: "/risk-management", label: "Risk Management", icon: "⚖️" },
  { to: "/analysis", label: "Analysis", special: true, icon: "🔍" },
];

export default function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [indices, setIndices] = useState({
    nifty50: { value: null, change: null, changePercent: null },
    sensex: { value: null, change: null, changePercent: null },
    nasdaq: { value: null, change: null, changePercent: null },
    dowjones: { value: null, change: null, changePercent: null }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const data = await getMarketIndices();
        setIndices(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch market indices:', error);
        // Set mock data for demo purposes if API fails
        setIndices({
          nifty50: { value: 24500.45, change: 125.30, changePercent: 0.51 },
          sensex: { value: 80234.15, change: -89.45, changePercent: -0.11 },
          nasdaq: { value: 17633.11, change: 85.54, changePercent: 0.49 },
          dowjones: { value: 39497.54, change: -234.85, changePercent: -0.59 }
        });
        setLoading(false);
      }
    };

    fetchIndices();
    // Refresh every 5 minutes
    const interval = setInterval(fetchIndices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        <div className={styles.leftSection}>
          <div className={styles.logo}>
            <span className={styles.logoText}>Ishastra</span>
          </div>
          <div className={styles.indicesContainer}>
            {/* ...existing index code... */}
            {/* ...existing code for indices... */}
            <div className={styles.indexItem}><span className={styles.indexName}>NIFTY</span><span className={styles.indexValue}>{loading ? '...' : (indices.nifty50.value ? indices.nifty50.value.toLocaleString('en-IN', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.nifty50.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.nifty50.changePercent >= 0 ? '+' : ''}${indices.nifty50.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
            <div className={styles.indexItem}><span className={styles.indexName}>SENSEX</span><span className={styles.indexValue}>{loading ? '...' : (indices.sensex.value ? indices.sensex.value.toLocaleString('en-IN', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.sensex.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.sensex.changePercent >= 0 ? '+' : ''}${indices.sensex.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
            <div className={styles.indexItem}><span className={styles.indexName}>NASDAQ</span><span className={styles.indexValue}>{loading ? '...' : (indices.nasdaq.value ? indices.nasdaq.value.toLocaleString('en-US', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.nasdaq.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.nasdaq.changePercent >= 0 ? '+' : ''}${indices.nasdaq.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
            <div className={styles.indexItem}><span className={styles.indexName}>DOW</span><span className={styles.indexValue}>{loading ? '...' : (indices.dowjones.value ? indices.dowjones.value.toLocaleString('en-US', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.dowjones.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.dowjones.changePercent >= 0 ? '+' : ''}${indices.dowjones.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
          </div>
        </div>
        {/* Top Navigation: Dashboard, Trades, Watchlist */}
        <nav className={styles.nav}>
          {navLinks.slice(0, 3).map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`${styles.navLink} ${location.pathname === link.to ? styles.navLinkActive : ''}`}
            >
              <span className={styles.navIcon}>{link.icon}</span>
              {link.label}
              {location.pathname === link.to && (
                <div className={styles.activeIndicator} />
              )}
            </Link>
          ))}
          {/* Side Menu Toggle Button */}
          <button 
            className={styles.sideMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Open menu"
          >
            <span className={styles.navIcon}>☰</span>
          </button>
          {/* Theme Toggle Button */}
          <button 
            className={styles.themeToggle}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
        {/* Side Menu Overlay */}
        {mobileMenuOpen && (
          <div className={styles.sideMenuOverlay} onClick={() => setMobileMenuOpen(false)}>
            <nav className={`${styles.sideMenu} ${styles.sideMenuRight}`} onClick={e => e.stopPropagation()}>
              <div className={styles.sideMenuHeader}>
                <span className={styles.logoText}>Menu</span>
                <button className={styles.closeButton} onClick={() => setMobileMenuOpen(false)}>✕</button>
              </div>
              <div className={styles.sideMenuItems}>
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`${styles.sideMenuItem} ${location.pathname === link.to ? styles.sideMenuItemActive : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className={styles.navIcon}>{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}