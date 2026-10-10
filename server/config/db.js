// server/config/db.js
// MySQL connection pool (mysql2/promise) — matches the report's mysqlPool.js
// design and the original controllers, which all call `db.query(...)`.
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "recipe_db",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

// Quick connectivity probe used by server.js on boot.
async function verifyConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

module.exports = pool;
module.exports.verifyConnection = verifyConnection;
