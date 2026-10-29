// @solution timer-window accept
function throttle(func, wait) {
  let blocked = false;
  return function (...args) {
    if (blocked) return;
    blocked = true;
    func.apply(this, args);
    setTimeout(() => { blocked = false; }, wait);
  };
}

// @solution timestamp accept
function throttle(func, wait) {
  let last = -Infinity;
  return function (...args) {
    const now = Date.now();
    if (now - last < wait) return;
    last = now;
    func.apply(this, args);
  };
}

// @solution debounced reject
function throttle(func, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), wait);
  };
}

// @solution trailing-call reject
function throttle(func, wait) {
  let blocked = false;
  let pending = null;
  const release = () => {
    if (pending) {
      const [ctx, args] = pending;
      pending = null;
      func.apply(ctx, args);
      setTimeout(release, wait);
    } else {
      blocked = false;
    }
  };
  return function (...args) {
    if (blocked) { pending = [this, args]; return; }
    blocked = true;
    func.apply(this, args);
    setTimeout(release, wait);
  };
}

// @solution window-from-last-attempt reject
function throttle(func, wait) {
  let last = -Infinity;
  return function (...args) {
    const now = Date.now();
    const ready = now - last >= wait;
    last = now;
    if (ready) func.apply(this, args);
  };
}

// @solution loses-this reject
function throttle(func, wait) {
  let last = -Infinity;
  return (...args) => {
    if (Date.now() - last < wait) return;
    last = Date.now();
    func(...args);
  };
}
