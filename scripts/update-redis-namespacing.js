/**
 * Update Redis key namespacing to support shared database
 * All keys should be prefixed with AI employee name
 */

// This is a reference implementation
// Update your Redis usage to namespace keys like:
// - jeff:sessions:session-id
// - sales:sessions:session-id
// - support:sessions:session-id

const aiEmployee = process.env.AI_EMPLOYEE_NAME || 'jeff';

function getNamespacedKey(key) {
  return `${aiEmployee}:${key}`;
}

// Example usage:
// const sessionKey = getNamespacedKey(`sessions:${sessionId}`);
// await redis.set(sessionKey, sessionData);

module.exports = { getNamespacedKey };

