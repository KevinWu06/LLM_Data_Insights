import React, { useState } from 'react';
import TableauEmbed from './tableau_embed';
import AskComponent from './ask_component';
import CsvUpload from './csv_upload';

function App() {

  return (
    <div >
      <CsvUpload/>
      <AskComponent />
      <TableauEmbed />
    </div>
  );
}

export default App; 