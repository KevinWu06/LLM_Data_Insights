import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import { uploadCSV } from './services';

const CsvUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

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
      const res = await uploadCSV(formData);
      if (res.data.session_id) {
        onUploadSuccess({ ...res.data, file_name: file.name });
        localStorage.setItem('session_id', res.data.session_id);
      }
      setMessage(res.data.message || 'Upload successful');
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setMessage('Upload failed. Please try again.');
      setSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 520,
        mx: 'auto',
        mt: 6,
        p: 4,
        borderRadius: 2,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        backgroundColor: '#fafafa',
      }}
    >
      <Typography
        variant="h5"
        component="h2"
        sx={{ fontWeight: 700, color: '#0d47a1', mb: 3, textAlign: 'center' }}
      >
        Upload Your CSV File
      </Typography>

      <Button
        variant="outlined"
        component="label"
        sx={{
          display: 'block',
          mx: 'auto',
          px: 4,
          py: 1.5,
          borderColor: '#1976d2',
          color: '#1976d2',
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': {
            borderColor: '#1565c0',
            backgroundColor: '#e3f2fd',
          },
        }}
        disabled={uploading}
      >
        Choose CSV File
        <input
          type="file"
          accept=".csv"
          hidden
          onChange={handleFileChange}
          disabled={uploading}
        />
      </Button>

      <Typography
        variant="body1"
        sx={{
          mt: 1.5,
          mb: 3,
          textAlign: 'center',
          color: file ? '#333' : '#999',
          fontStyle: file ? 'normal' : 'italic',
        }}
      >
        {file?.name || 'No file selected'}
      </Typography>

      <Box textAlign="center">
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          sx={{
            minWidth: 140,
            py: 1.5,
            fontWeight: 600,
            fontSize: 16,
            boxShadow: uploading ? 'none' : '0 4px 12px rgba(25, 118, 210, 0.4)',
            '&:hover': {
              backgroundColor: '#115293',
              boxShadow: '0 6px 16px rgba(17, 82, 147, 0.6)',
            },
          }}
        >
          {uploading ? <CircularProgress size={24} color="inherit" /> : 'Upload'}
        </Button>
      </Box>

      <Snackbar
        open={!!message}
        autoHideDuration={4500}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setMessage('')}
          severity={success ? 'success' : 'error'}
          sx={{
            width: '100%',
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: 0.3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default CsvUpload;
