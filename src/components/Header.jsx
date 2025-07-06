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
  
  // Add responsive styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .header-container {
        max-width: none;
        margin: 0;
        padding: 0 5%;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 64px;
      }
      
      @media (max-width: 768px) {
        .header-container {
          padding: 0 4%;
        }
      }
      
      @media (max-width: 480px) {
        .header-container {
          padding: 0 3%;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => document.head.removeChild(style);
  }, []);
  
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
      <div className="header-container">
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 12 
        }}>
          <span style={{ 
            fontWeight: 700, 
            fontSize: "clamp(20px, 3vw, 24px)", 
            letterSpacing: "-0.5px",
            color: "#fff"
          }}>
            Ishastra
          </span>
        </div>
        <nav style={{ 
          display: "flex", 
          gap: "clamp(16px, 4vw, 32px)",
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
                fontSize: "clamp(14px, 2.5vw, 16px)",
                padding: "8px 12px",
                borderRadius: "6px",
                transition: "all 0.2s ease",
                position: "relative",
                whiteSpace: "nowrap"
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