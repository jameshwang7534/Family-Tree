import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import type { LoginPayload, RegisterPayload, AuthResponse } from '../types/index.js';

const generateToken = (id: string, email: string): string => {
  const secret = (process.env.JWT_SECRET ?? 'secret') as jwt.Secret;

  const expiresIn = (process.env.JWT_EXPIRE ?? '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign({ id, email }, secret, { expiresIn });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body as RegisterPayload;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await UserModel.create({ email, password, firstName, lastName });
    const token = generateToken(user.id, user.email);

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginPayload;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await UserModel.verifyPassword(password, user.password || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = (req: Request, res: Response) => {
  // JWT tokens are stateless, logout typically happens on client side
  // You can implement token blacklist if needed
  res.json({ message: 'Logged out successfully' });
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await UserModel.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
