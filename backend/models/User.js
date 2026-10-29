import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import pkg from 'validator';
import { query as postgresQuery } from '../config/postgres.js';
import { withPostgresBreaker } from '../config/circuitBreakers.js';

const { isEmail } = pkg;

export const USER_ROLES = Object.freeze(['user', 'admin']);
const NAME_MAX_LENGTH = 50;
const USER_COLUMNS = 'id, first_name, last_name, email, google_id, role, picture, created_at';

export class UserValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserValidationError';
    this.statusCode = 400;
  }
}

export class UserConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserConflictError';
    this.statusCode = 409;
  }
}

export function normalizeEmail(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized && isEmail(normalized) ? normalized : null;
}

function normalizeName(value, fallback = '') {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return (trimmed || fallback).slice(0, NAME_MAX_LENGTH);
}

function normalizePicture(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function fromRow(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    googleId: row.google_id,
    role: USER_ROLES.includes(row.role) ? row.role : 'user',
    picture: row.picture ?? null,
    createdAt: row.created_at,
  };
}

// Sign-in response shape the frontend stores (`_id` and `userId` are both read).
export function serializeAuthUser(user, token) {
  return {
    _id: user._id,
    userId: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    picture: user.picture,
    token,
  };
}

export function serializePublicUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    picture: user.picture,
  };
}

// The minimal identity attached to req.user by the auth middleware.
export function toRequestUser(user) {
  return {
    _id: user._id,
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

export function generateAuthToken(user) {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured');
    error.statusCode = 500;
    throw error;
  }
  const options = process.env.JWT_EXPIRE ? { expiresIn: process.env.JWT_EXPIRE } : {};
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, options);
}

function isUniqueViolation(error, column) {
  if (error?.code !== '23505') return false;
  const detail = `${error.constraint || ''} ${error.detail || ''}`;
  return detail.includes(column);
}

export function createUserRepository({ query, runQuery = withPostgresBreaker } = {}) {
  if (typeof query !== 'function') throw new TypeError('createUserRepository requires a query function');
  const exec = (text, params) => runQuery(() => query(text, params));

  async function findOneBy(column, value) {
    if (typeof value !== 'string' || !value) return null;
    const { rows } = await exec(`SELECT ${USER_COLUMNS} FROM users WHERE ${column} = $1 LIMIT 1`, [value]);
    return fromRow(rows[0]);
  }

  return {
    findById: (id) => findOneBy('id', id),
    findByGoogleId: (googleId) => findOneBy('google_id', googleId),
    findByEmail: (email) => findOneBy('email', normalizeEmail(email)),

    /**
     * Creates the user for a verified Google identity, or refreshes the
     * profile picture of the existing one. A single INSERT ... ON CONFLICT
     * keeps concurrent first sign-ins from creating duplicates. Role is
     * always 'user' on insert and never touched on update.
     */
    async upsertGoogleUser({ googleId, email, firstName, lastName, picture }) {
      if (typeof googleId !== 'string' || !googleId.trim()) {
        throw new UserValidationError('Google account id is required');
      }
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) throw new UserValidationError('A valid email is required');

      const values = [
        randomUUID(),
        normalizeName(firstName, normalizedEmail.split('@')[0]),
        normalizeName(lastName),
        normalizedEmail,
        googleId.trim(),
        normalizePicture(picture),
      ];

      let result;
      try {
        result = await exec(
          `INSERT INTO users (id, first_name, last_name, email, google_id, role, picture)
           VALUES ($1, $2, $3, $4, $5, 'user', $6)
           ON CONFLICT (google_id) DO UPDATE SET picture = EXCLUDED.picture, updated_at = now()
             WHERE users.picture IS DISTINCT FROM EXCLUDED.picture
           RETURNING ${USER_COLUMNS}, (xmax = 0) AS inserted`,
          values,
        );
      } catch (error) {
        if (isUniqueViolation(error, 'email')) {
          throw new UserConflictError('This email is already linked to a different account');
        }
        throw error;
      }

      if (result.rows[0]) {
        return { user: fromRow(result.rows[0]), created: result.rows[0].inserted === true };
      }
      // Conflict with an unchanged picture: the WHERE skipped the update, so
      // nothing was returned.
      const existing = await findOneBy('google_id', values[4]);
      if (!existing) throw new Error('User upsert returned no row');
      return { user: existing, created: false };
    },
  };
}

const User = createUserRepository({ query: (text, params) => postgresQuery(text, params) });

export const { findById, findByGoogleId, findByEmail, upsertGoogleUser } = User;
export default User;
