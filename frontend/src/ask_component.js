// AskComponent.js
import React, { useState, useRef, useEffect } from 'react';
import { SendQueryAPI } from './services.js';

function AskComponent({ instance, account, loginRequest, sessionId, systemMessage }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Add system message when it changes
  useEffect(() => {
    if (systemMessage) {
      setMessages((prev) => [...prev, { sender: 'bot', text: systemMessage }]);
    }
  }, [systemMessage]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage = { sender: 'user', text: question };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setQuestion('');
    try {
      // Call API with sessionId
      const res = await SendQueryAPI(userMessage.text, sessionId);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: res.data.answer }
      ]);
    } catch (err) {
      console.error('Failed to fetch answer:', err);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Error getting answer. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 540,
        margin: '0 auto',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#222',
        padding: '0 0 10px 0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 320,
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px 12px 8px',
          background: 'linear-gradient(120deg, #f8fafc 60%, #e3eafc 100%)',
          borderRadius: 12,
          minHeight: 220,
          marginBottom: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#888',
            fontSize: 16,
            marginTop: 32,
            opacity: 0.8,
            fontStyle: 'italic'
          }}>
            Ask a question (about uploaded dataset) to get started.
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                maxWidth: '75%',
                background: msg.sender === 'user' ? 'linear-gradient(90deg, #1976d2 80%, #1565c0 100%)' : '#f1f5fa',
                color: msg.sender === 'user' ? '#fff' : '#1a237e',
                borderRadius: msg.sender === 'user'
                  ? '16px 16px 4px 16px'
                  : '16px 16px 16px 4px',
                padding: '12px 16px',
                fontSize: 16,
                lineHeight: 1.5,
                boxShadow: msg.sender === 'user'
                  ? '0 2px 8px rgba(25,118,210,0.10)'
                  : '0 2px 8px rgba(0,0,0,0.06)',
                border: msg.sender === 'bot' ? '1.5px solid #dbeafe' : 'none',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                position: 'relative',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleAsk}
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '0 2px',
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
            padding: '12px 16px',
            fontSize: 16,
            borderRadius: 8,
            border: '1.5px solid #b6c6e3',
            outlineColor: '#1976d2',
            background: '#fff',
            transition: 'border-color 0.2s',
            boxShadow: '0 1px 4px rgba(25,118,210,0.04)',
          }}
          onFocus={e => (e.target.style.borderColor = '#1976d2')}
          onBlur={e => (e.target.style.borderColor = '#b6c6e3')}
          disabled={loading}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            background: loading || !question.trim()
              ? 'linear-gradient(90deg, #b6c6e3 80%, #a1c1e8 100%)'
              : 'linear-gradient(90deg, #1976d2 80%, #1565c0 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 28px',
            fontSize: 16,
            fontWeight: 600,
            cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            boxShadow: loading || !question.trim()
              ? 'none'
              : '0 2px 8px rgba(25,118,210,0.13)',
            minWidth: 90,
            letterSpacing: 0.2,
          }}
          onMouseEnter={e => {
            if (!loading && question.trim()) e.target.style.background = 'linear-gradient(90deg, #1565c0 80%, #1976d2 100%)';
          }}
          onMouseLeave={e => {
            if (!loading && question.trim()) e.target.style.background = 'linear-gradient(90deg, #1976d2 80%, #1565c0 100%)';
          }}
        >
          {loading ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default AskComponent;
