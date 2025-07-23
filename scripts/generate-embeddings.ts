import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Gemini client - you'll need to set GOOGLE_API_KEY environment variable
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Rate limiting configuration
const CONCURRENT_CHUNKS = 3; // Process 3 chunks at once
const CONCURRENT_PAGES = 2;  // Process 2 pages at once
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
const MAX_RETRIES = 5;

async function generateEmbeddingWithRetry(text: string, attempt: number = 0): Promise<number[] | null> {
  try {
    // Use Gemini's text-embedding-004 model
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    const result = await model.embedContent(text.substring(0, 8000)); // Limit text length
    
    if (result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
    
    return null;
    
  } catch (error: any) {
    // Handle rate limiting and overload errors with exponential backoff
    if (error?.status === 529 || error?.message?.includes('overloaded') || error?.message?.includes('rate limit')) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`⏳ API overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateEmbeddingWithRetry(text, attempt + 1);
      } else {
        console.error(`❌ Max retries reached for embedding generation`);
        return null;
      }
    }
    
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Helper function to process chunks in parallel with concurrency control
async function processChunksInParallel(chunks: any[], pageId: string, url: string): Promise<void> {
  const semaphore = new Array(CONCURRENT_CHUNKS).fill(null);
  let chunkIndex = 0;
  
  const processChunk = async (chunk: any) => {
    const embedding = await generateEmbeddingWithRetry(chunk.content);
    
    if (embedding) {
      await prisma.embedding.create({
        data: {
          pageId,
          content: chunk.content,
          vector: JSON.stringify(embedding),
          metadata: JSON.stringify({
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            chunkLength: chunk.content.length,
            generatedAt: new Date().toISOString(),
            model: 'text-embedding-004',
            url: url
          })
        }
      });
      
      console.log(`✅ Created embedding for chunk ${chunk.startIndex}-${chunk.endIndex} (${embedding.length} dimensions)`);
      return true;
    }
    return false;
  };
  
  const workers = semaphore.map(async () => {
    while (chunkIndex < chunks.length) {
      const currentChunk = chunks[chunkIndex++];
      if (currentChunk) {
        await processChunk(currentChunk);
        // Small delay between chunks to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });
  
  await Promise.all(workers);
}

async function processPageForEmbeddings(pageId: string, content: string, rawPageContent: string, url: string) {
  try {
    // Split content into larger chunks to reduce API calls
    const chunkSize = 2000; // Increased from 1000 to 2000
    const chunks = [];
    
    // Use raw page content if available, otherwise use processed content
    const textToProcess = rawPageContent || content;
    
    if (!textToProcess || textToProcess.trim().length < 50) {
      console.log('⚠️  Skipping page with insufficient content');
      return;
    }
    
    for (let i = 0; i < textToProcess.length; i += chunkSize) {
      const chunk = textToProcess.substring(i, i + chunkSize);
      if (chunk.trim().length > 50) { // Only process meaningful chunks
        chunks.push({
          content: chunk.trim(),
          startIndex: i,
          endIndex: Math.min(i + chunkSize, textToProcess.length)
        });
      }
    }
    
    console.log(`Processing ${chunks.length} chunks for page: ${url}`);
    
    for (const chunk of chunks) {
      const embedding = await generateEmbeddingWithRetry(chunk.content);
      
      if (embedding) {
        await prisma.embedding.create({
          data: {
            pageId,
            content: chunk.content,
            vector: JSON.stringify(embedding),
            metadata: JSON.stringify({
              startIndex: chunk.startIndex,
              endIndex: chunk.endIndex,
              chunkLength: chunk.content.length,
              generatedAt: new Date().toISOString(),
              model: 'text-embedding-004',
              url: url
            })
          }
        });
        
        console.log(`✅ Created embedding for chunk ${chunk.startIndex}-${chunk.endIndex} (${embedding.length} dimensions)`);
      }
      
      // Small delay to be respectful to API - reduced for faster processing
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
  } catch (error) {
    console.error(`Error processing embeddings for page ${pageId}:`, error);
  }
}

async function main() {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      console.error('❌ GOOGLE_API_KEY environment variable is required');
      console.log('Set it with: export GOOGLE_API_KEY=your_api_key_here');
      console.log('Get your API key from: https://makersuite.google.com/app/apikey');
      process.exit(1);
    }
    
    // Get all scraped pages that don't have embeddings yet
    const pages = await prisma.page.findMany({
      where: {
        scraped: true,
        embeddings: {
          none: {}
        }
      },
      select: {
        id: true,
        url: true,
        title: true,
        content: true,
        rawPageContent: true
      }
    });
    
    console.log(`Found ${pages.length} pages to process for embeddings`);
    console.log('🤖 Using Gemini text-embedding-004 model\n');
    
    if (pages.length === 0) {
      console.log('🎉 All scraped pages already have embeddings!');
      return;
    }
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`\n📄 Processing page ${i + 1}/${pages.length}: ${page.title || page.url}`);
      
      if (page.content || page.rawPageContent) {
        await processPageForEmbeddings(
          page.id, 
          page.content || '', 
          page.rawPageContent || '',
          page.url
        );
      } else {
        console.log('⚠️  Skipping page with no content');
      }
      
      // Longer delay between pages
      if (i < pages.length - 1) {
        console.log('⏳ Waiting before next page...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n✅ Embedding generation completed!');
    
    // Show summary
    const totalEmbeddings = await prisma.embedding.count();
    const pagesWithEmbeddings = await prisma.page.count({
      where: {
        embeddings: {
          some: {}
        }
      }
    });
    
    console.log(`📊 Summary:`);
    console.log(`   - Total embeddings: ${totalEmbeddings}`);
    console.log(`   - Pages with embeddings: ${pagesWithEmbeddings}`);
    
    // Show sample embedding info
    const sampleEmbedding = await prisma.embedding.findFirst({
      include: {
        page: {
          select: {
            url: true,
            title: true
          }
        }
      }
    });
    
    if (sampleEmbedding) {
      const vector = JSON.parse(sampleEmbedding.vector);
      console.log(`   - Sample embedding: ${vector.length} dimensions`);
      console.log(`   - Sample page: ${sampleEmbedding.page.title || sampleEmbedding.page.url}`);
    }
    
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}