// server/middleware/validateInput.js
// Request validation for auth, profile, preferences and CRUD payloads.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

const register = (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }
  if (String(name).trim().length < 2 || String(name).length > 80) {
    return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
  }
  if (!EMAIL_RE.test(String(email))) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters and include upper & lower case letters and a number.",
    });
  }
  next();
};

const login = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }
  if (!EMAIL_RE.test(String(email))) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  next();
};

const profileUpdate = (req, res, next) => {
  const { name, email } = req.body || {};
  if (name !== undefined && (String(name).trim().length < 2 || String(name).length > 80)) {
    return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
  }
  if (email !== undefined && !EMAIL_RE.test(String(email))) {
    return res.status(400).json({ message: "Please enter a valid email address." });
  }
  next();
};

const resetPassword = (req, res, next) => {
  const { email, token, newPassword } = req.body || {};
  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "Please fill in all fields." });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters and include upper & lower case letters and a number.",
    });
  }
  next();
};

// Pantry item: requires a name; quantity must be numeric when provided.
const pantryItem = (req, res, next) => {
  const { name, quantity } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Ingredient name is required." });
  }
  if (quantity !== undefined && quantity !== null && quantity !== "" && isNaN(Number(quantity))) {
    return res.status(400).json({ message: "Quantity must be a number." });
  }
  next();
};

module.exports = { register, login, profileUpdate, resetPassword, pantryItem, isStrongPassword, EMAIL_RE };
