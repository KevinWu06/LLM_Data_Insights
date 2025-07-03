import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Divider, Avatar, IconButton, Tooltip } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SendIcon from '@mui/icons-material/Send';
import { getAccessToken } from './authConfig';
import { sendKBQueryAPI } from './services';
import axios from 'axios';

const API_GATEWAY = 'http://localhost:8000';

function KnowledgeBaseAssistant({ instance, account, loginRequest }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]); // { sender: 'user'|'bot', text: string }
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Always scroll to bottom when a new message is added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    const userMessage = { sender: 'user', text: question };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setQuestion('');
    try {
      const accessToken = await getAccessToken(instance, account, loginRequest);
      const res = await sendKBQueryAPI(question, accessToken)
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: res.data.answer }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Error getting answer. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={24}
      sx={{
        width: '100%',
        maxWidth: 900,
        minWidth: 600,
        minHeight: 540,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 12px 48px 0 rgba(0,0,0,0.18)',
        border: '2.5px solid',
        borderColor: 'primary.light',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #e3eafc 60%, #f8fafc 100%)',
        backdropFilter: 'blur(2px)',
        mx: 'auto',
        my: 4,
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          px: 4,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '2.5px solid',
          borderColor: 'primary.light',
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          position: 'relative',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            width: 48,
            height: 48,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            mr: 2,
          }}
        >
          <MenuBookIcon sx={{ fontSize: 32, opacity: 0.92 }} />
        </Avatar>
        <Box>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 900,
              letterSpacing: 0.8,
              fontSize: '1.45rem',
              display: 'flex',
              alignItems: 'center',
              textShadow: '0 1px 8px rgba(0,0,0,0.10)',
              userSelect: 'none',
            }}
          >
            Knowledge Base Assistant
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 400,
              fontSize: '1.01rem',
              letterSpacing: 0.2,
              mt: 0.2,
              opacity: 0.92,
            }}
          >
            Ask questions about your company files and documents.
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ m: 0, borderColor: 'primary.light', opacity: 0.5 }} />
      {/* Chat content */}
      <Box
        sx={{
          flexGrow: 1,
          p: 0,
          bgcolor: 'transparent',
          minHeight: 320,
          maxHeight: 'calc(90vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(120deg, #f8fafc 60%, #e3eafc 100%)',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          overflow: 'hidden',
        }}
        tabIndex={0}
      >
        {/* The scrollable message list */}
        <div
          ref={chatScrollRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: messages.length === 0 ? 'center' : 'flex-start',
            minHeight: 0,
            maxHeight: '100%',
            height: '100%',
            padding: '32px 36px 18px 36px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            background: 'none',
          }}
        >
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#7a8ca7',
              fontSize: 18,
              marginTop: 32,
              opacity: 0.85,
              fontStyle: 'italic',
              letterSpacing: 0.1,
            }}>
              Ask a question (about company files) to get started.
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  maxWidth: '68%',
                  background: msg.sender === 'user'
                    ? 'linear-gradient(90deg, #1976d2 80%, #1565c0 100%)'
                    : 'linear-gradient(90deg, #f1f5fa 80%, #e3eafc 100%)',
                  color: msg.sender === 'user' ? '#fff' : '#1a237e',
                  borderRadius: msg.sender === 'user'
                    ? '18px 18px 6px 18px'
                    : '18px 18px 18px 6px',
                  padding: '16px 22px',
                  fontSize: 17,
                  lineHeight: 1.7,
                  boxShadow: msg.sender === 'user'
                    ? '0 2px 12px rgba(25,118,210,0.13)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  border: msg.sender === 'bot' ? '1.5px solid #dbeafe' : 'none',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  position: 'relative',
                  overflowWrap: 'break-word',
                  overflowY: 'auto',
                  maxHeight: '44vh',
                  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  transition: 'background 0.18s',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </Box>
      <Divider sx={{ m: 0, borderColor: 'primary.light', opacity: 0.5 }} />
      <form
        onSubmit={handleAsk}
        style={{
          display: 'flex',
          gap: 0,
          alignItems: 'center',
          padding: '0 32px 24px 32px',
          background: 'none',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          minHeight: 80,
        }}
        autoComplete="off"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question..."
          style={{
            flex: 1,
            padding: '18px 20px',
            fontSize: 17,
            borderRadius: 10,
            border: '2px solid #b6c6e3',
            outlineColor: '#1976d2',
            background: '#fff',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: '0 1px 8px rgba(25,118,210,0.06)',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            marginRight: 18,
            color: '#1a237e',
            fontWeight: 500,
            letterSpacing: 0.1,
          }}
          onFocus={e => (e.target.style.borderColor = '#1976d2')}
          onBlur={e => (e.target.style.borderColor = '#b6c6e3')}
          disabled={loading}
          autoComplete="off"
        />
        <Tooltip title={loading ? "Sending..." : "Send"}>
          <span>
            <IconButton
              type="submit"
              disabled={loading || !question.trim()}
              sx={{
                background: loading || !question.trim()
                  ? 'linear-gradient(90deg, #b6c6e3 80%, #a1c1e8 100%)'
                  : 'linear-gradient(90deg, #1976d2 80%, #1565c0 100%)',
                color: '#fff',
                borderRadius: 2,
                p: 2.2,
                minWidth: 0,
                minHeight: 0,
                fontSize: 22,
                fontWeight: 700,
                cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                boxShadow: loading || !question.trim()
                  ? 'none'
                  : '0 2px 8px rgba(25,118,210,0.13)',
                '&:hover': {
                  background: !loading && question.trim()
                    ? 'linear-gradient(90deg, #1565c0 80%, #1976d2 100%)'
                    : undefined,
                },
                ml: 0,
              }}
              aria-label="send"
            >
              <SendIcon sx={{ fontSize: 28, opacity: loading || !question.trim() ? 0.5 : 1 }} />
            </IconButton>
          </span>
        </Tooltip>
      </form>
    </Paper>
  );
}

export default KnowledgeBaseAssistant; 