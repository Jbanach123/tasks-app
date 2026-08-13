// Storage adapter backed by the browser's localStorage.
// Shape matches the window.storage API used during development inside
// Claude's preview sandbox, so the rest of the app never needed to change
// when moving from that sandbox to this real deployment.
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
