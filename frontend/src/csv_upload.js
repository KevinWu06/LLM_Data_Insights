import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { uploadCSV } from './services';

const CsvUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionID, setSessionID] = useState('')

  useEffect(() => {
    if (sessionID) {
      console.log("Session ID updated:", sessionID);
    }
  }, [sessionID]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
      setSuccess(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await uploadCSV(formData)
      setSessionID(res.data.session_id);
      console.log(sessionID)
      setMessage(res.data.message || 'Upload successful');
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setMessage('Upload failed');
      setSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box p={2} maxWidth={500}>
      <Typography variant="h6" gutterBottom>
        Upload CSV File
      </Typography>
      <Button variant="contained" component="label">
        Choose CSV File
        <input type="file" accept=".csv" hidden onChange={handleFileChange} />
      </Button>
      <Typography variant="body2" mt={1}>
        {file?.name || 'No file selected'}
      </Typography>
      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
      </Box>

      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage('')}
      >
        <Alert
          onClose={() => setMessage('')}
          severity={success ? 'success' : 'error'}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CsvUpload;
