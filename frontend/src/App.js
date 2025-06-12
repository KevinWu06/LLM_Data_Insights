import React, { useState } from 'react';
import TableauEmbed from './tableau_embed';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAnswer('');
    const res = await fetch('http://localhost:8000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    const data = await res.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Banner Insights Chatbot</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
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

      {/* <h1>Tableau Dashboard</h1>
      <TableauEmbed /> */}

      <div style={{ width: "175%", margin: "40px auto" }}>
        <tableau-viz
          src="https://public.tableau.com/views/CreativeWear-Out/Dashboard1"
          style={{
            width: "175%",
            height: "800px",
          }}
        ></tableau-viz>
      </div>
    </div>
  );
}

export default App; 