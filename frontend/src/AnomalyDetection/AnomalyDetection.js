import React, { useState, useEffect } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { getBannerNames, SendAnomalyDetectionAPI } from '../services';
import Plot from 'react-plotly.js'

// If the user tries to detect anomalies without uploading a CSV, show an error message.
  // This logic is handled in handleDetectAnomalies below.

export default function AnomalyDetection( {sessionId} ) {
  const [anomalyBanner, setAnomalyBanner] = useState('');
  const [anomalyOverUnder, setAnomalyOverUnder] = useState(0.3);
  const [anomalyWindow, setAnomalyWindow] = useState(7);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [bannerOptions, setBannerOptions] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerError, setBannerError] = useState(null);
  const [needsCSVUpload, setNeedsCSVUpload] = useState(false);  // NEW state

  useEffect(() => {
    const fetchBannerNames = async () => {
      setBannerLoading(true);
      setBannerError(null);
      setNeedsCSVUpload(false);
      try {
        const res = await getBannerNames(sessionId);
        const banners = res.data.banner_names || [];
        setBannerOptions(banners);
        if (banners.length > 0) {
          setAnomalyBanner(banners[0]);
        }
      } catch (error) {
        if (error.response && error.response.status === 400) {
          // Special case: no CSV uploaded
          setNeedsCSVUpload(true);
        } else {
          setBannerError('Failed to load banner names');
        }
      } finally {
        setBannerLoading(false);
      }
    };

    fetchBannerNames();
  }, [sessionId]);

  // Prevent anomaly detection if no CSV uploaded
  const handleDetectAnomalies = async () => {
    if (needsCSVUpload) {
      setError('Please upload a CSV file first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await SendAnomalyDetectionAPI(anomalyBanner, anomalyWindow, anomalyOverUnder, sessionId);
      setResponse(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (needsCSVUpload) {
    return (
      <Box sx={{ width: 600, mx: 'auto', mt: 8, p: 4, background: '#fff3f3', borderRadius: 3, boxShadow: 1, textAlign: 'center' }}>
        <Typography variant="h6" color="error" sx={{ mb: 2 }}>
          No CSV file uploaded.
        </Typography>
        <Typography variant="body1">
          Please upload a CSV file to proceed with anomaly detection.
        </Typography>
      </Box>
    );
  }

  // Helper function for 2 significant digits
  function formatPctSig2(val) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const pct = val * 100;
    let str = Number(pct).toPrecision(2);
    if (str.endsWith('.0')) str = str.slice(0, -2);
    return str + '%';
  }

  return (
    <Box sx={{ width: 1200, mx: 'auto', mt: 4, p: 4, background: '#f8fafc', borderRadius: 3, boxShadow: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#1976d2' }}>Anomaly Detection</Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="anomaly-banner-label">Select Banner</InputLabel>
        <Select
          labelId="anomaly-banner-label"
          value={anomalyBanner}
          label="Select Banner"
          onChange={e => setAnomalyBanner(e.target.value)}
          disabled={bannerLoading || bannerError !== null}
        >
          {bannerLoading && <MenuItem disabled>Loading banners...</MenuItem>}
          {bannerError && <MenuItem disabled>{bannerError}</MenuItem>}
          {!bannerLoading && !bannerError && bannerOptions.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Over/Under Boundary Decimal (eg. enter 0.3 for 30%)"
        type="number"
        value={anomalyOverUnder}
        onChange={e => setAnomalyOverUnder(Number(e.target.value))}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Window Size (Days)"
        type="number"
        value={anomalyWindow}
        onChange={e => setAnomalyWindow(Number(e.target.value))}
        fullWidth
        inputProps={{ min: 1, step: 1 }}
      />
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleDetectAnomalies}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Detect Anomalies'}
      </Button>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {response && (
        <Box sx={{ mt: 2 }}>
          {response?.plot_data && (
            <Box sx={{ mt: 2, textAlign: 'center', width: '100%' }}>
              {(() => {
                const ctr = response.plot_data.ctr;
                const dates = response.plot_data.dates;
                const anomalyMask = response.plot_data.anomaly;

                // Non-anomaly marker points
                const nonAnomalyDates = dates.filter((_, i) => !anomalyMask[i]);
                const nonAnomalyCtr = ctr.filter((_, i) => !anomalyMask[i]);
                const customdataNonAnomaly = ctr
                  .map((v, i) =>
                    !anomalyMask[i]
                      ? {
                          pct: formatPctSig2(v),
                          Clicks: response.plot_data.clicks[i],
                          Impressions: response.plot_data.impressions[i]
                        }
                      : null
                  )
                  .filter((v) => v !== null);

                // Anomaly marker points
                const anomalyDates = dates.filter((_, i) => anomalyMask[i]);
                const anomalyCtr = ctr.filter((_, i) => anomalyMask[i]);
                const customdataAnomaly = ctr
                  .map((v, i) =>
                    anomalyMask[i]
                      ? {
                          pct: formatPctSig2(v),
                          Clicks: response.plot_data.clicks[i],
                          Impressions: response.plot_data.impressions[i]
                        }
                      : null
                  )
                  .filter((v) => v !== null);

                return (
                  <Plot
                    data={[
                      // Main CTR line (continuous, no markers)
                      {
                        x: dates,
                        y: ctr,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'CTR (%)',
                        line: { width: 2, color: '#1f77b4' }
                      },
                      // Non-anomaly markers (blue)
                      {
                        x: nonAnomalyDates,
                        y: nonAnomalyCtr,
                        type: 'scatter',
                        mode: 'markers',
                        name: 'CTR Marker',
                        marker: { color: '#1f77b4', size: 8 },
                        customdata: customdataNonAnomaly,
                        hovertemplate:
                          'Date: %{x}<br>CTR: %{customdata.pct}<br>Clicks: %{customdata.Clicks}<br>Impressions: %{customdata.Impressions}<extra></extra>',
                        showlegend: false
                      },
                      // Upper bound
                      {
                        x: dates,
                        y: response.plot_data.upper,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Upper Bound',
                        line: { dash: 'dot', color: 'green' }
                      },
                      // Lower bound
                      {
                        x: dates,
                        y: response.plot_data.lower,
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Lower Bound',
                        line: { dash: 'dot', color: 'red' }
                      },
                      // Anomaly markers (red diamonds)
                      {
                        x: anomalyDates,
                        y: anomalyCtr,
                        type: 'scatter',
                        mode: 'markers',
                        name: 'Anomaly',
                        marker: { color: 'red', size: 12, symbol: 'diamond' },
                        customdata: customdataAnomaly,
                        hovertemplate:
                          'Date: %{x}<br>CTR: %{customdata.pct}<br>Clicks: %{customdata.Clicks}<br>Impressions: %{customdata.Impressions}<extra></extra>'
                      }
                    ]}
                    layout={{
                      title: {
                        text: response.method || 'CTR Anomaly Detection',
                        font: { size: 24, family: 'Roboto, Arial, sans-serif', color: '#222' },
                        xref: 'paper',
                        x: 0.5,
                        xanchor: 'center',
                        yanchor: 'top',
                        y: 0.95,
                        pad: { t: 10, b: 10 }
                      },
                      xaxis: { title: 'Date' },
                      yaxis: { title: 'CTR (%)', tickformat: ',.2%', automargin: true },
                      hovermode: 'closest',
                      width: 1200,
                      height: 600,
                      legend: { orientation: 'h', y: -0.2 }
                    }}
                    config={{ responsive: true }}
                  />
                );
              })()}
            </Box>
          )}
          {response?.anomalies && response.anomalies.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Anomalies Table</Typography>
              <TableContainer component={Paper} sx={{ maxWidth: 600, mx: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">CTR (%)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {response.anomalies.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.Date}</TableCell>
                        <TableCell align="right">{formatPctSig2(row['CTR'])}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
} 