import React from "react";

export default function PageHeader({ title, subtitle, showBackButton = false, onBack }) {
  return (
    <div style={{ 
      marginBottom: 32,
      borderBottom: "1px solid #2A3441",
      paddingBottom: 20,
      position: "relative"
    }}>
      {showBackButton && (
        <button 
          onClick={onBack} 
          style={{ 
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "500",
            borderRadius: "8px",
            background: "transparent",
            color: "#9CA3AF",
            border: "1px solid #374151",
            cursor: "pointer",
            marginBottom: 16,
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#374151";
            e.target.style.color = "#fff";
            e.target.style.borderColor = "#4B5563";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.color = "#9CA3AF";
            e.target.style.borderColor = "#374151";
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back
        </button>
      )}
      
      <h1 style={{
        fontSize: "32px",
        fontWeight: "700",
        color: "#fff",
        margin: 0,
        letterSpacing: "-0.5px"
      }}>
        {title}
      </h1>
      
      {subtitle && (
        <p style={{
          fontSize: "16px",
          color: "#9CA3AF",
          margin: "8px 0 0 0"
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
