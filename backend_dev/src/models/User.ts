import { v4 as uuidv4 } from 'uuid';
import bcryptjs from 'bcryptjs';
import type { User, RegisterPayload } from '../types/index.js';

// Temporary in-memory storage (replace with database later)
let users: User[] = [];

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    return users.find(u => u.email === email) || null;
  }

  static async findById(id: string): Promise<User | null> {
    return users.find(u => u.id === id) || null;
  }

  static async create(payload: RegisterPayload): Promise<User> {
    const hashedPassword = await bcryptjs.hash(payload.password, 10);
    
    const newUser: User = {
      id: uuidv4(),
      email: payload.email,
      password: hashedPassword,
      firstName: payload.firstName,
      lastName: payload.lastName,
      createdAt: new Date(),
    };

    users.push(newUser);
    return newUser;
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcryptjs.compare(password, hashedPassword);
  }
}
