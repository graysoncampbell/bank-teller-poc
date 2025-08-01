import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateToken, createUser } from '../../../lib/auth';

const prisma = new PrismaClient();

// Allowed email domains
const ALLOWED_DOMAINS = ['unloan.com.au', 'loonshoot.com'];

function isEmailAllowed(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Check if email domain is allowed first
    if (!isEmailAllowed(email)) {
      return res.status(400).json({ message: 'Your domain is not supported' });
    }

    // Find or create user by email
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    if (!user) {
      // Create user if doesn't exist (domain already validated above)
      const newUser = await prisma.user.create({
        data: {
          email,
          password: 'poc-no-password' // Placeholder for schema
        },
      });
      user = { id: newUser.id, email: newUser.email };
    }

    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}