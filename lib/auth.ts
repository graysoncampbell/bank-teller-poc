import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Allowed email domains for registration and login
const ALLOWED_DOMAINS = ['unloan.com.au', 'loonshoot.com'];

function isEmailAllowed(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export interface User {
  id: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { id: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

export async function createUser(email: string, password: string) {
  // Check if email domain is allowed
  if (!isEmailAllowed(email)) {
    throw new Error('Your domain is not supported');
  }

  const hashedPassword = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
}

export async function authenticateUser(email: string, password: string) {
  // Check if email domain is allowed
  if (!isEmailAllowed(email)) {
    return null; // Reject login for non-allowed domains
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  return { id: user.id, email: user.email };
}

export async function getUserFromToken(token: string) {
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  // Check if the decoded email domain is allowed
  if (!isEmailAllowed(decoded.email)) {
    return null; // Reject token for non-allowed domains
  }

  return prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true },
  });
}