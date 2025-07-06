import React from "react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/trades", label: "Trades" },
  { to: "/trades/new", label: "Add Trade" }
  // Add more links if you add more routes
];

export default function Header() {
  const location = useLocation();
  
  // Use a state to handle responsive design properly
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isSmallScreen = windowWidth <= 900;
  
  return (
    <header
      style={{
        background: "#181f2a",
        color: "#fff",
        borderBottom: "1px solid #2A3441",
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxSizing: "border-box"
      }}
    >
      <div style={{
        width: "80%",
        maxWidth: "1400px",
        margin: "0 auto",
        padding: isSmallScreen ? "0 12px" : "0 40px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "64px"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 12 
        }}>
          <span style={{ 
            fontWeight: 700, 
            fontSize: 24, 
            letterSpacing: "-0.5px",
            color: "#fff"
          }}>
            Ishastra
          </span>
        </div>
        <nav style={{ 
          display: "flex", 
          gap: 32,
          alignItems: "center"
        }}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                color: location.pathname === link.to ? "#4F8CFF" : "#9CA3AF",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 16,
                padding: "8px 12px",
                borderRadius: "6px",
                transition: "all 0.2s ease",
                position: "relative"
              }}
              onMouseOver={(e) => {
                if (location.pathname !== link.to) {
                  e.target.style.color = "#fff";
                  e.target.style.backgroundColor = "#2A3441";
                }
              }}
              onMouseOut={(e) => {
                if (location.pathname !== link.to) {
                  e.target.style.color = "#9CA3AF";
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              {link.label}
              {location.pathname === link.to && (
                <div style={{
                  position: "absolute",
                  bottom: "-1px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "80%",
                  height: "2px",
                  backgroundColor: "#4F8CFF",
                  borderRadius: "1px"
                }} />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}