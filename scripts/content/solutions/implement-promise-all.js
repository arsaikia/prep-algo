// @solution counter accept
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) {
      resolve(results);
      return;
    }
    items.forEach((item, index) => {
      Promise.resolve(item).then((value) => {
        results[index] = value;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}

// @solution async-iteration accept
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const results = [];
    let index = 0;
    let settled = 0;
    for (const item of iterable) {
      const at = index++;
      results[at] = undefined;
      (async () => {
        try {
          results[at] = await item;
          if (++settled === index) resolve(results);
        } catch (error) {
          reject(error);
        }
      })();
    }
    if (index === 0) resolve(results);
  });
}

// @solution sequential-await reject
async function promiseAll(iterable) {
  const results = [];
  for (const item of iterable) results.push(await item);
  return results;
}

// @solution sparse-length reject
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable];
    const results = [];
    if (items.length === 0) resolve(results);
    items.forEach((item, index) => {
      Promise.resolve(item).then((value) => {
        results[index] = value;
        if (results.length === items.length) resolve(results);
      }, reject);
    });
  });
}

// @solution completion-order reject
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable];
    const results = [];
    if (items.length === 0) resolve(results);
    for (const item of items) {
      Promise.resolve(item).then((value) => {
        results.push(value);
        if (results.length === items.length) resolve(results);
      }, reject);
    }
  });
}

// @solution empty-never-settles reject
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = [...iterable];
    const results = new Array(items.length);
    let remaining = items.length;
    items.forEach((item, index) => {
      Promise.resolve(item).then((value) => {
        results[index] = value;
        if (--remaining === 0) resolve(results);
      }, reject);
    });
  });
}

// @solution uses-builtin reject
function promiseAll(iterable) {
  return Promise.all(iterable);
}
