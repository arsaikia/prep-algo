import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';
import { Play, Save, Download, Link, Shuffle, Clock, Code, Terminal, Eye, Settings } from 'react-feather';
import { Timer, Pause, Play as PlayLucide, Square, Zap, Monitor, FileDown, FileText, Shuffle as ShuffleLucide, Code2, Terminal as TerminalLucide, Eye as EyeLucide, Settings as SettingsLucide, RotateCcw, Copy, Check, Minus, Plus, Lock } from 'lucide-react';
import { useSelector } from 'react-redux';
import apiClient from '../api/client.js';
import TestResults from '../components/TestResults.jsx';
import { parameterNames } from '../utils/testResultFormat.js';
import McqSolver from '../components/McqSolver/McqSolver.jsx';
import { loadIndex, loadItem } from '../content/loader.js';
import { isCdnContentEnabled } from '../content/source.js';
import { findQuestionEntry, toSandboxQuestion, toSlug } from '../content/sandboxQuestion.js';
import { useTimeTracker } from '../utils/timeTracker.js';
import { useTestUser } from '../contexts/TestUserContext';
import { isFeatureEnabled, isDevMode } from '../utils/featureFlags';
import readApiError from '../utils/apiError.js';
import { requestSignIn, contentUrl } from '../utils/navigation.js';
import { timeTracker } from '../utils/timeTracker.js';
import { readDraft, writeDraft, clearDraft } from '../utils/draftStorage.js';

const Editor = lazy(() => import('@monaco-editor/react'));

// The editor is the only place a user's work lives before it is submitted, so an
// unsaved buffer is kept in localStorage per (question, language). Without this a
// refresh, a tab switch or an accidental back-navigation silently discarded the
// solution and dropped the user back onto untouched boilerplate.
const FONT_SIZE_KEY = 'sandbox-font-size';
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 22;
const DEFAULT_FONT_SIZE = 14;

const readStoredFontSize = () => {
  try {
    const stored = Number(window.localStorage.getItem(FONT_SIZE_KEY));
    if (!Number.isFinite(stored) || stored < MIN_FONT_SIZE || stored > MAX_FONT_SIZE) {
      return DEFAULT_FONT_SIZE;
    }
    return stored;
  } catch {
    return DEFAULT_FONT_SIZE;
  }
};

const isMacPlatform = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

// Modern styled components with clean design
/*
 * The sandbox owns the viewport. It is a workspace, not an article: the
 * previous shape stacked description, editor and output as three cards down a
 * scrolling page, which put "Output & Results" several hundred pixels below the
 * fold — you submitted code and then had to go looking for the verdict.
 * Everything here is sized against the viewport so all three regions are
 * visible at once and each scrolls independently.
 */
const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  flex-shrink: 0;
`;

const ProblemTitle = styled.h1`
  font-size: 1rem;
  font-weight: 650;
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40vw;
`;

const DIFFICULTY_COLOR = {
  Easy: '#22c55e',
  Medium: '#f59e0b',
  Hard: '#ef4444'
};

const DifficultyPill = styled.span`
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  color: ${({ $level }) => DIFFICULTY_COLOR[$level] || '#8b95a5'};
  background: ${({ $level }) => (DIFFICULTY_COLOR[$level] || '#8b95a5')}1f;
`;

const TopBarSpacer = styled.div`
  flex: 1;
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

/* The split row. Panes are sized by percentage so a drag survives a resize. */
const MainContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;

  /*
   * Below the split point a side-by-side pane would be ~300px wide each, too
   * narrow for either prose or code, so the panes stack and the page scrolls.
   */
  @media (max-width: 900px) {
    flex-direction: column;
    overflow-y: auto;
  }
`;

const LeftPane = styled.div`
  width: ${({ $pct }) => $pct}%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 900px) {
    width: 100%;
    /*
     * A definite height, not auto: the description's flex:1 child has no
     * content-based basis, so an auto-height pane collapses it to nothing.
     */
    height: 55vh;
    flex: none;
  }
`;

const RightColumn = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 900px) {
    height: 80vh;
    flex: none;
  }
`;

const EditorPane = styled.div`
  height: ${({ $pct }) => $pct}%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ConsolePane = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

/*
 * Drag handles. They are wider than they look: a 1px divider is the correct
 * visual weight but an unhittable target, so the hit area is padded and the
 * visible line is drawn inside it.
 */
const dragHandle = `
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  background: transparent;
  border: none;
  padding: 0;
`;

const VerticalHandle = styled.div`
  ${dragHandle}
  width: 9px;
  margin: 0 -4px;
  cursor: col-resize;

  &::after {
    content: '';
    position: absolute;
    inset: 0 4px;
    background: ${({ theme }) => theme.colors.border};
    transition: background 0.15s ease;
  }

  &:hover::after, &[data-dragging='true']::after {
    background: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 900px) { display: none; }
`;

const HorizontalHandle = styled.div`
  ${dragHandle}
  height: 9px;
  margin: -4px 0;
  cursor: row-resize;

  &::after {
    content: '';
    position: absolute;
    inset: 4px 0;
    background: ${({ theme }) => theme.colors.border};
    transition: background 0.15s ease;
  }

  &:hover::after, &[data-dragging='true']::after {
    background: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 900px) { display: none; }
`;

const PaneTabBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  flex-shrink: 0;
`;

const PaneTab = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.6rem 0.8rem;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ theme, $active }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.text : theme.colors.textSecondary)};
  font-size: 0.85rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;

  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const TabBadge = styled.span`
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  color: ${({ theme, $tone }) => ($tone === 'error' ? '#ef4444' : $tone === 'success' ? '#22c55e' : theme.colors.textSecondary)};
  background: ${({ theme, $tone }) => ($tone === 'error' ? '#ef444422' : $tone === 'success' ? '#22c55e22' : theme.colors.backgroundTertiary)};
`;



const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;



const QuestionInputSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
`;

const QuestionInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const ModernButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: ${props => props.variant === 'primary'
    ? `linear-gradient(135deg, ${props.theme.colors.primary}, ${props.theme.colors.secondary || props.theme.colors.primary}dd)`
    : props.variant === 'success'
      ? `linear-gradient(135deg, #28a745, #20c997)`
      : props.variant === 'danger'
        ? `linear-gradient(135deg, #dc3545, #e83e8c)`
        : props.theme.colors.background
  };
  color: ${props => props.variant === 'primary' || props.variant === 'success' || props.variant === 'danger'
    ? '#ffffff'
    : props.theme.colors.text
  };
  border: ${props => props.variant === 'primary' || props.variant === 'success' || props.variant === 'danger'
    ? 'none'
    : `2px solid ${props.theme.colors.border}`
  };
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.variant === 'primary' || props.variant === 'success' || props.variant === 'danger'
    ? 'rgba(255, 255, 255, 0.1)'
    : `linear-gradient(135deg, ${props.theme.colors.primary}10, ${props.theme.colors.secondary || props.theme.colors.primary}05)`
  };
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 8px;
  }

  &:hover:before {
    opacity: 1;
  }

  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${props => props.variant === 'primary'
    ? `0 12px 30px ${props.theme.colors.primary}50`
    : props.variant === 'success'
      ? `0 12px 30px #28a74550`
      : props.variant === 'danger'
        ? `0 12px 30px #dc354550`
        : `0 6px 20px ${props.theme.colors.primary}25`
  };
  }

  &:active {
    transform: translateY(-1px) scale(1.01);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  &:disabled:hover {
    transform: none;
    box-shadow: none;
  }
`;



const QuickTestGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const QuickTestButton = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  background: ${props => props.isActive ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.isActive ? '#ffffff' : props.theme.colors.text};
  border: 1px solid ${props => props.isActive ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.isActive ? props.theme.colors.primary : props.theme.colors.backgroundHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;




const TimerTime = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;


const TimerControls = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const TimerIcon = styled(Timer)`
  color: ${({ theme }) => theme.colors.primary};
  animation: tick 1.5s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 6px ${({ theme }) => theme.colors.primary}50);
  margin-right: 8px;
  
  @keyframes tick {
    0% { 
      transform: scale(1) rotate(-3deg);
      filter: drop-shadow(0 0 6px ${({ theme }) => theme.colors.primary}50);
    }
    100% { 
      transform: scale(1.1) rotate(3deg);
      filter: drop-shadow(0 0 10px ${({ theme }) => theme.colors.primary}70);
    }
  }
`;

const TimerButton = styled(ModernButton)`
  padding: 6px 10px;
  font-size: 12px;
  min-width: 0;
  height: 30px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.3s ease, height 0.3s ease;
  }
  
  &:hover::after {
    width: 60px;
    height: 60px;
  }
  
  &:active {
    transform: translateY(0) scale(0.96);
  }
`;


const EditorCard = styled.div`
  /* Fills its split pane; the drag handle owns the height, not a clamp(). */
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  flex-shrink: 0;
`;

const EditorActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const EditorToolGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 32px;
  height: 30px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.backgroundHover};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const EditorStatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-shrink: 0;
`;

const StatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const StatusItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
`;

const ShortcutKey = styled.kbd`
  font-family: inherit;
  font-size: 10.5px;
  padding: 1px 5px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  color: ${({ theme }) => theme.colors.text};
`;

const DraftDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
`;

const EditorLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
`;

const LanguageSelector = styled.select`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}20;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundHover};
  }
`;

const EditorContainer = styled.div`
  flex: 1;
  min-height: 0;
  background: ${({ theme }) => theme.colors.background};
`;

const OutputCard = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const OutputContent = styled.div`
  flex: 1;
  min-height: 0;
  padding: 0.85rem 1rem;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text};
  white-space: pre-wrap;
  overflow-y: auto;
`;

const FEEDBACK_TONES = {
  pending: { fg: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)', border: 'rgba(37, 99, 235, 0.35)' },
  success: { fg: '#15803d', bg: 'rgba(21, 128, 61, 0.08)', border: 'rgba(21, 128, 61, 0.35)' },
  // Used when the code was correct but something after grading went wrong, so
  // the result reads as neither a clean pass nor a failed solution.
  warning: { fg: '#b45309', bg: 'rgba(180, 83, 9, 0.08)', border: 'rgba(180, 83, 9, 0.35)' },
  error: { fg: '#b91c1c', bg: 'rgba(185, 28, 28, 0.08)', border: 'rgba(185, 28, 28, 0.35)' }
};

const tone = ($tone) => FEEDBACK_TONES[$tone] || FEEDBACK_TONES.pending;

const FeedbackBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: 10px;
  font-family: ${({ theme }) => theme?.fonts?.body || 'inherit'};
  font-size: 14px;
  font-weight: 600;
  white-space: normal;
  color: ${({ $tone }) => tone($tone).fg};
  background: ${({ $tone }) => tone($tone).bg};
  border: 1px solid ${({ $tone }) => tone($tone).border};
`;

const FeedbackSpinner = styled.span`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: feedbackSpin 0.7s linear infinite;

  @keyframes feedbackSpin {
    to { transform: rotate(360deg); }
  }
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

/**
 * The single place an action decides whether it can run.
 *
 * `gated` deliberately never feeds `disabled`. The original Submit button was
 * `disabled={isGuest}` with the label "Sign in to Submit", so a guest's click
 * was swallowed by the browser and the page did nothing at all. Routing the
 * gate through `onGatedClick` keeps the button live and turns the gate into a
 * real affordance. `disabled` is now reserved for work that is genuinely in
 * flight, which is the only case where a click has nothing to do.
 */
const SandboxActionButton = ({
  gated,
  gatedLabel,
  onGatedClick,
  pending,
  pendingLabel,
  busy,
  onClick,
  icon,
  variant,
  children
}) => {
  const label = gated ? gatedLabel : pending ? pendingLabel : children;

  return (
    <ModernButton
      variant={variant}
      onClick={gated ? onGatedClick : onClick}
      disabled={!gated && Boolean(busy)}
      aria-busy={pending ? 'true' : undefined}
    >
      {icon}
      {label}
    </ModernButton>
  );
};

const QuestionDescription = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.1rem 1.35rem 2.5rem;
  font-size: 14px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text};
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    background: ${({ theme }) => theme.colors.background};
    padding: 12px;
    border-radius: 6px;
    margin: 12px 0;
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  
  code {
    font-family: 'Fira Code', monospace;
    background: ${({ theme }) => theme.colors.background};
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  
  p {
    margin: 12px 0;
  }
  
  ul, ol {
    margin: 12px 0;
    padding-left: 24px;
  }
`;

const DevLoader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
`;

const ConsoleHint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-family: ${({ theme }) => theme?.fonts?.body || 'inherit'};
  font-size: 0.85rem;
  line-height: 1.6;
`;

const GuestBanner = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}15, ${({ theme }) => theme.colors.secondary || theme.colors.primary}08);
  border-bottom: 1px solid ${({ theme }) => theme.colors.primary}40;
  padding: 0.6rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const GuestSignInButton = styled.button`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.secondary || theme.colors.primary}dd);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  &:hover { transform: translateY(-1px); opacity: 0.9; }
`;

const ErrorAlert = styled.div`
  padding: 0.7rem 1rem;
  background: #dc354512;
  border-bottom: 1px solid #dc354540;
  color: #dc3545;
  flex-shrink: 0;
  font-weight: 500;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

/**
 * Reads a question from the CDN, where bodies are published to be fetched on
 * open, so opening one costs the backend nothing. The API returns the same
 * shape and is the fallback when the CDN is disabled, an artifact is missing,
 * or the param is not in the index; a genuinely unknown question then fails
 * with the API's 404.
 */
const loadQuestion = async (value) => {
  if (isCdnContentEnabled()) {
    const entry = findQuestionEntry(await loadIndex(), value);
    if (!entry) {
      const error = new Error('Question not found');
      error.status = 404;
      throw error;
    }
    return toSandboxQuestion(await loadItem(entry.slug, entry.h));
  }

  const response = await apiClient.get(`/questions/${encodeURIComponent(toSlug(value))}`);
  return response.data;
};

const CodeSandbox = () => {
  const theme = useTheme();
  const location = useLocation();
  const requestedQuestion = new URLSearchParams(location.search).get('question');
  const navigate = useNavigate();
  const { selectedUserId } = useTestUser();
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [questionDescription, setQuestionDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // One explicit lifecycle shared by the two code-execution actions (run examples,
  // submit): idle -> pending -> success | error. The previous code spread this across
  // `isLoading`, a transient status string and `error`, which is how the button ended
  // up claiming to be busy while a totally unrelated request was in flight.
  const [executionFeedback, setExecutionFeedback] = useState({ status: 'idle', message: '' });
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRunningExampleTests, setIsRunningExampleTests] = useState(false);
  const [exampleTestResults, setExampleTestResults] = useState(null);
  // The only language offered: the one the server grades this question in.
  const gradedLanguage = currentQuestion?.types?.language ?? 'python';
  const gradedLanguageLabel = gradedLanguage === 'javascript' ? 'JavaScript' : 'Python';
  // A JavaScript test is one scenario script, not a list of arguments.
  const resultParameterNames = gradedLanguage === 'javascript' ? ['test'] : parameterNames(currentQuestion?.templates?.python);
  const [debugOutput, setDebugOutput] = useState('');

  // Editor UX state. `fontSize` is persisted because it is an accessibility setting,
  // not a per-session preference.
  const [fontSize, setFontSize] = useState(readStoredFontSize);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [draftRestored, setDraftRestored] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef(null);
  const draftTimerRef = useRef(null);
  const pendingDraftRef = useRef(null);
  const copyTimerRef = useRef(null);
  // Monaco commands are registered once on mount and would otherwise capture the
  // first render's closures, firing stale handlers for the rest of the session.
  const shortcutHandlersRef = useRef({});
  const pendingSubmissionRef = useRef(null);
  // The template effect keys off object identity; without this guard any unrelated
  // re-render that produced a new `currentQuestion` would wipe typed code.
  const lastTemplateKeyRef = useRef('');
  // Only the newest question load may touch state or redirect; an older one
  // that resolves late would otherwise replace what the user just opened.
  const loadSeqRef = useRef(0);

  // Time tracking states

  // Get user data from Redux store, but override with test user for development
  const userFromRedux = useSelector((state) => state.auth);
  const allQuestions = useSelector((state) => state.questions.allQuestionsWithoutHistory);
  const isDarkModeEnabled = useSelector((state) => state.theme.isDarkModeEnabled);
  const editorTheme = isDarkModeEnabled ? 'vs-dark' : 'vs';

  // Determine which user to use based on authentication state
  const getEffectiveUser = () => {
    // DEV MODE OVERRIDE: When dev mode is active and a test user is selected,
    // prioritize the test user over the authenticated user. This allows developers
    // to test different user scenarios even when they're logged in.
    if (isDevMode() && selectedUserId) {
      return {
        userId: selectedUserId,
        firstName: 'Test',
        lastName: 'User',
        isAuthenticated: true,
        picture: null
      };
    }

    // AUTHENTICATED USER: Use the real user's data when they're properly logged in
    if (userFromRedux.isAuthenticated && userFromRedux.userId && userFromRedux.userId !== 'guest') {
      return {
        userId: userFromRedux.id || userFromRedux.userId, // Handle the ID field issue
        firstName: userFromRedux.firstName,
        lastName: userFromRedux.lastName,
        isAuthenticated: true,
        picture: userFromRedux.picture
      };
    }

    // LOGIN BUG FALLBACK: Handle edge case where userId is "guest" but 
    // we have the actual user ID in the 'id' field (from auth reducer bug)
    if (userFromRedux.isAuthenticated && userFromRedux.id) {
      return {
        userId: userFromRedux.id,
        firstName: userFromRedux.firstName,
        lastName: userFromRedux.lastName,
        isAuthenticated: true,
        picture: userFromRedux.picture
      };
    }

    // GUEST FALLBACK: Return guest user object for unauthenticated sessions
    return {
      userId: 'guest',
      firstName: 'Guest',
      lastName: '',
      isAuthenticated: false,
      picture: null
    };
  };

  const user = getEffectiveUser();
  const isGuest = !user.isAuthenticated || user.userId === 'guest';
  const executionIdentity = `${location.search}:${user.userId}:${language}`;
  const activeExecutionIdentityRef = useRef(executionIdentity);
  activeExecutionIdentityRef.current = executionIdentity;
  useEffect(() => {
    setIsSubmitting(false);
    setIsRunningExampleTests(false);
    setTestResults(null);
    setExampleTestResults(null);
    setExecutionFeedback({ status: 'idle', message: '' });
    pendingSubmissionRef.current = null;
  }, [executionIdentity]);

  // Initialize time tracker
  const {
    currentTime: displayTime,
    isTracking,
    isPaused,
    startTracking,
    stopTracking,
    pause,
    resume,
  } = useTimeTracker();

  // Format time display
  const formatTime = (minutes) => {
    if (minutes < 1) {
      const seconds = Math.floor(minutes * 60);
      return `${seconds}s`;
    }
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start tracking when a question is loaded. Progress is keyed on the legacy
  // id, so content authored without one has nothing to track against.
  useEffect(() => {
    if (currentQuestion?.slug && currentQuestion.answerFormat === 'code') {
      startTracking(currentQuestion.slug, user.userId);
    }
  }, [currentQuestion?.slug, user.userId]);

  // Stops the clock. The solve itself was already recorded by the submit that
  // graded it; `success` only decides whether today's batch is ticked off.
  const handleSessionComplete = async (success) => {
    if (!isTracking) return;
    await stopTracking(success);
  };

  // Check for question parameter in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const questionParam = urlParams.get('question');

    if (questionParam) {
      setError(''); // Clear any existing errors
      setLeetcodeUrl(questionParam);
      // Automatically fetch the question
      fetchLeetCodeQuestion(questionParam);
    } else {
      setMissing(true);
      setIsLoading(false);
    }
    return () => { loadSeqRef.current += 1; };
  }, [location.search]);

  const getDefaultTemplate = (language, question) => {
    // If the question has a specific template, use it
    if (question?.templates?.[language]) {
      return question.templates[language];
    }

    // Generate a method name based on the question
    let methodName = 'solution';
    if (question?.name) {
      // Convert question name to camelCase for method name
      methodName = question.name
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, c => c.toLowerCase());
    }

    if (language === 'python') {
      return `class Solution:
    def ${methodName}(self, *args):
        """
        Write your solution here.
        """
        pass`;
    }

    return `class Solution {
    ${methodName}(...args) {
        // Write your solution here
    }
}`;
  };

  const handleLanguageChange = (e) => {
    const draft = pendingDraftRef.current;
    if (draft) writeDraft(draft.question, draft.language, draft.value);
    pendingDraftRef.current = null;
    clearTimeout(draftTimerRef.current);
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
  };

  const handleEditorChange = (value) => {
    const next = value ?? '';
    setCode(next);
    if (!isTracking && currentQuestion) startTracking(currentQuestion.slug, user.userId);
    if (!currentQuestion?.slug) return;
    // Debounced so a fast typist does not hit localStorage on every keystroke.
    clearTimeout(draftTimerRef.current);
    const questionKey = currentQuestion.slug;
    pendingDraftRef.current = { question: questionKey, language, value: next };
    draftTimerRef.current = setTimeout(() => {
      writeDraft(questionKey, language, next);
      pendingDraftRef.current = null;
    }, 400);
  };

  const getEditorLanguage = () => {
    return language === 'python' ? 'python' : 'javascript';
  };

  const resetToTemplate = () => {
    if (!window.confirm('Reset your code to the starter template? This replaces your current draft.')) return;
    const template = getDefaultTemplate(language, currentQuestion);
    clearTimeout(draftTimerRef.current);
    pendingDraftRef.current = null;
    clearDraft(currentQuestion.slug, language);
    if (requestedQuestion && requestedQuestion !== currentQuestion.slug) clearDraft(requestedQuestion, language);
    setCode(template);
    setDraftRestored(false);
    editorRef.current?.focus();
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setExecutionFeedback({
        status: 'error',
        message: 'Could not copy to the clipboard. Select the code and copy manually.'
      });
    }
  };

  const changeFontSize = (delta) => {
    setFontSize((current) => {
      const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, current + delta));
      try {
        window.localStorage.setItem(FONT_SIZE_KEY, String(next));
      } catch {
        // Preference is session-only when storage is unavailable.
      }
      return next;
    });
  };

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    editor.onDidChangeCursorPosition((event) => {
      setCursor({ line: event.position.lineNumber, column: event.position.column });
    });

    // Matches the shortcuts every competing platform uses, so muscle memory carries over.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      shortcutHandlersRef.current.run?.();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      shortcutHandlersRef.current.submit?.();
    });
  }, []);

  const runCode = async () => {
    const seq = loadSeqRef.current;
    const stale = () => seq !== loadSeqRef.current || executionIdentity !== activeExecutionIdentityRef.current;
    if (language !== gradedLanguage) {
      setExecutionFeedback({
        status: 'error',
        message: `This question is graded in ${gradedLanguageLabel}. Switch the language to ${gradedLanguageLabel} to submit.`
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setOutput('');
      setTestResults(null);
      setExecutionFeedback({ status: 'pending', message: 'Submitting your solution…' });

      const questionId = currentQuestion.slug;
      const signature = JSON.stringify([user.userId, questionId, currentQuestion.revision, language, code]);
      if (pendingSubmissionRef.current?.signature !== signature) {
        pendingSubmissionRef.current = { signature, id: crypto.randomUUID(), timeTaken: timeTracker.getElapsedSeconds() };
      }
      const response = await apiClient.post(`/questions/${encodeURIComponent(questionId)}/submit`, {
        code,
        submissionId: pendingSubmissionRef.current.id,
        timeTaken: pendingSubmissionRef.current.timeTaken,
        contentRevision: currentQuestion.revision,
      });
      if (stale()) return;
      if (response.data.attemptSaved) pendingSubmissionRef.current = null;

      // Format the results for display
      if (response.data && Array.isArray(response.data.results)) {
        const formattedResults = {
          summary: {
            passed: response.data.passedTests,
            failed: response.data.totalTests - response.data.passedTests,
            total: response.data.totalTests,
            score: response.data.score
          },
          results: response.data.results.map(r => ({
            testCase: r.input,
            output: r.actualOutput,
            expectedOutput: r.expectedOutput,
            passed: r.passed,
            status: r.status,
            runtimeMs: r.runtimeMs,
            hidden: r.hidden,
            error: r.error,
            debugOutput: r.debugOutput
          }))
        };

        setTestResults(formattedResults);
        setOutput(`Test results: ${response.data.passedTests}/${response.data.totalTests} tests passed (${response.data.score}% score)`);

        const allPassed = response.data.passedTests === response.data.totalTests;
        // A pass that silently fails to persist is the bug this whole path had
        // before, so the two outcomes are reported differently rather than both
        // reading as success.
        const passMessage = response.data.progressSaved
          ? `All ${response.data.totalTests} tests passed — saved to your progress.`
          : `All ${response.data.totalTests} tests passed, but we couldn't save it to your progress. Your solution is still correct; try submitting again.`;

        setExecutionFeedback({
          status: allPassed && !response.data.progressSaved ? 'warning' : allPassed ? 'success' : 'error',
          message: allPassed
            ? passMessage
            : `${response.data.passedTests} of ${response.data.totalTests} tests passed. Review the failing cases below.`
        });

        // Only a recorded solve ends the timed session; after a failing run
        // the clock keeps going while the user works on a fix. Not awaited,
        // so bookkeeping never holds up the result.
        if (response.data.progressSaved) {
          handleSessionComplete(true);
        }
      } else {
        setExecutionFeedback({
          status: 'error',
          message: 'Unexpected response from the server. Please try again.'
        });
      }
    } catch (error) {
      if (stale()) return;
      setExecutionFeedback({
        status: 'error',
        message: readApiError(error, 'Your solution could not be submitted.')
      });
      console.error('Error submitting solution:', error);
    } finally {
      if (!stale()) setIsSubmitting(false);
    }
  };

  const downloadCode = () => {
    const extension = language === 'python' ? 'py' : 'js';
    const blob = new Blob([code], { type: `text/${language}` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${leetcodeUrl}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchLeetCodeQuestion = async (questionId = null) => {
    const questionToFetch = questionId || leetcodeUrl;

    if (!questionToFetch || !questionToFetch.trim()) {
      setError('Please enter a question URL or ID');
      return;
    }

    const seq = ++loadSeqRef.current;
    const isStale = () => seq !== loadSeqRef.current;

    setIsLoading(true);
    setMissing(false);
    setCurrentQuestion(null);
    setError('');
    setQuestionDescription('');
    setTestResults(null);
    setExampleTestResults(null);
    setDebugOutput('');

    try {
      const questionData = await loadQuestion(questionToFetch);
      if (isStale()) return;

      if (!questionData) {
        setError('Question not found');
        return;
      }

      // Topics are read, not solved. Old links and recommendation cards can
      // still point here, so hand them to the System Design reader; `replace`
      // keeps Back from bouncing through this redirect again.
      if (questionData.type === 'topic' || questionData.answerFormat === 'design_doc') {
        navigate(contentUrl(questionData), { replace: true });
        return;
      }
      if (questionData.type === 'quiz') questionData.answerFormat = 'mcq';
      if (questionData.type === 'problem') questionData.answerFormat = 'code';
      if (!questionData.slug || !['code', 'mcq'].includes(questionData.answerFormat)) {
        throw new Error('This question has an unsupported content format.');
      }

      setCurrentQuestion(questionData);
      setLanguage(questionData.types?.language ?? 'python');

      // Check if description exists
      if (!questionData.description) {
        setError('Question description not available');
        return;
      }

      // Format the content for display
      const formattedContent = questionData.description
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t');

      setQuestionDescription(formattedContent);

      // The editor buffer is intentionally NOT set here. Under React 18 StrictMode
      // this loader runs twice, and a second late-resolving fetch used to overwrite
      // a restored draft with fresh boilerplate. Buffer selection (draft vs template)
      // now has exactly one owner: the effect below that keys off the loaded question.

      // The question stays in the URL on purpose. It used to be stripped
      // here for cosmetics, but the load effect keys off `location.search`,
      // so removing the param re-ran it with no question and the two-sum
      // fallback silently replaced whatever the user had just opened.
      // Keeping it also makes the page shareable and survives a refresh.
    } catch (err) {
      if (isStale()) return;
      if (err.status === 404 || err.response?.status === 404) setMissing(true);
      setError(`Could not load that question. ${readApiError(err)}`);
      console.error('Error fetching question:', err);
      console.error('Error details:', err.response ? err.response.data : 'No response data');
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  };

  const runExampleTests = async () => {
    const seq = loadSeqRef.current;
    const stale = () => seq !== loadSeqRef.current || executionIdentity !== activeExecutionIdentityRef.current;
    if (language !== gradedLanguage) {
      setExecutionFeedback({
        status: 'error',
        message: `Example tests run in ${gradedLanguageLabel}. Switch the language to ${gradedLanguageLabel} to run them.`
      });
      return;
    }

    try {
      setIsRunningExampleTests(true);
      setDebugOutput('');
      setExampleTestResults(null);
      setExecutionFeedback({ status: 'pending', message: 'Running the example tests…' });

      const questionId = currentQuestion.slug;

      const response = await apiClient.post('/code/execute/example', {
        code,
        questionId,
        contentRevision: currentQuestion.revision,
      });
      if (stale()) return;

      // Format the results for display
      if (response.data && response.data.summary && Array.isArray(response.data.results)) {
        const formattedResults = {
          summary: {
            passed: response.data.summary.passed,
            failed: response.data.summary.failed,
            total: response.data.summary.total
          },
          results: response.data.results.map(r => ({
            testCase: r.input,
            output: r.actualOutput,
            expectedOutput: r.expectedOutput,
            passed: r.passed,
            status: r.status,
            runtimeMs: r.runtimeMs,
            hidden: r.hidden,
            error: r.error,
            debugOutput: r.debugOutput
          }))
        };

        setExampleTestResults(formattedResults);
        setDebugOutput(`Example test results: ${response.data.summary.passed}/${response.data.summary.total} tests passed`);

        const { passed, total } = response.data.summary;
        setExecutionFeedback({
          status: passed === total ? 'success' : 'error',
          message: `Example tests: ${passed} of ${total} passed.`
        });
      } else {
        setExecutionFeedback({
          status: 'error',
          message: 'Unexpected response from the server. Please try again.'
        });
      }
    } catch (error) {
      if (stale()) return;
      setExecutionFeedback({
        status: 'error',
        message: readApiError(error, 'The example tests could not be run.')
      });
      console.error('Error executing example tests:', error);
    } finally {
      if (!stale()) setIsRunningExampleTests(false);
    }
  };

  // Initialize with default template
  useEffect(() => {
    setCode(getDefaultTemplate(language, null));
  }, []);

  // Apply the right buffer whenever the question or language changes: a saved draft
  // wins over boilerplate, so returning to a problem resumes where you left off.
  useEffect(() => {
    if (!currentQuestion) return;
    if (currentQuestion.answerFormat !== 'code') return;
    const templateKey = `${currentQuestion.slug}:${language}`;
    if (lastTemplateKeyRef.current === templateKey) return;
    lastTemplateKeyRef.current = templateKey;

    const template = getDefaultTemplate(language, currentQuestion);
    let saved = readDraft(currentQuestion.slug, language);
    if (saved === null && requestedQuestion && requestedQuestion !== currentQuestion.slug) {
      saved = readDraft(requestedQuestion, language);
    }
    if (saved !== null && saved !== template) {
      setCode(saved);
      setDraftRestored(true);
    } else {
      setCode(template);
      setDraftRestored(false);
    }
  }, [language, currentQuestion, requestedQuestion]);

  // Keep the Monaco key bindings pointed at the current closures, and refuse to fire
  // while a run is already in flight or for a guest who cannot execute anything.
  useEffect(() => {
    const canExecute = !isGuest && !isSubmitting && !isRunningExampleTests;
    shortcutHandlersRef.current = {
      run: () => { if (canExecute) runExampleTests(); },
      submit: () => { if (canExecute) runCode(); }
    };
  });

  useEffect(() => {
    const flush = () => {
      clearTimeout(draftTimerRef.current);
      const draft = pendingDraftRef.current;
      if (draft) writeDraft(draft.question, draft.language, draft.value);
      pendingDraftRef.current = null;
    };
    const warn = () => setStorageWarning(true);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('prep:storage-unavailable', warn);
    return () => {
      flush();
      clearTimeout(copyTimerRef.current);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('prep:storage-unavailable', warn);
    };
  }, []);

  /*
   * Split-pane sizing. Percentages rather than pixels so a window resize keeps
   * the proportions the user chose instead of stranding a pane at 1200px wide.
   */
  const splitRef = useRef(null);
  const rightColRef = useRef(null);
  const [leftPct, setLeftPct] = useState(42);
  const [editorPct, setEditorPct] = useState(62);
  const [dragAxis, setDragAxis] = useState(null);

  useEffect(() => {
    if (!dragAxis) return undefined;

    const onMove = (event) => {
      if (dragAxis === 'x' && splitRef.current) {
        const rect = splitRef.current.getBoundingClientRect();
        const pct = ((event.clientX - rect.left) / rect.width) * 100;
        setLeftPct(Math.min(70, Math.max(22, pct)));
      } else if (dragAxis === 'y' && rightColRef.current) {
        const rect = rightColRef.current.getBoundingClientRect();
        const pct = ((event.clientY - rect.top) / rect.height) * 100;
        setEditorPct(Math.min(85, Math.max(20, pct)));
      }
    };
    const onUp = () => setDragAxis(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // Without this a drag selects the description text it passes over.
    const previousSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = previousSelect;
    };
  }, [dragAxis]);

  const consoleTone = executionFeedback.status === 'success'
    ? 'success'
    : executionFeedback.status === 'error' ? 'error' : 'neutral';

  if (isLoading || ['unknown', 'restoring'].includes(userFromRedux.status)) {
    return <Container><p role="status">Loading your workspace…</p></Container>;
  }
  if (missing || !currentQuestion) {
    return <Container><h1>{missing ? 'Question not found' : 'Could not load question'}</h1>
      <p role="alert">{error || 'Choose a question from the library to begin.'}</p>
      {!missing && <button onClick={() => fetchLeetCodeQuestion()}>Retry</button>}
      <a href="/all">Browse questions</a>
    </Container>;
  }
  if (currentQuestion.answerFormat === 'mcq') {
    return <McqSolver key={currentQuestion.slug} question={currentQuestion} isGuest={isGuest} />;
  }

  return (
    <Container>
      {storageWarning && <p role="alert">Draft storage is unavailable. Keep this page open or download your code before leaving.</p>}
      <TopBar>
        <ProblemTitle title={currentQuestion?.title || 'Code Sandbox'}>
          {currentQuestion?.title || 'Code Sandbox'}
        </ProblemTitle>
        {currentQuestion?.difficulty && (
          <DifficultyPill $level={currentQuestion.difficulty}>
            {currentQuestion.difficulty}
          </DifficultyPill>
        )}

        <TopBarSpacer />

        {currentQuestion && user.userId && user.userId !== 'guest' && (
          <TimerControls>
            <TimerTime>
              <TimerIcon size={16} />
              {formatTime(displayTime)}{isPaused && ' (paused)'}
            </TimerTime>
            <TimerButton onClick={pause} disabled={!isTracking || isPaused} title="Pause timer" aria-label="Pause timer">
              <Pause size={12} />
            </TimerButton>
            <TimerButton onClick={resume} disabled={!isTracking || !isPaused} title="Resume timer" aria-label="Resume timer">
              <PlayLucide size={12} />
            </TimerButton>
            {!isTracking && <TimerButton onClick={() => startTracking(currentQuestion.slug, user.userId)} aria-label="Restart timer">Restart</TimerButton>}
            <TimerButton
              variant="danger"
              onClick={() => handleSessionComplete(false)}
              disabled={!isTracking}
              title="End session"
              aria-label="End session"
            >
              <Square size={12} />
            </TimerButton>
          </TimerControls>
        )}

        <TopBarActions>
          <LanguageSelector aria-label="Programming language" value={language} onChange={handleLanguageChange}>
            {/* Only the language this question is graded in is offered. */}
            <option value={gradedLanguage}>{gradedLanguageLabel}</option>
          </LanguageSelector>
          <SandboxActionButton
            gated={isGuest}
            gatedLabel="Sign in to Run"
            onGatedClick={() => requestSignIn(() => shortcutHandlersRef.current.run?.())}
            pending={isRunningExampleTests}
            pendingLabel="Running..."
            busy={isSubmitting || isRunningExampleTests}
            onClick={runExampleTests}
            icon={<PlayLucide size={15} style={{ marginRight: '6px' }} />}
          >
            Run
          </SandboxActionButton>
          <SandboxActionButton
            variant="primary"
            gated={isGuest}
            gatedLabel="Sign in to Submit"
            onGatedClick={() => requestSignIn(() => shortcutHandlersRef.current.submit?.())}
            pending={isSubmitting}
            pendingLabel="Submitting..."
            busy={isSubmitting || isRunningExampleTests}
            onClick={runCode}
            icon={<Zap size={15} style={{ marginRight: '6px' }} />}
          >
            Submit
          </SandboxActionButton>
        </TopBarActions>
      </TopBar>

      {isGuest && (
        <GuestBanner>
          <span>Draft code locally. Sign in to run and submit; your work stays here.</span>
          <GuestSignInButton onClick={requestSignIn}>Sign In</GuestSignInButton>
        </GuestBanner>
      )}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <MainContent ref={splitRef}>
        <LeftPane $pct={leftPct}>
          <PaneTabBar>
            <PaneTab as="div" $active>
              <EyeLucide size={15} />
              Description
            </PaneTab>
          </PaneTabBar>

          <QuestionDescription>
            {isDevMode() && (
              <DevLoader>
                <QuestionInputSection>
                  <QuestionInput
                    type="text"
                    value={leetcodeUrl}
                    onChange={(e) => setLeetcodeUrl(e.target.value)}
                    placeholder="Load a question by slug or URL (dev only)"
                  />
                  <ModernButton variant="primary" onClick={() => fetchLeetCodeQuestion(leetcodeUrl)}>
                    <Link size={16} />
                    Load
                  </ModernButton>
                </QuestionInputSection>
                <QuickTestGrid>
                  {[
                    { id: 'two-sum', name: 'Two Sum', difficulty: 'Easy' },
                    { id: 'add-two-numbers', name: 'Add Two Numbers', difficulty: 'Medium' },
                    { id: 'longest-substring-without-repeating-characters', name: 'Longest Substring', difficulty: 'Medium' },
                    { id: 'median-of-two-sorted-arrays', name: 'Median Arrays', difficulty: 'Hard' },
                    { id: 'reverse-integer', name: 'Reverse Integer', difficulty: 'Medium' }
                  ].map(q => (
                    <QuickTestButton
                      key={q.id}
                      isActive={leetcodeUrl === q.id}
                      onClick={() => {
                        setLeetcodeUrl(q.id);
                        fetchLeetCodeQuestion(q.id);
                      }}
                    >
                      {q.name} <span style={{ opacity: 0.7 }}>({q.difficulty})</span>
                    </QuickTestButton>
                  ))}
                </QuickTestGrid>
              </DevLoader>
            )}

            {isLoading && (
              <LoadingState>
                <LoadingSpinner />
                <p>Loading question details...</p>
              </LoadingState>
            )}

            {questionDescription && (
              <div dangerouslySetInnerHTML={{ __html: questionDescription }} />
            )}
          </QuestionDescription>
        </LeftPane>

        <VerticalHandle
          tabIndex={0}
          aria-valuemin={22}
          aria-valuemax={70}
          aria-valuenow={Math.round(leftPct)}
          onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            e.preventDefault();
            setLeftPct((pct) => Math.min(70, Math.max(22, pct + (e.key === 'ArrowRight' ? 2 : -2))));
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize description panel"
          data-dragging={dragAxis === 'x'}
          onPointerDown={(e) => { e.preventDefault(); setDragAxis('x'); }}
        />

        <RightColumn ref={rightColRef}>
          <EditorPane $pct={editorPct}>
            <EditorCard>
              <EditorHeader>
                <CardTitle>
                  <Code2 size={16} />
                  Code
                </CardTitle>
                <EditorActions>
                  <EditorToolGroup>
                    <IconButton type="button" onClick={downloadCode} title="Download code" aria-label="Download code">
                      <FileDown size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() => changeFontSize(-1)}
                      disabled={fontSize <= MIN_FONT_SIZE}
                      title="Decrease font size"
                      aria-label="Decrease font size"
                    >
                      <Minus size={14} />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() => changeFontSize(1)}
                      disabled={fontSize >= MAX_FONT_SIZE}
                      title="Increase font size"
                      aria-label="Increase font size"
                    >
                      <Plus size={14} />
                    </IconButton>
                    <IconButton type="button" onClick={copyCode} title="Copy code" aria-label="Copy code">
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={resetToTemplate}
                      title="Reset to the starting template"
                      aria-label="Reset to the starting template"
                    >
                      <RotateCcw size={14} />
                    </IconButton>
                  </EditorToolGroup>
                </EditorActions>
              </EditorHeader>
              <EditorContainer>
                <Suspense fallback={<EditorLoading>Loading editor…</EditorLoading>}>
                <Editor
                  height="100%"
                  defaultLanguage={getEditorLanguage()}
                  language={getEditorLanguage()}
                  theme={editorTheme}
                  value={code}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  loading={<EditorLoading>Loading editor…</EditorLoading>}
                  options={{
                    minimap: { enabled: false },
                    fontSize,
                    fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    lineHeight: 1.6,
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    padding: { top: 14, bottom: 14 },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indentation: true },
                    renderLineHighlight: 'all',
                    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
                    suggestSelection: 'first',
                    wordWrap: 'off'
                  }}
                />
                </Suspense>
              </EditorContainer>
              <EditorStatusBar>
                <StatusGroup>
                  <StatusItem>{language === 'python' ? 'Python' : 'JavaScript'}</StatusItem>
                  <StatusItem>Ln {cursor.line}, Col {cursor.column}</StatusItem>
                  <StatusItem>{fontSize}px</StatusItem>
                  {draftRestored && (
                    <StatusItem title="Restored from your last unsaved edit">
                      <DraftDot aria-hidden="true" />
                      Draft restored
                    </StatusItem>
                  )}
                  {isGuest && (
                    <StatusItem>
                      <Lock size={12} />
                      Local draft — sign in to run
                    </StatusItem>
                  )}
                </StatusGroup>
                {!isGuest && isEditorReady && (
                  <StatusGroup>
                    <StatusItem>
                      <ShortcutKey>{isMacPlatform() ? '⌘' : 'Ctrl'}</ShortcutKey>
                      <ShortcutKey>↵</ShortcutKey>
                      Run
                    </StatusItem>
                    <StatusItem>
                      <ShortcutKey>{isMacPlatform() ? '⇧⌘' : 'Ctrl+Shift'}</ShortcutKey>
                      <ShortcutKey>↵</ShortcutKey>
                      Submit
                    </StatusItem>
                  </StatusGroup>
                )}
              </EditorStatusBar>
            </EditorCard>
          </EditorPane>

          <HorizontalHandle
            tabIndex={0}
            aria-valuemin={20}
            aria-valuemax={85}
            aria-valuenow={Math.round(editorPct)}
            onKeyDown={(e) => {
              if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return;
              e.preventDefault();
              setEditorPct((pct) => Math.min(85, Math.max(20, pct + (e.key === 'ArrowDown' ? 2 : -2))));
            }}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize console panel"
            data-dragging={dragAxis === 'y'}
            onPointerDown={(e) => { e.preventDefault(); setDragAxis('y'); }}
          />

          <ConsolePane>
            <PaneTabBar>
              <PaneTab as="div" $active>
                <Monitor size={15} />
                Console
                {executionFeedback.status !== 'idle' && executionFeedback.status !== 'pending' && (
                  <TabBadge $tone={consoleTone}>
                    {consoleTone === 'success' ? 'Passed' : consoleTone === 'error' ? 'Failed' : '•'}
                  </TabBadge>
                )}
              </PaneTab>
            </PaneTabBar>

            <OutputCard>
              <OutputContent>
                {/* Every code-execution action reports here, so a result is never silent.
                    Question-loading failures stay in the page-level ErrorAlert above. */}
                <VisuallyHidden aria-live="polite" role="status">
                  {executionFeedback.message}
                </VisuallyHidden>

                {executionFeedback.status !== 'idle' && executionFeedback.message && (
                  <FeedbackBanner $tone={executionFeedback.status}>
                    {executionFeedback.status === 'pending' && <FeedbackSpinner aria-hidden="true" />}
                    <span>{executionFeedback.message}</span>
                  </FeedbackBanner>
                )}

                {executionFeedback.status === 'idle' && !output && !exampleTestResults && !testResults && (
                  <ConsoleHint>Run your code to see example test results here, or submit to grade against the full test suite.</ConsoleHint>
                )}

                {debugOutput && <div style={{ color: '#28a745', fontWeight: 'bold' }}>{debugOutput}</div>}
                {output && <div>{output}</div>}

                {exampleTestResults && (
                  <TestResults results={exampleTestResults} type="example" parameterNames={resultParameterNames} />
                )}

                {testResults && (
                  <TestResults results={testResults} type="final" parameterNames={resultParameterNames} />
                )}
              </OutputContent>
            </OutputCard>
          </ConsolePane>
        </RightColumn>
      </MainContent>
    </Container>
  );
};

export default CodeSandbox; 