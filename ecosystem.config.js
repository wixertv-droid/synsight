/**
 * Compatibility wrapper — prefer `ecosystem.config.cjs`.
 * Some server setups start `ecosystem.config.js` by habit.
 */
module.exports = require("./ecosystem.config.cjs");
