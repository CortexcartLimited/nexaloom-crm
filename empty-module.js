// empty-module.js
export const createPool = () => ({
    query: () => Promise.resolve([]),
    execute: () => Promise.resolve([]),
    on: () => {},
  });
  export default { createPool };