// server/models/user.js — data access for `users` + `dietary_preferences`.
const db = require("../config/db");

function toPublic(row) {
  if (!row) return null;
  return {
    id: row.user_id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

async function findByEmail(email) {
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash }) {
  const [result] = await db.query(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [name, email, passwordHash]
  );
  return findById(result.insertId);
}

async function updateProfile(id, { name, email }) {
  await db.query("UPDATE users SET name = ?, email = ? WHERE user_id = ?", [
    name,
    email,
    id,
  ]);
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await db.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [passwordHash, id]);
}

// ---- preferences stored in dietary_preferences (preference_type/preference_value) ----

async function getPreferences(userId) {
  const [rows] = await db.query(
    "SELECT preference_type, preference_value FROM dietary_preferences WHERE user_id = ?",
    [userId]
  );
  const grouped = {};
  for (const row of rows) {
    (grouped[row.preference_type] = grouped[row.preference_type] || []).push(row.preference_value);
  }
  const one = (type) => (grouped[type] && grouped[type][0]) || undefined;
  return {
    calorieGoal: one("calorieGoal"),
    dietType: one("dietType"),
    skill: one("skill"),
    cookTime: one("cookTime"),
    difficulty: one("difficulty"),
    householdSize: one("householdSize"),
    cookingFrequency: one("cookingFrequency"),
    calorieMin: one("calorieMin"),
    calorieMax: one("calorieMax"),
    dietaryRestrictions: grouped.dietaryRestriction || [],
    preferences: grouped.preference || [],
    allergies: grouped.allergy || [],
    dietary: grouped.diet || [],
    healthConditions: grouped.healthCondition || [],
  };
}

async function savePreferences(userId, prefs) {
  const entries = [];
  const pushList = (type, values) => {
    for (const value of values || []) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        entries.push([type, String(value)]);
      }
    }
  };
  const pushOne = (type, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      entries.push([type, String(value)]);
    }
  };

  // Both shapes are accepted: registration/profile style …
  pushList("dietaryRestriction", prefs.dietaryRestrictions);
  pushList("preference", prefs.preferences);
  // … and the full preferences screen style.
  pushOne("calorieGoal", prefs.calorieGoal);
  pushOne("dietType", prefs.dietType);
  pushOne("skill", prefs.skill);
  pushOne("cookTime", prefs.cookTime);
  pushOne("difficulty", prefs.difficulty);
  pushOne("householdSize", prefs.householdSize);
  pushOne("cookingFrequency", prefs.cookingFrequency);
  pushOne("calorieMin", prefs.calorieMin);
  pushOne("calorieMax", prefs.calorieMax);
  pushList("allergy", prefs.allergies);
  pushList("diet", prefs.dietary);
  pushList("healthCondition", prefs.healthConditions);

  const managedTypes = [
    "dietaryRestriction", "preference", "calorieGoal", "dietType", "skill",
    "cookTime", "difficulty", "householdSize", "cookingFrequency",
    "calorieMin", "calorieMax", "allergy", "diet", "healthCondition",
  ];
  // Phase 2 data integrity: DELETE + INSERT must be atomic — a crash between
  // them must not wipe the user's preferences. Parameterised + transactional.
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "DELETE FROM dietary_preferences WHERE user_id = ? AND preference_type IN (?)",
      [userId, managedTypes]
    );
    if (entries.length) {
      await conn.query(
        "INSERT INTO dietary_preferences (user_id, preference_type, preference_value) VALUES ?",
        [entries.map(([type, value]) => [userId, type, value])]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return getPreferences(userId);
}

module.exports = {
  findByEmail,
  findById,
  create,
  updateProfile,
  updatePassword,
  getPreferences,
  savePreferences,
  toPublic,
};
