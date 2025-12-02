# FlouriteBot-Panel

A complete Telegram bot for key management with Web Admin Panel, built with Node.js, Telegraf, and Express.

## ✨ Features

- **Telegram Bot** - Full-featured key management bot
- **Web Admin Panel** - Modern dark-themed admin interface
- **User Management** - Create, edit, delete users with roles
- **Stock Management** - Add, remove, clear stock with auto key generation
- **Purchase Tracking** - Complete purchase history
- **Top-up System** - Payment proof upload and approval workflow
- **Promo Codes** - Create percentage or fixed discount codes
- **Key Reset** - Reset purchased keys (except GBOX)
- **Anti-spam** - Rate limiting protection
- **Logging** - Structured logging with rotation

## 📁 Project Structure

```
project/
├── package.json          # Dependencies and scripts
├── server.js             # Entry point (Bot + Web)
├── config.json           # Bot configuration
├── README.md             # Documentation
├── src/
│   ├── bot.js            # Main bot initialization
│   ├── handlers/
│   │   ├── login.js      # Login/logout handlers
│   │   ├── buy.js        # Purchase handlers
│   │   ├── account.js    # Account management handlers
│   │   ├── reset.js      # Key reset handlers
│   │   ├── admin.js      # Admin command handlers
│   │   └── topup.js      # Top-up handlers
│   ├── keyboards/
│   │   ├── mainMenu.js   # Main menu keyboard
│   │   ├── buyMenu.js    # Buy menu keyboard
│   │   ├── productMenu.js# Product selection keyboard
│   │   └── accountMenu.js# Account menu keyboard
│   └── utils/
│       ├── generateKey.js# Key generation utilities
│       ├── db.js         # Database operations (JSON)
│       ├── auth.js       # Authentication utilities
│       ├── format.js     # Formatting utilities
│       ├── validators.js # Input validation
│       ├── antispam.js   # Rate limiting
│       └── logger.js     # Logging utility
├── web/
│   ├── app.js            # Express server
│   ├── middleware/
│   │   └── auth.js       # JWT authentication
│   ├── routes/           # API routes
│   ├── public/           # Frontend files
│   │   ├── index.html
│   │   ├── css/styles.css
│   │   └── js/
│   └── nginx.conf.example# NGINX configuration
└── data/
    ├── users.json        # User data
    ├── stock.json        # Key stock
    ├── products.json     # Products configuration
    ├── purchases.json    # Purchase history
    ├── topups.json       # Top-up history
    ├── promo_codes.json  # Promo codes
    ├── reset_log.json    # Reset log
    └── logs/             # Application logs
```

## 🚀 Installation

### On your VPS:

```bash
# Clone the repository
git clone https://github.com/cuentasvintedetc7-create/FlouriteBot-Panel.git

# Navigate to project directory
cd FlouriteBot-Panel

# Install dependencies
npm install

# Start with PM2 (recommended for production)
pm2 start server.js --name flouritebot

# Or start directly with Node
npm start
```

### Development:

```bash
# Install dependencies
npm install

# Run in development mode with auto-restart
npm run dev
```

## 🌐 Web Admin Panel

The web admin panel is available at `http://localhost:3000` (or your configured port).

**Default credentials:**
- Username: `admin`
- Password: `admin123`

### Features:
- Dashboard with statistics
- User management (CRUD)
- Stock management (view, add, remove, clear)
- Purchase history
- Top-up approval/rejection
- Key reset history
- Promo code management
- System logs viewer

### NGINX Setup (Production):

1. Copy the example config:
```bash
sudo cp web/nginx.conf.example /etc/nginx/sites-available/flouritebot
```

2. Edit the configuration with your domain

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/flouritebot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🤖 Bot Commands

### User Commands:
- `/start` - Start the bot
- `/login` - Login to your account
- `/logout` - Logout from your account
- `/buy` - Browse and purchase keys
- `/account` - View account information
- `/reset KEY` - Reset a key (Flourite/COD only)
- `/redeem CODE` - Redeem a promocode

### Admin Commands:
- `/admin` - View admin panel
- `/createuser USERNAME PASSWORD [ROLE]` - Create a new user
- `/deleteuser USERNAME` - Delete a user
- `/addbalance USERNAME AMOUNT` - Add balance to user
- `/removebalance USERNAME AMOUNT` - Remove balance from user
- `/setrole USERNAME ROLE` - Set user role
- `/stock` - View stock summary
- `/addstock CATEGORY DURATION AMOUNT` - Add keys to stock
- `/removestock CATEGORY DURATION AMOUNT` - Remove keys from stock
- `/clearstock CATEGORY DURATION` - Clear stock
- `/createpromo CODE TYPE AMOUNT [MAX_USES]` - Create promo code
- `/broadcast MESSAGE` - Send message to all users
- `/users` - List all users

## 💰 Products & Pricing

### FREE FIRE iOS (FLOURITE)
| Duration | Price |
|----------|-------|
| 1 Day    | $2.50 |
| 7 Days   | $7.00 |
| 30 Days  | $14.00|

### GBOX (Certificate)
| Duration | Price |
|----------|-------|
| 1 Year   | $6.00 |

### COD Mobile (Call Of Duty)
| Duration | Price |
|----------|-------|
| 1 Day    | $3.00 |
| 7 Days   | $10.00|
| 30 Days  | $18.00|

## 🔑 Key Formats

1. **FLOURITE** - 16 alphanumeric uppercase (e.g., `FIUNVTFQRR99845F`)
2. **GBOX Certificate** - 10 hex characters (e.g., `17E21A4A78`)
3. **Call Of Duty** - Format `COD-XXXXXXXX-XXXX`

## 🔐 Authentication Flow

1. User sends `/login`
2. Bot requests phone number verification
3. User shares phone number
4. Bot asks for USERNAME
5. User sends their username
6. Bot asks for PASSWORD
7. User sends their password
8. Bot validates and links Telegram account

## 📝 Default Users

| Username | Password | Balance | Role  |
|----------|----------|---------|-------|
| admin    | admin123 | $0      | admin |
| demo     | demo123  | $50     | user  |

## ⚙️ Environment Variables

```bash
# Bot Configuration
BOT_TOKEN="your_bot_token_here"
ADMIN_ID="your_telegram_id_here"

# Web Panel
WEB_PORT=3000
JWT_SECRET="your_jwt_secret_here"
WEB_ADMIN_USER="admin"
WEB_ADMIN_HASH="bcrypt_hash_of_password"

# Optional
NODE_ENV=production
LOG_LEVEL=INFO
```

## 🛡️ Security Notes

⚠️ **Important**: Before deploying to production:

1. Create a new bot with [@BotFather](https://t.me/BotFather)
2. Use environment variables for sensitive data
3. Change default admin credentials
4. Set up HTTPS with SSL certificates
5. Configure proper CORS settings
6. Use PM2 or similar for process management

## 📜 License

ISC