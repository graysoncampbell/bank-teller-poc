import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '../../lib/auth';
import { getRagService } from '../../lib/rag';

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

  if (req.method === 'POST') {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }

      // Find or create the user's single conversation
      let conversation = await prisma.conversation.findFirst({
        where: { userId: user.id },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId: user.id,
            title: 'Home Loan Q&A',
          },
        });
      }

      // Save user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content,
        },
      });

      // Generate AI response using RAG
      const ragService = await getRagService();
      const ragResponse = await ragService.generateResponse(content);

      // Save AI response
      const aiMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: ragResponse.answer,
          sources: JSON.stringify(ragResponse.sources),
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      res.status(201).json({
        userMessage,
        aiMessage: {
          ...aiMessage,
          sources: ragResponse.sources,
        },
      });
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}