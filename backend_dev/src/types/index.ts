export interface User {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface JwtPayload {
  id: string;
  email: string;
}
