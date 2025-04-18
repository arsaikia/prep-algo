/* eslint-disable react/prop-types */
import React from 'react';

import TabbedSelection from './TabbedSelection/TabbedSelection';

function All(props) {
  const {
    allQuestionsProps: {
      tabCookie,
      userId,
    },
  } = props;

  return (
    <TabbedSelection
      allQuestionsProps={{
        tabCookie,
        userId,
      }}
    />
  );
}

export default All;
