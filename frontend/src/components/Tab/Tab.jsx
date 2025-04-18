/* eslint-disable no-underscore-dangle */
/* eslint-disable react/button-has-type */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/prop-types */
import React from 'react';

import { useWindowSize } from '@uidotdev/usehooks';
import { useCollapse } from 'react-collapsed';
import { useCookies } from 'react-cookie';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import TabRow from './TabRow';
import { markQuestionAsDone } from '../../actions/actions';

function Tab(props) {
  const {
    width,
  } = useWindowSize();
  const isMobile = width < 768;

  const {
    data, group, isRecap, userId, isOpen, tabCookie,
  } = props;

  const navigate = useNavigate();

  const [cookies, setCookie, removeCookie] = useCookies(['openTab']);

  // To collapse a section
  const {
    getCollapseProps, getToggleProps, isExpanded,
  } = useCollapse({
    isExpanded: isOpen,
  });

  const dispatch = useDispatch();
  const markAsDoneHandler = (questionId) => {
    if (userId === 'guest') {
      // eslint-disable-next-line no-undef
      alert('Sign in to save progress');
      return navigate('/login');
    }
    dispatch(markQuestionAsDone({
      questionId,
      userId,
    }));
  };

  if (!data.length) {
    return (
      <div>
        <p>🔥🔥🔥</p>
        <p>You have solved all questions for today!</p>
        <button type="button" className="button-6" onClick={() => navigate('/')}>See all questions</button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '4px 0px',
      width: '100%',
    }}
    >
      {group && (
        <button
          {...getToggleProps({
            onClick: () => ((tabCookie !== group) ? setCookie('openTab', group, {
              path: '/',
            }) : setCookie('openTab', null, {
              path: '/',
            })),
          })}
          className="button-6"
        >
          {(isExpanded) ? `${group} 🔼` : `${group} 🔽`}
        </button>
      )}
      <section {...getCollapseProps()}>
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              {!isMobile && <th>Code</th>}
              {!isMobile && <th>Notes</th>}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {
            data.map((question) => {
              const tabRowProps = {
                ...question,
                isRecap,
                markAsDoneHandler,
              };
              return (
                <TabRow
                  key={question._id}
                  {...tabRowProps}
                />
              );
            })
            }
          </tbody>
        </table>
      </section>

    </div>
  );
}

export default Tab;
