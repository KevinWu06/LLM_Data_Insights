import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { SendAnomalyDetectionAPI } from '../services';
import Plot from 'react-plotly.js'

const bannerOptions = [
  "Improved PFS",
  "#1 Prescribed" ,
  "Improved mOS" ,
  "Go Deeper",
  "Newly Diagnosed CR" ,
  "Now Approved (Anim.)" ,
  "Now Approved (Stat.)",
  "MDS Now Approved" ,
  "MDS New Treatment",
  "Rob Testimonial (Anim.)" ,
  "Glioma DSA",
  "ASH Branded",
  "KOL",
  "Promotional HCP (Anim.)",
  "Promotional HCP (Stat.)",
  "R1",
  "Testing" ,
  "Testing (V1)",
  "US-00818",
  "First-in-class",
  "Laser Video",
  "FDA Approved",
  "CR and DOCR",
  "Legacy Banner",
  "mlDH1 BioPharm",
  "Rob Testimonial (Stat.)",
  "US-02033",
  "Testing (V2)",
  "Transfus. Indep.",
  "Unbranded"  
];

export default function AnomalyDetection( {sessionId} ) {
  const [anomalyBanner, setAnomalyBanner] = useState('Go Deeper');
  const [anomalyStdDev, setAnomalyStdDev] = useState(2);
  const [anomalyWindow, setAnomalyWindow] = useState(7);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleDetectAnomalies = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await SendAnomalyDetectionAPI(anomalyBanner, anomalyWindow, anomalyStdDev, sessionId);
      setResponse(res.data); // <-- axios puts the response body here
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        >
          {bannerOptions.map(option => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Number of Standard Deviations"
        type="number"
        value={anomalyStdDev}
        onChange={e => setAnomalyStdDev(Number(e.target.value))}
        fullWidth
        sx={{ mb: 2 }}
        inputProps={{ min: 1, step: 1 }}
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
                          pct: v !== null && v !== undefined ? `${(v * 100).toFixed(2)}%` : 'N/A',
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
                          pct: v !== null && v !== undefined ? `${(v * 100).toFixed(2)}%` : 'N/A',
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
                      title: 'CTR Anomaly Detection',
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
                        <TableCell align="right">{row['CTR']}</TableCell>
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