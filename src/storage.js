// Storage adapter backed by the browser's localStorage.
// Shape matches the window.storage API used during development inside
export const storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    if (v === null) return null;
    return { key, value: v };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
};
