/**
 * Utility to extract and format IP addresses
 */

/**
 * Get client IP address from request
 * Handles IPv6, IPv4, proxies, and localhost
 * @param {Object} req - Express request object
 * @returns {string} - Formatted IP address
 */
exports.getClientIp = (req) => {
  // Try to get IP from various sources (for proxy/load balancer scenarios)
  let ip = 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    req.ip ||
    'Unknown';

  // Convert IPv6 localhost (::1) to IPv4 localhost (127.0.0.1)
  // Handle all IPv6 localhost variants
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('::1')) {
    return '127.0.0.1';
  }

  // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // If still showing IPv6 format but local, convert to readable format
  if (ip.includes('::') && ip !== 'Unknown') {
    return '127.0.0.1';
  }

  return ip;
};

/**
 * Format IP address for display
 * @param {string} ip - IP address
 * @returns {string} - Human-readable IP address
 */
exports.formatIpAddress = (ip) => {
  if (!ip || ip === 'Unknown') {
    return 'Unknown';
  }

  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1 (localhost)';
  }

  // Remove IPv6 prefix
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }

  return ip;
};

/**
 * Check if IP is localhost
 * @param {string} ip - IP address
 * @returns {boolean} - True if localhost
 */
exports.isLocalhost = (ip) => {
  return ip === '::1' || 
         ip === '::ffff:127.0.0.1' || 
         ip === '127.0.0.1' ||
         ip === 'localhost';
};
