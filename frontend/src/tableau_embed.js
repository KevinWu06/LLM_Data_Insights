import React, { useRef, useEffect, useState } from "react";
import bannerImageMap from './embeddedImages';
import windowTableau from 'tableau-api'; // Only if you need types, not required for global

const TABLEAU_URL = "https://public.tableau.com/views/CreativeWear-Out/Dashboard1";

// NOTE: To get filter values from Tableau, we need to use the Tableau JS API.
// The tableau-viz web component exposes the .viz property, which is a Tableau Viz object.
// We'll use that to get the filters and their values.

export default function TableauEmbed() {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const unregisterRef = useRef(null); // for cleanup
  const [selectedCheckboxes, setSelectedCheckboxes] = useState([]);

  // Helper to get the first worksheet in the dashboard
  async function getFirstWorksheet(viz) {
    if (!viz) return null;
    try {
      const workbook = viz.getWorkbook();
      const activeSheet = workbook.getActiveSheet();
      console.log("[getFirstWorksheet] workbook:", workbook);
      console.log("[getFirstWorksheet] activeSheet:", activeSheet);
      if (activeSheet.getSheetType && activeSheet.getSheetType() === "dashboard") {
        const worksheets = activeSheet.getWorksheets();
        console.log("[getFirstWorksheet] worksheets in dashboard:", worksheets);
        if (worksheets && worksheets.length > 0) {
          return worksheets[0];
        }
      }
      return activeSheet;
    } catch (err) {
      console.error("Error getting worksheet:", err);
      return null;
    }
  }

  // Helper to get filter values (checkboxes) from the worksheet
  async function fetchCheckboxFilterValues() {
    const viz = vizRef.current;
    console.log("[fetchCheckboxFilterValues] vizRef.current:", viz);
    const worksheet = await getFirstWorksheet(viz);
    console.log("[fetchCheckboxFilterValues] worksheet:", worksheet);
    if (!worksheet) return [];
    try {
      const filters = await worksheet.getFiltersAsync();
      console.log("[fetchCheckboxFilterValues] filters:", filters);
      // Log all filter field names and objects
      filters.forEach((f, idx) => {
        const name = f.getFieldName ? f.getFieldName() : f.fieldName;
        console.log(`[fetchCheckboxFilterValues] Filter[${idx}]:`, name, f);
      });
      const checkboxFilter = filters.find(
        f =>
          (f.getFieldName && f.getFieldName() === "Banner") ||
          (f.fieldName && f.fieldName === "Banner")
      );
      console.log("[fetchCheckboxFilterValues] checkboxFilter:", checkboxFilter);
      if (!checkboxFilter) return [];
      const appliedValues = checkboxFilter.getAppliedValues();
      console.log("[fetchCheckboxFilterValues] appliedValues:", appliedValues);
      return appliedValues.map(v => v.formattedValue || v.value);
    } catch (err) {
      console.error("Error fetching filter values:", err);
      return [];
    }
  }

  useEffect(() => {
    if (window.tableau && containerRef.current && !vizRef.current) {
      vizRef.current = new window.tableau.Viz(
        containerRef.current,
        TABLEAU_URL,
        {
          hideTabs: true,
          width: "100%",
          height: "800px",
          onFirstInteractive: () => {
            fetchCheckboxFilterValues().then(setSelectedCheckboxes);

            // Attach filter change listener here, after viz is ready
            const viz = vizRef.current;
            if (viz) {
              const onFilterChange = () => {
                fetchCheckboxFilterValues().then(setSelectedCheckboxes);
              };
              viz.addEventListener('filterchange', onFilterChange);
              unregisterRef.current = () => viz.removeEventListener('filterchange', onFilterChange);
            }
          }
        }
      );
    }
    return () => {
      if (unregisterRef.current) unregisterRef.current();
      if (vizRef.current) {
        vizRef.current.dispose();
        vizRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  // Helper to check if a URL is a direct image
  const isImageUrl = (url) => {
    return url && (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.gif'));
  };

  const isHtmlBanner = (url) => {
    return url && (url.includes('/HTML/') || url.endsWith('/'));
  };

  // Show all non-empty URLs for selected banners
  const selectedImages = selectedCheckboxes
    .map(title => [title, bannerImageMap[title]])
    .filter(([title, url]) => url && url.trim() !== '');

  // Debug logging
  console.log("selectedCheckboxes:", selectedCheckboxes);
  console.log("bannerImageMap keys:", Object.keys(bannerImageMap));
  console.log("selectedImages:", selectedImages);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1440,
        margin: '8px auto 32px auto',
        background: '#f8fafc',
        borderRadius: 18,
        boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
        minHeight: 800,
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h2
        style={{
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          fontWeight: 700,
          fontSize: 32,
          color: '#1a237e',
          marginBottom: 32,
          letterSpacing: 0.2,
          textAlign: 'center',
        }}
      >
        Banner Performance Dashboard
      </h2>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          minHeight: 0,
          height: '800px',
          maxWidth: 1400,
          border: '1.5px solid #dbeafe',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(25,118,210,0.08)',
          background: '#fff',
          margin: '0 auto',
        }}
      />
      {selectedImages.length > 0 && (
        <div style={{ margin: '40px auto 0 auto', maxWidth: 1200, textAlign: 'center' }}>
          <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 24 }}>Selected Banner Visuals</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center' }}>
            {selectedImages.map(([title, url]) => (
              <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 320 }}>
                {isImageUrl(url) ? (
                  <img src={url} alt={title} style={{ maxWidth: 300, maxHeight: 600, borderRadius: 8, boxShadow: '0 2px 8px rgba(25,118,210,0.10)', background: '#f8fafc', marginBottom: 12 }} />
                ) : isHtmlBanner(url) ? (
                  <iframe
                    src={url}
                    title={title}
                    style={{ width: 300, height: 600, border: 'none', borderRadius: 8, background: '#f8fafc', marginBottom: 12 }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ marginBottom: 12, color: '#1976d2' }}>
                    {url}
                  </a>
                )}
                <div style={{ fontWeight: 600, color: '#222', fontSize: 18 }}>{title}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
