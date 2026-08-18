import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getMarketIndices } from "../api/marketApi";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import config from "../config/environment";
import styles from "./Header.module.css";

import SpaceDashboardOutlined from "@mui/icons-material/SpaceDashboardOutlined";
import CandlestickChartOutlined from "@mui/icons-material/CandlestickChartOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import RadarOutlined from "@mui/icons-material/RadarOutlined";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import EditNoteOutlined from "@mui/icons-material/EditNoteOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import MenuRounded from "@mui/icons-material/MenuRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";

// `access`: 'guest' (visible to everyone), 'auth' (any logged-in user),
// 'superuser' (SUPERUSER only) — see isVisible() below. This is the single
// source of truth all three nav render sites (desktop slice, mobile drawer,
// bottom bar) derive from, instead of drifting apart independently.
const navLinks = [
  { to: "/", label: "Dashboard", Icon: SpaceDashboardOutlined, access: "guest" },
  { to: "/trades", label: "Trades", Icon: CandlestickChartOutlined, access: "guest" },
  { to: "/investments", label: "Investments", Icon: AccountBalanceWalletOutlined, access: "guest" },
  { to: "/risk-management", label: "Risk Management", Icon: ShieldOutlined, access: "auth" },
  { to: "/capital", label: "Capital", Icon: AccountBalanceOutlined, access: "auth" },
  { to: "/quick-review", label: "Quick Review", Icon: FactCheckOutlined, access: "superuser" },
  { to: "/scan", label: "Scan", Icon: RadarOutlined, access: "auth" },
  { to: "/recommendations", label: "Recommendations", Icon: LightbulbOutlined, access: "guest" },
  { to: "/chart", label: "Analysis", Icon: InsightsOutlined, access: "guest" },
  { to: "/watchlist", label: "Watchlist", Icon: VisibilityOutlined, access: "auth" },
  { to: "/journal", label: "Journal", Icon: EditNoteOutlined, access: "guest" },
];

function isVisible(link, user) {
  if (link.access === "guest") return true;
  if (link.access === "auth") return !!user;
  if (link.access === "superuser") return user?.role === "SUPERUSER";
  return false;
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleLinks = navLinks.filter((link) => isVisible(link, user));

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
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
      {/* Market Indices Bar (always visible, scrollable) */}
      <div className={styles.indicesBarWrapper}>
        <div
          className={styles.indicesContainer}
          role="region"
          aria-label="Market Indices"
        >
          <div className={styles.indexItem}><span className={styles.indexName}>NIFTY</span><span className={styles.indexValue}>{loading ? '...' : (indices.nifty50.value ? indices.nifty50.value.toLocaleString('en-IN', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.nifty50.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.nifty50.changePercent >= 0 ? '+' : ''}${indices.nifty50.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
          <div className={styles.indexItem}><span className={styles.indexName}>SENSEX</span><span className={styles.indexValue}>{loading ? '...' : (indices.sensex.value ? indices.sensex.value.toLocaleString('en-IN', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.sensex.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.sensex.changePercent >= 0 ? '+' : ''}${indices.sensex.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
          <div className={styles.indexItem}><span className={styles.indexName}>NASDAQ</span><span className={styles.indexValue}>{loading ? '...' : (indices.nasdaq.value ? indices.nasdaq.value.toLocaleString('en-US', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.nasdaq.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.nasdaq.changePercent >= 0 ? '+' : ''}${indices.nasdaq.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
          <div className={styles.indexItem}><span className={styles.indexName}>DOW</span><span className={styles.indexValue}>{loading ? '...' : (indices.dowjones.value ? indices.dowjones.value.toLocaleString('en-US', {maximumFractionDigits: 2}) : '---')}</span><span className={`${styles.indexChange} ${indices.dowjones.changePercent >= 0 ? styles.positive : styles.negative}`}>{loading ? '...' : `${indices.dowjones.changePercent >= 0 ? '+' : ''}${indices.dowjones.changePercent?.toFixed(2) || '0.00'}%`}</span></div>
        </div>
      </div>

      {/* Mobile Header Row: logo left, burger right (visible only on mobile) */}
      <div className={styles.headerRow}>
        <div className={styles.logo}>
            <img src="/ishastra_icon.png" alt="Ishastra Logo" className={styles.logoIcon} style={{height: '32px', marginRight: '8px', verticalAlign: 'middle'}} />
            <span className={styles.logoText}>Ishastra</span>
          </div>
        <button
          className={styles.sideMenuButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          title="Open menu"
        >
          <MenuRounded className={styles.navIcon} fontSize="small" />
        </button>
      </div>

      {/* Desktop Header: logo, nav, theme toggle, burger (hidden on mobile) */}
      <div
        className={styles.headerContainer}
        style={{ width: '100vw', minWidth: 0, boxSizing: 'border-box', ...(mobileMenuOpen ? {} : { overflowX: 'hidden' }) }}
      >
        <div className={styles.leftSection}>
          <div className={styles.logo}>
            <img src="/ishastra_icon.png" alt="Ishastra Logo" className={styles.logoIcon} style={{height: '32px', marginRight: '8px', verticalAlign: 'middle'}} />
            <span className={styles.logoText}>Ishastra</span>
          </div>
        </div>
        <nav className={styles.nav}>
          {visibleLinks.slice(0, 3).map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`${styles.navLink} ${location.pathname === link.to ? styles.navLinkActive : ''}`}
            >
              <link.Icon className={styles.navIcon} fontSize="small" />
              {link.label}
              {location.pathname === link.to && (
                <div className={styles.activeIndicator} />
              )}
            </Link>
          ))}
          {/* Theme toggle lives in the side menu footer now, not the sticky
              top bar — one less icon competing for space next to the nav
              links, and it's already reachable via the hamburger menu. */}
          {/* Account details live inside the main (hamburger) menu now —
              a separate top-bar dropdown used to get clipped/hidden behind
              page content (e.g. the Trades table) on some pages, since it
              wasn't part of the same full-screen overlay stacking context
              as the side menu. One menu, positioned rightmost. */}
          <button
            className={styles.sideMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Open menu"
          >
            <MenuRounded className={styles.navIcon} fontSize="small" />
          </button>
        </nav>
      </div>

      {/* Render side menu overlay at the end of header, outside headerContainer, for proper stacking */}
      {mobileMenuOpen && (
        <div
          className={styles.sideMenuOverlay}
          onClick={() => setMobileMenuOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <nav
            className={`${styles.sideMenu} ${styles.sideMenuRight}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.sideMenuHeader}>
              <span className={styles.logoText}>Menu</span>
              <button className={styles.closeButton} onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><CloseRounded fontSize="small" /></button>
            </div>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-primary)' }}>
                {user.avatarUrl ? (
                  <img
                    src={config.getImageUrl(user.avatarUrl)}
                    alt="Avatar"
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <PersonOutlineOutlined style={{ fontSize: 26, color: 'var(--text-muted)' }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </span>
                  {user.role === 'SUPERUSER' && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--btn-primary-bg)', color: 'var(--text-white)', borderRadius: 4, padding: '2px 6px', width: 'fit-content' }}>
                      SUPERUSER
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className={styles.sideMenuItems}>
              {visibleLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`${styles.sideMenuItem} ${location.pathname === link.to ? styles.sideMenuItemActive : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.Icon className={styles.navIcon} fontSize="small" />
                  {link.label}
                </Link>
              ))}
              <div style={{ borderTop: '1px solid var(--border-primary)', margin: '8px 0' }} />
              {!user ? (
                <Link
                  to="/login"
                  className={styles.sideMenuItem}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LoginOutlined className={styles.navIcon} fontSize="small" />
                  Login
                </Link>
              ) : (
                <>
                  <Link
                    to="/profile"
                    className={styles.sideMenuItem}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PersonOutlineOutlined className={styles.navIcon} fontSize="small" />
                    Profile{user.role === 'SUPERUSER' ? ' (Superuser)' : ''}
                  </Link>
                  <Link
                    to="/profile/password"
                    className={styles.sideMenuItem}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LockOutlined className={styles.navIcon} fontSize="small" />
                    Update Password
                  </Link>
                  <button
                    className={styles.sideMenuItem}
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await handleLogout();
                    }}
                    style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                  >
                    <LogoutOutlined className={styles.navIcon} fontSize="small" />
                    Logout
                  </button>
                </>
              )}
            </div>
            <div className={styles.sideMenuFooter}>
              <button
                className={styles.sideMenuThemeButton}
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark'
                  ? <LightModeOutlined className={styles.navIcon} fontSize="small" />
                  : <DarkModeOutlined className={styles.navIcon} fontSize="small" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar — derives from the same visibleLinks
          source of truth as the desktop nav and drawer, so it can no longer
          silently drift out of sync with what a guest/user/superuser can
          actually see. */}
      <nav className={styles.bottomNav}>
        {visibleLinks.slice(0, 3).map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`${styles.bottomNavItem} ${location.pathname === link.to ? styles.bottomNavItemActive : ''}`}
          >
            <link.Icon className={styles.bottomNavIcon} fontSize="small" />
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
