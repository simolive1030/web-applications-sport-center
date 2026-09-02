
import db from '../config/db.mjs'; 
import crypto from 'crypto';

// Returns a user's information given their ID.
const getUserById = async (id) => {
  const row = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) return { error: 'User not found.' };

  return {
    id: row.id,
    username: row.username,
    score: row.score,
    secret: row.totp_secret,
    lastTotpStep: row.last_totp_step,
  };
};

// Used at login to verify username and password.
const getUser = async (username, password) => {
  const row = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!row) return false;

  const user = {
    id: row.id,
    username: row.username,
    score: row.score,
    secret: row.totp_secret,
    lastTotpStep: row.last_totp_step,
  };

  // Check the hashes with an async call
  const hashedPassword = await new Promise((resolve, reject) => {
    crypto.scrypt(password, row.password_salt, 32, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

  // Use timingSafeEqual to prevent timing attacks
  const storedHash = Buffer.from(row.hash, 'hex');
  if (storedHash.length !== hashedPassword.length ||
      !crypto.timingSafeEqual(storedHash, hashedPassword)) {
    return false;
  }

  return user;
};

// Updates last_totp_step (replay protection) and resets the user's score
const updateLastTotpStepAndResetScore = async (userId, lastTotpStep) => {
  const result = await db.run(
    'UPDATE users SET last_totp_step = ?, score = 0 WHERE id = ?',
    [lastTotpStep, userId]
  );
  if (result.changes !== 1) return { error: 'User not found.' };
  return result.changes;
};

export default {
  getUserById,
  getUser,
  updateLastTotpStepAndResetScore,
};
