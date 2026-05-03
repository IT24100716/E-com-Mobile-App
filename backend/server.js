const app = require("./src/app");

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
  console.log(`📚 API Base URL: http://0.0.0.0:${PORT}/api/v1`);
});

// Keep process alive and log errors
server.on('error', (err) => {
  console.error('❌ Server Error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Heartbeat to prevent clean exit
setInterval(() => {
  // console.log('💓 Heartbeat - Server is alive');
}, 60000);

