import React, { useState } from 'react';
import { Box, Container, Typography, Button, Tabs, Tab, MenuItem, Select, FormControl, InputLabel, TextField } from '@mui/material';

import { useMsal, useAccount, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from './authConfig';

import CsvUpload from './CSVUpload/csv_upload';
import TableauEmbedServier from './Dashboard/tableau_embed_Servier';
import TableauEmbedAUV from './Dashboard/tableau_embed_AUV';
import ChatWidget from './Chatbot/chat_widget';
import BannerVisuals from './BannerVisuals/banner_visuals';
const { ServierBannerVisuals, AUVBannerVisuals } = BannerVisuals;
import AnomalyDetection from './AnomalyDetection/AnomalyDetection';

function App() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(accounts[0] || {});
  const [tab, setTab] = useState(0);

  const [csvSessionId, setCsvSessionId] = useState(null);
  const [csvColumns, setCsvColumns] = useState([]);
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [selectedCheckboxes, setSelectedCheckboxes] = useState([]);
  const [bannerSubTab, setBannerSubTab] = useState(0);
  const [dashboardSubTab, setDashboardSubTab] = useState(0);


  const handleLogin = () => {
    instance.loginPopup({loginRequest, prompt: "consent"}).catch(console.error);
  };

  const handleLogout = () => {
    instance.logoutPopup().catch(console.error);
  };

  const handleCsvUploadSuccess = (data) => {
    setCsvSessionId(data.session_id);
    setCsvColumns(data.columns);
    setCsvUploaded(true);
    if (data.file_name) {
      setCsvFileName(data.file_name);
    }
  };

  if (inProgress === 'login') {
    return <Typography>Logging in...</Typography>;
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ pt: 10, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Please sign in to continue</Typography>
        <Button variant="contained" onClick={handleLogin}>Sign In</Button>
      </Container>
    );
  }

  return (
    <>
      <Container
        maxWidth={false}
        sx={{
          width: '1280px',
          pt: 4,
          pb: 8,
          minHeight: '120vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mx: 'auto',
        }}
      >
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button onClick={handleLogout} variant="outlined" color="error">
            Logout
          </Button>
        </Box>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 4 }}>
          <Tab label="Dashboards" />
          <Tab label="CSV Upload" />
          <Tab label="Banner Visuals" />
          <Tab label="Anomaly Detection" />
        </Tabs>
        <Box sx={{ flexGrow: 1, width: '100%', display: tab === 0 ? 'flex' : 'block', flexDirection: tab === 0 ? 'row' : 'column', alignItems: tab === 0 ? 'flex-start' : 'stretch' }}>
        {tab === 0 && (
          <Box sx={{ width: '100%' }}>
            <Tabs
              value={dashboardSubTab}
              onChange={(e, v) => setDashboardSubTab(v)}
              centered
              sx={{ mb: 2 }}
            >
              <Tab label="Servier Dashboard" />
              <Tab label="AUV Dashboard" />
            </Tabs>

            {dashboardSubTab === 0 && (
              <TableauEmbedServier
                instance={instance}
                account={account}
                selectedCheckboxes={selectedCheckboxes}
                setSelectedCheckboxes={setSelectedCheckboxes}
              />
            )}
            {dashboardSubTab === 1 && (
              <TableauEmbedAUV
                instance={instance}
                account={account}
                selectedCheckboxes={selectedCheckboxes}
                setSelectedCheckboxes={setSelectedCheckboxes}
              />
            )}
          </Box>
        )}

          {tab === 1 && (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CsvUpload onUploadSuccess={handleCsvUploadSuccess} />
              {csvUploaded && (
                <Typography sx={{ mt: 2 }} color="success.main">
                  CSV uploaded! You can now use the chat widget and anomaly detection.
                </Typography>
              )}
            </Box>
          )}
          {tab === 2 && (
            <Box sx={{ width: '100%' }}>
              <Tabs
                value={bannerSubTab}
                onChange={(e, v) => setBannerSubTab(v)}
                centered
                sx={{ mb: 2 }}
              >
                <Tab label="Servier Visuals" />
                <Tab label="AUV Visuals" />
              </Tabs>
              {bannerSubTab === 0 && <ServierBannerVisuals />}
              {bannerSubTab === 1 && <AUVBannerVisuals />}
            </Box>
          )}

          {tab === 3 && <AnomalyDetection 
            sessionId={csvSessionId}
          />}

        </Box>
      </Container>
      {/* ChatWidget is always available in the bottom right, handles its own positioning */}
      <ChatWidget
        sessionId={csvSessionId}
        columns={csvColumns}
        instance={instance}
        account={account}
        showUploadPrompt={!csvUploaded}
        csvFileName={csvFileName}
      />
    </>
  );
}

export default App;
