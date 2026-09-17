const crypto = require('crypto');

/**
 * Generates a unique, clean uppercase Web3 Account ID
 * Example format: USR-8F42A1
 */
function generateAccountId() {
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `USR-${randomHex}`;
}

module.exports = { generateAccountId };
