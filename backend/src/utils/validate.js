/**
 * Simple input validation helpers.
 */

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function isValidLat(lat) {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
}

function isValidLng(lng) {
  return typeof lng === 'number' && lng >= -180 && lng <= 180;
}

function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

function sanitizeString(val) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, 500);
}

/**
 * Escape a value for CSV output to prevent formula injection.
 */
function escapeCsvValue(val) {
  if (val == null) return '';
  let str = String(val);
  // Prevent formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidLat,
  isValidLng,
  isNonEmptyString,
  sanitizeString,
  escapeCsvValue,
};
