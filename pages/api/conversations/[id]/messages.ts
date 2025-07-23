import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getUserFromToken } from '../../../../lib/auth';
import { getRagService } from '../../../../lib/rag';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { id: conversationId } = req.query;
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Verify user owns the conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId as string,
      userId: user.id,
    },
  });

  if (!conversation) {
    return res.status(404).json({ message: 'Conversation not found' });
  }

  if (req.method === 'GET') {
    try {
      const messages = await prisma.message.findMany({
        where: { conversationId: conversationId as string },
        orderBy: { createdAt: 'asc' },
      });

      res.status(200).json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }

      // Save user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversationId as string,
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
          conversationId: conversationId as string,
          role: 'assistant',
          content: ragResponse.answer,
          sources: JSON.stringify(ragResponse.sources),
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: conversationId as string },
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