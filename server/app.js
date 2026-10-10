// server/app.js
// Express application setup: global middleware, routes and error handling.
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const recipeRoutes = require("./routes/recipes");
const pantryRoutes = require("./routes/pantry");
const mealPlanRoutes = require("./routes/mealplan");
const shoppingListRoutes = require("./routes/shoppinglist");
const userRoutes = require("./routes/user");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ---- Global middleware ----
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

// Tiny request logger (keeps the console useful during development).
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

// ---- Health check ----
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// ---- Feature routes ----
app.use("/api/auth", authRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/pantry", pantryRoutes);
app.use("/api/mealplan", mealPlanRoutes);
app.use("/api/shoppinglist", shoppingListRoutes);
app.use("/api/users", userRoutes);

// ---- Errors ----
app.use("/api", notFound);
app.use(errorHandler);

module.exports = app;
