/* eslint-disable react/prop-types */

import React, {
  useState, useEffect,
} from 'react';

import {
  CopyBlock, dracula,
} from 'react-code-blocks';
import Modal from 'react-modal';
import {
  useDispatch,
  useSelector,
} from 'react-redux';

import Loader from './Loader/Loader';
import { closeCodeModal } from '../actions/actions';

// Make sure to bind modal to your appElement (https://reactcommunity.org/react-modal/accessibility/)
Modal.setAppElement('#root');

const customStyles = {
  content: {
    bottom: 'auto',
    left: '50%',
    marginRight: '-50%',
    maxHeight: '80vh',
    right: 'auto',
    top: '55%',
    transform: 'translate(-50%, -50%)',
  },
  overlay: {
    backgroundColor: 'rgba(204,214,246,0.6)',

  },
};

function CodeSection() {
  const [codeText, setCodeText] = useState('');

  // Get states using useSelector ( state->reducerName )
  const codeState = useSelector((state) => state.codeModal);
  const {
    showLoading, showCodeModal, selectedQuestionId, codes,
  } = codeState;

  useEffect(() => {
    if (!selectedQuestionId) return;

    // eslint-disable-next-line no-unused-vars
    const codeToShow = codes.filter((code, idx) => code.questionId === selectedQuestionId);

    if (codeToShow.length) {
      setCodeText(codeToShow[0].code);
    }

    // eslint-disable-next-line consistent-return
    return () => {
      setCodeText('');
    };
  }, [codes, selectedQuestionId]);



  // Fire actions using dispatch -> fires action -> Watcher saga handles rest
  const dispatch = useDispatch();
  const closeCodeModalHandler = () => dispatch(closeCodeModal());

  const {
    language,
    lineNumbers,
    text,
  } = {
    language: 'python',
    lineNumbers: true,
    text: codeText,
    wrapLines: true,
  };

  return (
    <Modal
      isOpen={showCodeModal}
      style={customStyles}
      contentLabel="Code Modal"
      onRequestClose={closeCodeModalHandler}
      overlayClassName="Modal__Overlay"
    >
      {showLoading && <Loader show />}
      {
        !showLoading && text
        && (
          <CopyBlock
            language={language}
            text={text}
            showLineNumbers={lineNumbers}
            theme={dracula}
            wrapLines
            codeBlock
          />
        )
      }
    </Modal>
  );
}

export default CodeSection;
