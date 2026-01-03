export const createPool = () => ({
  query: () => Promise.resolve([[]]),
  execute: () => Promise.resolve([[]]),
  getConnection: () => Promise.resolve({}),
  on: () => {},
});

export default { createPool };