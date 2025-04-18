/* eslint-disable react/prop-types */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-len */
import React from 'react';

import { useSelector } from 'react-redux';
import {
  TabPanel,
  Tabs,
  TabList,
  Tab,
} from 'react-tabs';

import GroupedQuestionSection from '../Tab/index';

import 'react-tabs/style/react-tabs.css';

function TabbedSelection(props) {
  const {
    allQuestionsProps: {
      tabCookie,
      userId,
    },
  } = props;

  // Get states using useSelector ( state->reducerName )
  const allQuestions = useSelector((state) => state.questions.allQuestions);
  const topQuestions = useSelector((state) => state.questions.topQuestions);

  const centeredTabList = {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  };

  const tabStyling = {
    fontWeight: 500,
    marginLeft: '5px',
    marginRight: '5px',
  };

  return (
    <Tabs>
      <TabList style={centeredTabList}>
        <Tab styles={tabStyling}>TOP Questions</Tab>
        <Tab styles={tabStyling}>ALL Questions</Tab>
      </TabList>

      <TabPanel>
        {
        topQuestions.groups.map((group) => (
          <GroupedQuestionSection
            key={group}
            data={topQuestions.questions[group]}
            group={group}
            userId={userId}
            isOpen={tabCookie === group}
            tabCookie={tabCookie}
          />
        ))
        }
      </TabPanel>

      <TabPanel>
        {
        allQuestions?.groups.map((group) => (
          <GroupedQuestionSection
            key={group}
            data={allQuestions.questions[group]}
            group={group}
            userId={userId}
            isOpen={tabCookie === group}
            tabCookie={tabCookie}
          />
        ))
        }
      </TabPanel>

    </Tabs>
  );
}

export default TabbedSelection;
