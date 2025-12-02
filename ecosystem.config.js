module.exports = {
  apps: [
    {
      name: 'flouritepanel',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4100,
        // JWT_SECRET should be set via environment or .env file
        // WEB_ADMIN_USER and WEB_ADMIN_HASH should be set via environment
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4100
      },
      env_file: '.env',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // Kill timeout for graceful shutdown
      kill_timeout: 5000,
      // Wait before forcing a restart
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
