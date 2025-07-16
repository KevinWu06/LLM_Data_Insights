// chat_widget.js
import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Paper, Fade, Divider, Tooltip, Avatar } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import AskComponent from './ask_component';

const ChatWidget = ({ instance, account, loginRequest, sessionId, csvFileName }) => {
  const [open, setOpen] = useState(false);
  const [systemMessage, setSystemMessage] = useState("");

  useEffect(() => {
    if (csvFileName) {
      setSystemMessage(`Using New File: ${csvFileName}`);
    }
  }, [csvFileName]);

  return (
    <>
      {/* Floating Chat Button */}
      {!open && (
        <Tooltip title="Open Chat" placement="left">
          <IconButton
            onClick={() => setOpen(true)}
            aria-label="open chat"
            sx={{
              position: 'fixed',
              bottom: 40,
              right: 40,
              bgcolor: 'background.paper',
              color: 'primary.main',
              width: 72,
              height: 72,
              boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
              border: '2.5px solid',
              borderColor: 'primary.main',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
                borderColor: 'primary.dark',
                boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
                transform: 'scale(1.07)',
              },
              zIndex: 1400,
            }}
          >
            <ChatIcon fontSize="large" sx={{ fontSize: 38 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Chat Panel */}
      <Fade in={open}>
        <Paper
          elevation={24}
          sx={{
            position: 'fixed',
            bottom: 40,
            right: 40,
            width: 480,
            maxWidth: '98vw',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 5,
            overflow: 'hidden',
            zIndex: 1500,
            boxShadow: '0 12px 48px 0 rgba(0,0,0,0.28)',
            border: '2px solid',
            borderColor: 'primary.light',
            background: 'linear-gradient(135deg, #f0f4ff 0%, #e3eafc 60%, #f8fafc 100%)',
            backdropFilter: 'blur(2px)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              px: 3,
              py: 2.2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid',
              borderColor: 'primary.light',
              boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              position: 'relative',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  width: 38,
                  height: 38,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  mr: 1,
                }}
              >
                <ChatIcon sx={{ fontSize: 28, opacity: 0.9 }} />
              </Avatar>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 0.7,
                  fontSize: '1.22rem',
                  display: 'flex',
                  alignItems: 'center',
                  textShadow: '0 1px 6px rgba(0,0,0,0.10)',
                  userSelect: 'none',
                }}
              >
                Banner Insights Assistant
              </Typography>
            </Box>
            <Tooltip title="Close Chat" placement="left">
              <IconButton
                onClick={() => setOpen(false)}
                sx={{
                  color: 'white',
                  bgcolor: 'primary.dark',
                  '&:hover': { bgcolor: 'error.main' },
                  transition: 'background 0.2s',
                  ml: 1,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                }}
                aria-label="close chat"
                size="medium"
              >
                <CloseIcon sx={{ fontSize: 26 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <Divider sx={{ m: 0, borderColor: 'primary.light', opacity: 0.5 }} />

          {/* Chat content */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: 3,
              bgcolor: 'transparent',
              minHeight: 260,
              maxHeight: 'calc(88vh - 90px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              background: 'linear-gradient(120deg, #f8fafc 60%, #e3eafc 100%)',
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
            }}
          >
            <AskComponent instance={instance} account={account} loginRequest={loginRequest} sessionId={sessionId} systemMessage={systemMessage} />
          </Box>
        </Paper>
      </Fade>
    </>
  );
};

export default ChatWidget;
