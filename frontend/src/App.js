import React, { useState } from 'react';
import TableauEmbed from './tableau_embed';
import AskComponent from './ask_component';

function App() {

  return (
    <div >
      <AskComponent />
      <TableauEmbed />
    </div>
  );
}

export default App; 