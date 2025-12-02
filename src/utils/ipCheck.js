const https = require('https');

/**
 * Get IP and location info from an API
 * Note: In a Telegram bot, we don't have direct access to user's IP.
 * This module provides utilities for when IP is available (e.g., from webhooks or external sources)
 * For demonstration, we'll use the server's IP as a placeholder.
 */

// Sanitize text to prevent Markdown injection
function sanitizeForMarkdown(text) {
  if (!text || typeof text !== 'string') return 'unknown';
  // Escape Markdown special characters
  return text
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
}

// Validate IP address format (basic validation)
function isValidIPv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && part === String(num);
  });
}

function isValidIPv6(ip) {
  if (!ip || typeof ip !== 'string') return false;
  // Basic IPv6 validation
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){0,6}::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

function isValidIP(ip) {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

// Simple HTTPS request wrapper with security measures
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    // Validate URL is for ipapi.co only (prevent SSRF)
    const allowedHost = 'ipapi.co';
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (e) {
      return reject(new Error('Invalid URL format'));
    }
    
    if (urlObj.hostname !== allowedHost) {
      return reject(new Error('Unauthorized API host'));
    }
    
    if (urlObj.protocol !== 'https:') {
      return reject(new Error('HTTPS required'));
    }
    
    const request = https.get(url, { timeout: 5000 }, (res) => {
      // Limit response size to prevent memory exhaustion
      let data = '';
      const maxSize = 10 * 1024; // 10KB max
      
      res.on('data', (chunk) => {
        data += chunk;
        if (data.length > maxSize) {
          request.destroy();
          reject(new Error('Response too large'));
        }
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Validate expected response structure
          if (typeof parsed !== 'object' || parsed === null) {
            reject(new Error('Invalid response format'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Get location info from IP using ipapi.co
 * @param {string} ip - IP address (optional, uses client IP if not provided)
 * @returns {Promise<{ip: string, country: string, city: string, region: string}>}
 */
async function getLocationFromIP(ip = null) {
  try {
    // Validate IP if provided to prevent injection
    if (ip !== null && !isValidIP(ip)) {
      console.error('Invalid IP format provided:', ip);
      return {
        ip: 'unknown',
        country: 'unknown',
        countryCode: 'unknown',
        city: 'unknown',
        region: 'unknown'
      };
    }
    
    const url = ip 
      ? `https://ipapi.co/${encodeURIComponent(ip)}/json/` 
      : 'https://ipapi.co/json/';
    
    const data = await httpsGet(url);
    
    // Sanitize response data
    return {
      ip: sanitizeForMarkdown(String(data.ip || 'unknown')),
      country: sanitizeForMarkdown(String(data.country_name || 'unknown')),
      countryCode: sanitizeForMarkdown(String(data.country_code || 'unknown')),
      city: sanitizeForMarkdown(String(data.city || 'unknown')),
      region: sanitizeForMarkdown(String(data.region || 'unknown'))
    };
  } catch (error) {
    console.error('Error fetching IP location:', error.message);
    return {
      ip: 'unknown',
      country: 'unknown',
      countryCode: 'unknown',
      city: 'unknown',
      region: 'unknown'
    };
  }
}

/**
 * Check if location has changed for a user
 * @param {object} user - User object with lastIp, lastCountry
 * @param {object} newLocation - New location data
 * @returns {{changed: boolean, ipChanged: boolean, countryChanged: boolean}}
 */
function hasLocationChanged(user, newLocation) {
  const ipChanged = user.lastIp && user.lastIp !== newLocation.ip;
  const countryChanged = user.lastCountry && user.lastCountry !== newLocation.country;
  
  return {
    changed: ipChanged || countryChanged,
    ipChanged,
    countryChanged
  };
}

/**
 * Generate security alert message for user
 * @param {object} locationChange - Result from hasLocationChanged
 * @param {object} newLocation - New location data
 * @returns {string}
 */
function getUserSecurityMessage(locationChange, newLocation) {
  if (!locationChange.changed) return null;
  
  let message = '⚠️ *Security Warning*\n\n';
  message += 'New login detected from a different location/IP.\n\n';
  message += `🌍 Location: ${newLocation.city}, ${newLocation.country}\n`;
  message += `📍 IP: ${newLocation.ip}\n\n`;
  message += '_If this wasn\'t you, please change your password immediately._';
  
  return message;
}

/**
 * Generate security alert message for admin
 * @param {string} username - Username of the user
 * @param {object} oldData - Old user data (lastIp, lastCountry)
 * @param {object} newLocation - New location data
 * @returns {string}
 */
function getAdminSecurityMessage(username, oldData, newLocation) {
  let message = '⚠️ *Security Alert*\n\n';
  message += `User \`${username}\` logged in from a new location/IP.\n\n`;
  message += `*Previous:*\n`;
  message += `   IP: ${oldData.lastIp || 'N/A'}\n`;
  message += `   Country: ${oldData.lastCountry || 'N/A'}\n\n`;
  message += `*Current:*\n`;
  message += `   IP: ${newLocation.ip}\n`;
  message += `   Country: ${newLocation.country}\n`;
  message += `   City: ${newLocation.city}\n`;
  
  return message;
}

/**
 * Process login security check
 * This function should be called after successful credential validation
 * @param {object} ctx - Telegraf context
 * @param {object} user - User object
 * @param {object} db - Database module
 * @param {object} auth - Auth module
 * @returns {Promise<{locationChanged: boolean, newLocation: object}>}
 */
async function processLoginSecurityCheck(ctx, user, db, auth) {
  try {
    // Get current location
    const newLocation = await getLocationFromIP();
    
    // Check if location changed
    const locationChange = hasLocationChanged(user, newLocation);
    
    // Update user with new location data
    db.updateUser(user.username, {
      lastIp: newLocation.ip,
      lastCountry: newLocation.country,
      lastCity: newLocation.city,
      lastLoginAt: new Date().toISOString()
    });
    
    // If location changed, send notifications
    if (locationChange.changed) {
      // Notify user
      const userMessage = getUserSecurityMessage(locationChange, newLocation);
      if (userMessage) {
        try {
          await ctx.reply(userMessage, { parse_mode: 'Markdown' });
        } catch (e) {
          console.error('Error sending user security message:', e.message);
        }
      }
      
      // Notify admin
      const adminId = auth.getAdminId();
      if (adminId) {
        const adminMessage = getAdminSecurityMessage(
          user.username, 
          { lastIp: user.lastIp, lastCountry: user.lastCountry },
          newLocation
        );
        try {
          await ctx.telegram.sendMessage(adminId, adminMessage, { parse_mode: 'Markdown' });
        } catch (e) {
          console.error('Error sending admin security message:', e.message);
        }
      }
    }
    
    return {
      locationChanged: locationChange.changed,
      newLocation
    };
  } catch (error) {
    console.error('Error in security check:', error.message);
    return {
      locationChanged: false,
      newLocation: null
    };
  }
}

module.exports = {
  getLocationFromIP,
  hasLocationChanged,
  getUserSecurityMessage,
  getAdminSecurityMessage,
  processLoginSecurityCheck
};
