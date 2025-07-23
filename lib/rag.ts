import { VectorSearchEngine } from '../scripts/vector-search';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export interface RAGResponse {
  answer: string;
  sources: Array<{
    url: string;
    title: string;
    content: string;
    similarity: number;
  }>;
}

export class RAGService {
  private searchEngine: VectorSearchEngine;
  private model: any;
  private prisma: PrismaClient;

  constructor() {
    this.searchEngine = new VectorSearchEngine();
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.prisma = new PrismaClient();
  }

  async initialize() {
    await this.searchEngine.connect();
  }

  async disconnect() {
    await this.searchEngine.disconnect();
    await this.prisma.$disconnect();
  }

  private extractMetaDescription(html: string): string {
    if (!html) return '';
    
    try {
      const $ = cheerio.load(html);
      const metaDescription = $('meta[name="description"]').attr('content') || 
                             $('meta[property="og:description"]').attr('content') || 
                             '';
      return metaDescription.trim();
    } catch (error) {
      console.error('Error extracting meta description:', error);
      return '';
    }
  }

  async generateResponse(question: string): Promise<RAGResponse> {
    // Get relevant context using vector search
    const searchResults = await this.searchEngine.hybridSearch(question, 5, 0.7, 0.3);
    
    // Prepare context for the model
    const context = searchResults
      .map((result, i) => `[${i + 1}] ${result.content}\nSource: ${result.url}\n`)
      .join('\n');

    // Create the prompt
    const prompt = `You are a helpful assistant that answers questions about home loans and financial services using Unloan's information.

Context from Unloan's website:
${context}

Question: ${question}

Instructions:
- You are a lending expert working for unloan a digital home loan provider.
- Answer the question using the provided context
- Be accurate and helpful
- If the context doesn't contain enough information, say so
- Write your response as if you're texting a friend - use short, natural paragraphs
- Each paragraph should be 1-3 sentences max
- Separate different points or ideas with a blank line
- Keep it conversational and easy to read on mobile
- Don't put references directly inline

Answer:`;

    // Retry logic for API calls
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const answer = result.response.text();

        // Get page data to extract meta descriptions
        const uniqueUrls = [...new Set(searchResults.map(r => r.url))];
        const pageData = await this.prisma.page.findMany({
          where: { url: { in: uniqueUrls } },
          select: { url: true, rawHtml: true }
        });

        const pageHtmlMap = new Map(pageData.map(p => [p.url, p.rawHtml || '']));

        return {
          answer,
          sources: searchResults.map(result => {
            const html = pageHtmlMap.get(result.url) || '';
            const metaDescription = this.extractMetaDescription(html);
            
            return {
              url: result.url,
              title: result.title || 'Untitled',
              content: metaDescription || result.content.substring(0, 200) + '...',
              similarity: result.similarity || 0
            };
          })
        };
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        // Check if it's a rate limit or overload error
        const isRetryableError = error.message?.includes('overloaded') || 
                                error.message?.includes('503') ||
                                error.message?.includes('429') ||
                                error.message?.includes('rate limit');

        if (attempt === maxRetries || !isRetryableError) {
          // Last attempt or non-retryable error - return fallback response
          return await this.getFallbackResponse(question, searchResults);
        }

        // Wait before retry with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This shouldn't be reached, but just in case
    return await this.getFallbackResponse(question, searchResults);
  }

  private async getFallbackResponse(question: string, searchResults: any[]): Promise<RAGResponse> {
    // Create a basic response using the search results when AI is unavailable
    const topResult = searchResults[0];
    
    let fallbackAnswer = "I'm currently experiencing high demand and can't generate a detailed response right now. ";
    
    if (topResult) {
      fallbackAnswer += `However, I found some relevant information about your question "${question}". `;
      fallbackAnswer += `You can find detailed information at: ${topResult.url}`;
      
      if (topResult.content) {
        fallbackAnswer += `\n\nHere's a brief excerpt: "${topResult.content.substring(0, 300)}..."`;
      }
    } else {
      fallbackAnswer += "Please try asking your question again in a moment, or visit unloan.com.au for more information about home loans.";
    }

    // Get page data to extract meta descriptions for fallback too
    const uniqueUrls = [...new Set(searchResults.map(r => r.url))];
    const pageData = await this.prisma.page.findMany({
      where: { url: { in: uniqueUrls } },
      select: { url: true, rawHtml: true }
    });

    const pageHtmlMap = new Map(pageData.map(p => [p.url, p.rawHtml || '']));

    return {
      answer: fallbackAnswer,
      sources: searchResults.map(result => {
        const html = pageHtmlMap.get(result.url) || '';
        const metaDescription = this.extractMetaDescription(html);
        
        return {
          url: result.url,
          title: result.title || 'Untitled',
          content: metaDescription || result.content.substring(0, 200) + '...',
          similarity: result.similarity || 0
        };
      })
    };
  }
}

// Singleton instance
let ragService: RAGService | null = null;

export async function getRagService(): Promise<RAGService> {
  if (!ragService) {
    ragService = new RAGService();
    await ragService.initialize();
  }
  return ragService;
}