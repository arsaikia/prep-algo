// @solution clear-timeout accept
function debounce(func, wait) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), wait);
  };
}

// @solution timestamp-recheck accept
function debounce(func, wait) {
  let lastCall = 0;
  let timer = null;
  let lastArgs;
  let lastThis;
  const fire = () => {
    const remaining = lastCall + wait - Date.now();
    if (remaining > 0) {
      timer = setTimeout(fire, remaining);
      return;
    }
    timer = null;
    func.apply(lastThis, lastArgs);
  };
  return function (...args) {
    lastCall = Date.now();
    lastArgs = args;
    lastThis = this;
    if (timer === null) timer = setTimeout(fire, wait);
  };
}

// @solution leading-edge reject
function debounce(func, wait) {
  let timer = null;
  return function (...args) {
    if (timer === null) func.apply(this, args);
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; }, wait);
  };
}

// @solution no-restart reject
function debounce(func, wait) {
  let timer = null;
  let latest;
  return function (...args) {
    latest = args;
    if (timer !== null) return;
    timer = setTimeout(() => { timer = null; func(...latest); }, wait);
  };
}

// @solution first-arguments reject
function debounce(func, wait) {
  let timer = null;
  let first = null;
  return function (...args) {
    first ??= args;
    clearTimeout(timer);
    timer = setTimeout(() => { const use = first; first = null; func.apply(this, use); }, wait);
  };
}

// @solution loses-this reject
function debounce(func, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), wait);
  };
}
