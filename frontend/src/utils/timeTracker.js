import React from 'react';
import { TimeTracker } from './timerState.js';

export const timeTracker = new TimeTracker({
  onStorageError: () => queueMicrotask(() => window.dispatchEvent(new Event('prep:storage-unavailable'))),
});

export function useTimeTracker() {
  const [snapshot, setSnapshot] = React.useState({ currentTime: 0, isTracking: false, isPaused: false });
  const sync = () => setSnapshot({
    currentTime: timeTracker.getCurrentTime(),
    isTracking: timeTracker.isTracking,
    isPaused: timeTracker.isPaused,
  });
  React.useEffect(() => {
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, []);
  const act = (method) => (...args) => {
    const result = timeTracker[method](...args);
    sync();
    return result;
  };
  return {
    ...snapshot,
    startTracking: act('startTracking'),
    stopTracking: act('stopTracking'),
    pause: act('pause'),
    resume: act('resume'),
    addTags: act('addTags'),
    setDifficultyRating: act('setDifficultyRating'),
  };
}
