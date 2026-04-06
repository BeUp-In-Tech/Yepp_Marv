/* eslint-disable no-undef */
module.exports = {
  apps: [
    {
      name: 'server',
      script: './dist/server.js',
      instances: "max",
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'Worker',
      script: './dist/app/queue/worker.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};