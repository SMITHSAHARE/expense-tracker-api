const bcrypt = require('bcryptjs');
const { run, get, lastInsertRowId } = require('../config/database');
const { generateToken, JWT_EXPIRES_IN } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const { validateRegister, validateLogin, validatePasswordChange } = require('../utils/validators');

// POST /api/auth/register
async function register(req, res) {
  try {
    const errors = validateRegister(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, errors);
    }

    const { name, email, password } = req.body;

    // Check if email already taken
    const existing = get(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (existing) {
      return errorResponse(res, 'An account with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    run(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [name.trim(), email.toLowerCase(), hashedPassword]
    );

    const userId = lastInsertRowId();
    const user = get(`SELECT id, name, email, created_at FROM users WHERE id = ?`, [userId]);

    const token = generateToken({ userId: user.id });

    return successResponse(
      res,
      { user, token, token_expires_in: JWT_EXPIRES_IN },
      'Registration successful',
      201
    );
  } catch (err) {
    console.error('Register error:', err.message);
    return errorResponse(res, 'Registration failed. Please try again.', 500);
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const errors = validateLogin(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, errors);
    }

    const { email, password } = req.body;

    const user = get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()]);
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    const token = generateToken({ userId: user.id });

    const { password: _, ...userWithoutPassword } = user;

    return successResponse(
      res,
      { user: userWithoutPassword, token, token_expires_in: JWT_EXPIRES_IN },
      'Login successful'
    );
  } catch (err) {
    console.error('Login error:', err.message);
    return errorResponse(res, 'Login failed. Please try again.', 500);
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  try {
    // Invalidate the current token
    run(`INSERT INTO invalidated_tokens (token) VALUES (?)`, [req.token]);
    return successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    console.error('Logout error:', err.message);
    return errorResponse(res, 'Logout failed.', 500);
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const user = get(
      `SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?`,
      [req.user.id]
    );
    return successResponse(res, { user }, 'Profile fetched successfully');
  } catch (err) {
    console.error('GetMe error:', err.message);
    return errorResponse(res, 'Could not fetch profile.', 500);
  }
}

// PUT /api/auth/profile
async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return errorResponse(res, 'Validation failed', 400, [
          { field: 'name', message: 'Name must be at least 2 characters' },
        ]);
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (email !== undefined) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(email)) {
        return errorResponse(res, 'Validation failed', 400, [
          { field: 'email', message: 'Please provide a valid email address' },
        ]);
      }
      // Check email not taken by someone else
      const existing = get(
        `SELECT id FROM users WHERE email = ? AND id != ?`,
        [email.toLowerCase(), req.user.id]
      );
      if (existing) {
        return errorResponse(res, 'This email is already in use by another account', 409);
      }
      updates.push('email = ?');
      params.push(email.toLowerCase());
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields provided to update', 400);
    }

    updates.push(`updated_at = datetime('now')`);
    params.push(req.user.id);

    run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedUser = get(
      `SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?`,
      [req.user.id]
    );

    return successResponse(res, { user: updatedUser }, 'Profile updated successfully');
  } catch (err) {
    console.error('UpdateProfile error:', err.message);
    return errorResponse(res, 'Could not update profile.', 500);
  }
}

// PUT /api/auth/change-password
async function changePassword(req, res) {
  try {
    const errors = validatePasswordChange(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, errors);
    }

    const { current_password, new_password } = req.body;

    const user = get(`SELECT * FROM users WHERE id = ?`, [req.user.id]);

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    if (current_password === new_password) {
      return errorResponse(res, 'New password must be different from current password', 400);
    }

    const hashed = await bcrypt.hash(new_password, 12);
    run(
      `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`,
      [hashed, req.user.id]
    );

    // Invalidate current token so user must log in again
    run(`INSERT INTO invalidated_tokens (token) VALUES (?)`, [req.token]);

    return successResponse(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) {
    console.error('ChangePassword error:', err.message);
    return errorResponse(res, 'Could not change password.', 500);
  }
}

module.exports = { register, login, logout, getMe, updateProfile, changePassword };
    
