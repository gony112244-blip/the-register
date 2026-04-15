module.exports = {
  apps: [{
    name: 'hapinkas',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
    // graceful restart
    kill_timeout: 5000,
    listen_timeout: 10000,
    // auto restart on crash
    autorestart: true,
    watch: false,
    // log management
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
