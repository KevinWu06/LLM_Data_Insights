// AskComponent.js
import React, { useState } from 'react';
import { SendQueryAPI } from './services.js'; // adjust the path as needed

function AskComponent() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question) return;

    setLoading(true);
    try {
      const res = await SendQueryAPI(question);
      setAnswer(res.data.answer); // assuming your backend returns { answer: "..." }
    } catch (err) {
      console.error('Failed to fetch answer:', err);
      setAnswer('Error getting answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Banner Insights Chatbot</h2>
      <form onSubmit={handleAsk} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question about banners..."
          style={{ width: '80%', padding: 8 }}
        />
        <button type="submit" style={{ padding: 8, marginLeft: 8 }} disabled={loading || !question}>
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </form>
      {answer && (
        <div style={{ background: '#f4f4f4', padding: 16, borderRadius: 8 }}>
          <strong>Answer:</strong>
          <div>{answer}</div>
        </div>
      )}
    </div>
  );
}

export default AskComponent;
