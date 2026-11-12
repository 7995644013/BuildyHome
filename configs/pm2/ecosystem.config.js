module.exports = {
  apps: [
    {
      name: "buildyhome-api",
      script: "dist/main.js",
      cwd: "./backend",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
    },
    {
      name: "email-worker",
      script: "dist/workers/email.worker.js",
      cwd: "./backend",
      instances: 1,
    },
    {
      name: "pdf-worker",
      script: "dist/workers/pdf.worker.js",
      cwd: "./backend",
      instances: 1,
    },
    {
      name: "image-worker",
      script: "dist/workers/image.worker.js",
      cwd: "./backend",
      instances: 2,
    },
  ],
};

