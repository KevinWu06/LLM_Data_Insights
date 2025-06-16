import React, { useEffect, useRef } from "react";

export default function TableauEmbed() {
  const vizRef = useRef(null);

  return (
    <div style={{ width: "200%", maxWidth: "1200px", margin: "0 auto" }}>
      <h2>Banner Data Dashboard</h2>
      <tableau-viz
        ref={vizRef}
        src="https://public.tableau.com/views/CreativeWear-Out/Dashboard1"
        toolbar="bottom"
        hide-tabs
        style={{
          width: "200%",
          height: "80vh",
          border: "none",
          display: "block",
        }}
      ></tableau-viz>
    </div>
  );
}
