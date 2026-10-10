// server/middleware/errorHandler.js
// JSON 404 for unknown /api routes + centralized error handler.

function notFound(req, res) {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error("Server error:", err.stack || err.message || err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body." });
  }
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "That record already exists." });
  }

  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
}

module.exports = { notFound, errorHandler };
