/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-len */
import React from 'react';

import 'react-tabs/style/react-tabs.css';
import TabbedSelection from '../components/TabbedSelection/TabbedSelection';

function Playground() {
  return (
    <TabbedSelection
      allQuestionsContent={(
        <div>
          <p>lorem</p>
          <img src="" href="" alt="sds" />
        </div>
)}
      topQuestionsContent="lorem lorem 2"
    />
  );
}

export default Playground;
