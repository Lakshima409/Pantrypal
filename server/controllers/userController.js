// server/controllers/userController.js
const UserModel = require("../models/user");

// ✅ GET /api/users/profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    const prefs = await UserModel.getPreferences(req.user.id);

    res.json({
      user: {
        ...UserModel.toPublic(user),
        dietaryRestrictions: prefs.dietaryRestrictions,
        preferences: prefs.preferences,
        householdSize: prefs.householdSize || "1-2",
        cookingFrequency: prefs.cookingFrequency || "weeknight",
      },
    });
  } catch (err) {
    next(err);
  }
};

// ✅ PUT /api/users/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, dietaryRestrictions, preferences, householdSize, cookingFrequency } =
      req.body || {};

    let user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if ((name && name !== user.name) || (email && email !== user.email)) {
      user = await UserModel.updateProfile(req.user.id, {
        name: name || user.name,
        email: email || user.email,
      });
    }

    const wantsPrefs =
      Array.isArray(dietaryRestrictions) ||
      Array.isArray(preferences) ||
      householdSize !== undefined ||
      cookingFrequency !== undefined;
    if (wantsPrefs) {
      const current = await UserModel.getPreferences(req.user.id);
      await UserModel.savePreferences(req.user.id, {
        ...current,
        dietaryRestrictions: dietaryRestrictions || current.dietaryRestrictions,
        preferences: preferences || current.preferences,
        householdSize: householdSize || current.householdSize,
        cookingFrequency: cookingFrequency || current.cookingFrequency,
      });
    }

    const prefs = await UserModel.getPreferences(req.user.id);
    res.json({
      user: {
        ...UserModel.toPublic(user),
        dietaryRestrictions: prefs.dietaryRestrictions,
        preferences: prefs.preferences,
        householdSize: prefs.householdSize || "1-2",
        cookingFrequency: prefs.cookingFrequency || "weeknight",
      },
    });
  } catch (err) {
    next(err);
  }
};

// ✅ GET /api/users/preferences
exports.getPreferences = async (req, res, next) => {
  try {
    res.json({ preferences: await UserModel.getPreferences(req.user.id) });
  } catch (err) {
    next(err);
  }
};

// ✅ PUT /api/users/preferences
exports.savePreferences = async (req, res, next) => {
  try {
    const preferences = await UserModel.savePreferences(req.user.id, req.body || {});
    res.json({ preferences });
  } catch (err) {
    next(err);
  }
};
