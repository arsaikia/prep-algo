/* eslint-disable react/prop-types */
import React from 'react';

import { useWindowSize } from '@uidotdev/usehooks';
import {
  useDispatch, useSelector,
} from 'react-redux';
import { Tooltip } from 'react-tooltip';

import DifficultyDot from './DifficultyDot';
import { launchCodeModal } from '../../actions/actions';
import {
  Flex,
  UnstyledLink,
} from '../../styles';
import GreenCheck from '../GreenCheck/GreenCheck';

function TabRow(props) {
  const {
    _id: id,
    difficulty,
    group,
    isRecap,
    lastUpdatedAt,
    link,
    markAsDoneHandler,
    name,
    solveCount,
  } = props;

  const {
    width,
  } = useWindowSize();
  const isMobile = width < 768;

  // Get states using useSelector ( state->reducerName )
  const codeState = useSelector((state) => state.codeModal);

  // Fire actions using dispatch -> fires action -> Watcher saga handles rest
  const dispatch = useDispatch();

  const codeButtonHandler = () => {
    // Check if question code is already in redux store
    const {
      codes,
    } = codeState;
    let codeInRedux = false;
    // eslint-disable-next-line no-plusplus
    for (let idx = 0; idx < codes.length; idx++) {
      const element = codes[idx];
      if (element.questionId === id) {
        codeInRedux = true;
        console.log(codeInRedux);
        break;
      }
    }
    if (!codeInRedux) {
      dispatch(launchCodeModal({
        fetchCode: true,
        group,
        id,
        link,
      }));
    } else {
      dispatch(launchCodeModal({
        fetchCode: false,
        group,
        id,
        link,
      }));
    }
  };

  return (
    <tr key={id}>
      <td style={{
        textAlign: 'left',
      }}
      >
        <Flex alignItems="center">
          <DifficultyDot text={difficulty} id={id} />
          <UnstyledLink
            href={`https://leetcode.com/problems/${link}`}
            target="_blank"
            rel="noopener noreferrer"
            data-tooltip-id={link}
          >
            {name}
          </UnstyledLink>
        </Flex>
        {/* Go to leetcode tooltip */}
        <Tooltip
          id={link}
          className="tooltip-z-idx"
          place="top"
            // variant={ }
          content=" ⭐ Go to leetcode ⭐ "
        />

        {/* <DifficultyBadge text={difficulty} /> */}
      </td>
      {!isMobile && (
      <td>
        <button type="button" className="button-30" onClick={codeButtonHandler}>{'</>'}</button>
      </td>
      )}

      {!isMobile
         && (
         <td>
           <button type="button" className="button-30">📄</button>
         </td>
         )}
      <td>
        {/* Unsolved Questions */}
        {/* On Desktop */}
        {(!isMobile && solveCount === 0)
          && <button className="button-41" type="submit" onClick={() => markAsDoneHandler(id)}>Done</button>}
        {/* On Mobile */}
        {(isMobile && solveCount === 0)
          && <GreenCheck onClick={() => markAsDoneHandler(id)} />}

        {/* Solved - TODO tab */}
        {/* On Desktop */}
        {(!isMobile && solveCount > 0 && isRecap)
          && <button className="button-41" type="submit" onClick={() => markAsDoneHandler(id)}>Done</button>}
        {/* On Mobile */}
        {(isMobile && solveCount > 0 && isRecap)
          && <GreenCheck onClick={() => markAsDoneHandler(id)} />}

        {/* Solved - All questions. Top 150 tab */}
        {(solveCount > 0 && !isRecap) && (
        <span
          style={{
            cursor: 'default',
          }}
          data-tooltip-id={lastUpdatedAt}
        >
          {`🔥 x ${solveCount}`}
        </span>
        )}
        {/* Last Updated at tooltip */}
        <Tooltip
          id={lastUpdatedAt}
          className="tooltip-z-idx"
          place="top"
            // variant={ }
          content={lastUpdatedAt}
        />
      </td>
    </tr>
  );
}

export default TabRow;
