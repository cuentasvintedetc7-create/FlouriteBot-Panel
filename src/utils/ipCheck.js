const https = require('https');

/**
 * Get IP and location info from an API
 * Note: In a Telegram bot, we don't have direct access to user's IP.
 * This module provides utilities for when IP is available (e.g., from webhooks or external sources)
 * For demonstration, we'll use the server's IP as a placeholder.
 */

// Simple HTTPS request wrapper
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
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
    const url = ip 
      ? `https://ipapi.co/${ip}/json/` 
      : 'https://ipapi.co/json/';
    
    const data = await httpsGet(url);
    
    return {
      ip: data.ip || 'unknown',
      country: data.country_name || 'unknown',
      countryCode: data.country_code || 'unknown',
      city: data.city || 'unknown',
      region: data.region || 'unknown'
    };
  } catch (error) {
    console.error('Error fetching IP location:', error.message);
    return {
      ip: ip || 'unknown',
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
