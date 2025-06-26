import React, { useState } from 'react';
import TableauEmbed from './tableau_embed';
import AskComponent from './ask_component';
import CsvUpload from './csv_upload';

function App() {
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('session_id') || '');

  return (
    <div>
      <CsvUpload setSessionId={setSessionId} />
      <AskComponent sessionId={sessionId} />
      <TableauEmbed />
    </div>
  );
}

export default App; 