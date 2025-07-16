import React, { useRef, useEffect } from "react";
import bannerImageMap from './embeddedImages';

const TABLEAU_URL = "https://public.tableau.com/views/CreativeWear-OutFilter/Dashboard1?:embed=y&:display_count=yes";

// NOTE: To get filter values from Tableau, need to use the Tableau JS API.
// The tableau-viz web component exposes the .viz property, which is a Tableau Viz object
// Use that to get the filters and their values

export default function TableauEmbed({ selectedCheckboxes, setSelectedCheckboxes, style }) {
  const containerRef = useRef(null);
  const vizRef = useRef(null);
  const unregisterRef = useRef(null); // for cleanup

  // Helper to get all worksheets in the dashboard
  async function getAllWorksheets(viz) {
    if (!viz) return [];
    try {
      const workbook = viz.getWorkbook();
      const activeSheet = workbook.getActiveSheet();
      if (activeSheet.getSheetType && activeSheet.getSheetType() === "dashboard") {
        const worksheets = activeSheet.getWorksheets();
        return worksheets || [];
      }
      // If not a dashboard, just return the active sheet if it's a worksheet
      return [activeSheet];
    } catch (err) {
      console.error("Error getting worksheets:", err);
      return [];
    }
  }

  // Helper to get filter values (checkboxes) from all worksheets
  async function fetchCheckboxFilterValues() {
    const viz = vizRef.current;
    const worksheets = await getAllWorksheets(viz);
    if (!worksheets || worksheets.length === 0) return [];
    try {
      const bannerSet = new Set();
      for (const worksheet of worksheets) {
        const summaryData = await worksheet.getSummaryDataAsync();
        // Debug: log worksheet name and columns
        if (worksheet.getName) {
          console.log('[fetchCheckboxFilterValues] Worksheet:', worksheet.getName());
        }
        console.log('[fetchCheckboxFilterValues] summaryData:', summaryData);
        console.log('[fetchCheckboxFilterValues] summaryData.$0.$0 (columns):', summaryData?.$0?.$0);
        console.log('[fetchCheckboxFilterValues] summaryData.$0.$3 (data):', summaryData?.$0?.$3);
        const columns = summaryData?.$0?.$0;
        const dataRows = summaryData?.$0?.$3;
        console.log('[fetchCheckboxFilterValues] columns:', columns);
        columns.forEach((col, idx) => {
          console.log(`[fetchCheckboxFilterValues] columns[${idx}]:`, col);
          if (col && typeof col.getFieldName === 'function') {
            console.log(`[fetchCheckboxFilterValues] columns[${idx}].getFieldName():`, col.getFieldName());
          }
        });
        if (Array.isArray(columns) && Array.isArray(dataRows)) {
          const bannerColIdx = columns.findIndex(col => col?.getFieldName && col.getFieldName() === 'Banner');
          if (bannerColIdx !== -1) {
            for (const row of dataRows) {
              const bannerValue = row[bannerColIdx]?.formattedValue;
              if (bannerValue) bannerSet.add(bannerValue);
            }
          }
        }
      }
      return Array.from(bannerSet);
    } catch (err) {
      console.error("Error fetching visible banners from summary data:", err);
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
      // Do NOT dispose vizRef.current, so Tableau viz persists across tab switches
    };
    // eslint-disable-next-line
  }, [setSelectedCheckboxes]);

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
    .reverse();

  // Sidebar image sizing logic
  const sidebarMaxHeight = 330;
  const minThumb = 30;
  const nSidebar = selectedImages.length || 1;
  const thumbSidebar = Math.max(minThumb, Math.floor(sidebarMaxHeight / nSidebar));

  // Debug logging
  console.log("selectedCheckboxes:", selectedCheckboxes);
  console.log("bannerImageMap keys:", Object.keys(bannerImageMap));
  console.log("selectedImages:", selectedImages);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1800,
        margin: '8px auto 32px auto',
        background: '#f8fafc',
        borderRadius: 18,
        boxShadow: '0 4px 24px rgba(25, 118, 210, 0.10)',
        minHeight: 900,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      {/* Sidebar: Selected Banner Visuals */}
      <div style={{
        minWidth: 130,
        maxWidth: 130,
        width: 130,
        flex: '0 0 130px',
        padding: '0 8px 0 8px',
        background: '#f8fafc',
        borderRight: '1.5px solid #dbeafe',
        height: 900,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        <h3 style={{ color: '#1976d2', fontWeight: 700, margin: 0, marginBottom: 0, textAlign: 'center', fontSize: 12, height: 32, lineHeight: '32px' }}>Selected Banner Visuals</h3>
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: selectedImages.length === 0 ? 'flex-start' : 'flex-none', marginTop: 300 }}>
          {selectedImages.length > 0 ? (
            selectedImages.map(([title, url]) => (
              <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {isImageUrl(url) ? (
                  <img src={url} alt={title} style={{ width: thumbSidebar, height: thumbSidebar, borderRadius: 3, boxShadow: '0 2px 8px rgba(25,118,210,0.10)', background: '#f8fafc', objectFit: 'contain', display: 'block' }} />
                ) : isHtmlBanner(url) ? (
                  <div style={{ width: thumbSidebar, height: thumbSidebar, overflow: 'hidden', borderRadius: 3, background: '#f8fafc', display: 'block', boxShadow: '0 2px 8px rgba(25,118,210,0.10)' }}>
                    <iframe
                      src={url}
                      title={title}
                      width={300}
                      height={600}
                      style={{
                        border: 'none',
                        transform: `scale(${thumbSidebar / 300}, ${thumbSidebar / 600})`,
                        transformOrigin: 'top left',
                        width: 300,
                        height: 600,
                        background: '#f8fafc',
                        display: 'block',
                      }}
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                ) : (
                  <div style={{ width: thumbSidebar, height: thumbSidebar, borderRadius: 3, background: '#f8fafc', boxShadow: '0 2px 8px rgba(25,118,210,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 8, textAlign: 'center', padding: 2 }}>
                    banner visual unavailable
                  </div>
                )}
                <div style={{ fontWeight: 600, color: '#222', fontSize: 9, textAlign: 'center', wordBreak: 'break-word', maxWidth: 100 }}>{title}</div>
              </div>
            ))
          ) : (
            <div style={{ color: '#888', textAlign: 'center', marginTop: 32, fontSize: 10, width: '100%' }}>No banner visuals selected.</div>
          )}
        </div>
      </div>
      {/* Main Content: Tableau Dashboard */}
      <div style={{ flex: 1, padding: '16px 16px 16px 12px', minWidth: 600, display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: 900 }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            minHeight: 0,
            height: '100%',
            maxWidth: 1400,
            border: '1.5px solid #dbeafe',
            borderRadius: 12,
            boxShadow: '0 2px 12px rgba(25,118,210,0.08)',
            background: '#fff',
            margin: 0,
          }}
        />
      </div>
    </div>
  );
}
