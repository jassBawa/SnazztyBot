module.exports = {
    apps: [
      {
        name: "bot",
        cwd: "apps/bot",
        script: "node",
        args: "dist/index.js",
      },
      {
        name: "scheduler",
        cwd: "apps/scheduler",
        script: "node",
        args: "dist/index.js",
      },
      {
        name: "offchain-relayer",
        cwd: "apps/off-chain-relayer",
        script: "node",
        args: "dist/index.js",
      }
    ]
  };
  