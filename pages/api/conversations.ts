import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '../../lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (req.method === 'GET') {
    try {
      // Find or create the user's single conversation
      let conversation = await prisma.conversation.findFirst({
        where: { userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        // Create the user's conversation if it doesn't exist
        conversation = await prisma.conversation.create({
          data: {
            userId: user.id,
            title: 'Home Loan Q&A',
          },
          include: {
            messages: true,
          },
        });
      }

      res.status(200).json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}