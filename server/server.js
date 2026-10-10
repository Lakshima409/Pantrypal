// server/server.js
const app = require("./app");
const db = require("./config/db");
const { verifyConnection } = require("./config/db");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await verifyConnection();
    console.log("Connected to MySQL database");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to connect to MySQL:", err.message);
    process.exit(1);
  }
})();
