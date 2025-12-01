# FlouriteBot-Panel

A complete Telegram bot for key management built with Node.js and Telegraf.

## 📁 Project Structure

```
project/
├── package.json          # Dependencies and scripts
├── server.js             # Entry point
├── config.json           # Bot configuration
├── README.md             # Documentation
├── src/
│   ├── bot.js            # Main bot initialization
│   ├── handlers/
│   │   ├── login.js      # Login/logout handlers
│   │   ├── buy.js        # Purchase handlers
│   │   ├── account.js    # Account management handlers
│   │   ├── reset.js      # Key reset handlers
│   │   └── admin.js      # Admin command handlers
│   ├── keyboards/
│   │   ├── mainMenu.js   # Main menu keyboard
│   │   ├── buyMenu.js    # Buy menu keyboard
│   │   ├── productMenu.js# Product selection keyboard
│   │   ├── keyTypeMenu.js# Key type selection keyboard
│   │   └── accountMenu.js# Account menu keyboard
│   └── utils/
│       ├── generateKey.js# Key generation utilities
│       ├── db.js         # Database operations (JSON)
│       ├── auth.js       # Authentication utilities
│       └── format.js     # Formatting utilities
└── data/
    ├── users.json        # User data
    ├── stock.json        # Key stock
    ├── purchases.json    # Purchase history
    ├── topups.json       # Top-up history
    └── reset_log.json    # Reset log
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

## 🤖 Bot Commands

### User Commands:
- `/start` - Start the bot
- `/login` - Login to your account
- `/logout` - Logout from your account
- `/buy` - Browse and purchase keys
- `/account` - View account information
- `/reset KEY` - Reset a key
- `/redeem CODE` - Redeem a promocode

### Admin Commands (Admin ID: 7458257277):
- `/admin` - View admin panel
- `/createuser LOGIN PASSWORD` - Create a new user
- `/deleteuser LOGIN` - Delete a user
- `/addbalance LOGIN AMOUNT` - Add balance to user
- `/stock` - View stock summary
- `/createstock PRODUCT KEYTYPE DURATION AMOUNT` - Generate and add keys to stock
- `/broadcast MESSAGE` - Send message to all users
- `/users` - List all users

## 💰 Pricing

| Duration | Price |
|----------|-------|
| 1 Day    | $2.30 |
| 7 Days   | $10.00|
| 30 Days  | $18.00|

## 📦 Products

- Free Fire (iOS)
- Gbox
- COD (iOS)

## 🔑 Key Formats

1. **Flourite** - Alphanumeric uppercase (e.g., `FIUNVTFQRR99845F`)
2. **BRMODS** - Format `👤2v686wkl🔑e8ic`
3. **DRIP MOBILE** - Numbers (e.g., `4168090123`)

## 🔐 Authentication Flow

1. User sends `/login`
2. Bot asks for LOGIN
3. User sends their login
4. Bot asks for PASSWORD
5. User sends their password
6. Bot validates and links Telegram account

## 📝 Default Users

The bot comes with two default users:

| Login | Password | Balance | Admin |
|-------|----------|---------|-------|
| admin | admin123 | $1000   | Yes   |
| demo  | demo123  | $50     | No    |

## ⚙️ Configuration

Edit `config.json` to customize:

```json
{
  "botToken": "YOUR_BOT_TOKEN",
  "adminId": YOUR_TELEGRAM_ID,
  "prices": {
    "1day": 2.30,
    "7days": 10,
    "30days": 18
  },
  "products": [
    "Free Fire (iOS)",
    "Gbox",
    "COD (iOS)"
  ],
  "keyFormats": [
    "Flourite",
    "BRMODS",
    "DRIP MOBILE"
  ]
}
```

## 🛡️ Security Notes

⚠️ **Important**: The bot token in this repository is for demonstration purposes. Before deploying to production:

1. Create a new bot with [@BotFather](https://t.me/BotFather)
2. Replace the token in `config.json`
3. Update the `adminId` to your Telegram user ID

## 📜 License

ISC