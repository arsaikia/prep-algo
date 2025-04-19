import mongoose from 'mongoose';
import pkg from 'validator';
import { v4 as UUID_V4 } from 'uuid';
import jwt from 'jsonwebtoken';
const { isEmail } = pkg;

const { Schema } = mongoose;

const userSchema = new Schema({
  _id: { type: String, default: UUID_V4 },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [isEmail, 'Please add a valid email']
  },
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  picture: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate JWT token
userSchema.methods.generateAuthToken = function generateAuthToken() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Find user by Google ID
userSchema.statics.findByGoogleId = function findByGoogleId(googleId) {
  return this.findOne({ googleId });
};

// Find user by email
userSchema.statics.findByEmail = function findByEmail(email) {
  return this.findOne({ email });
};

const User = mongoose.model('User', userSchema);

export default User;