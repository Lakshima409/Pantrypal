// server/middleware/errorHandler.js
// JSON 404 for unknown /api routes + centralized error handler.

function notFound(req, res) {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log full detail server-side only; never leak internals to the client.
  console.error("Server error:", err.stack || err.message || err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body too large." });
  }
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "That record already exists." });
  }

  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  // Trusted 4xx messages pass through; 5xx becomes a generic message so
  // stack traces, SQL text and secrets never reach the client.
  const message =
    status >= 400 && status < 500 && err.message
      ? err.message
      : "Something went wrong. Please try again.";
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
