/**
 * Vector Search Engine for RAG (Retrieval-Augmented Generation)
 * 
 * This script provides vector similarity search capabilities for the application.
 * It's used by the RAG service to find relevant content for user questions.
 * 
 * Key Features:
 * - Vector similarity search using Google's text-embedding-004 model
 * - Text search using MongoDB text indexes  
 * - Hybrid search combining both approaches
 * - Works with remote MongoDB Atlas database
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface EmbeddingDocument {
  _id?: string;
  pageId: string;
  url?: string; // From joined Page collection
  title?: string | null; // From joined Page collection
  content: string;
  vector: number[] | string;
  metadata: any;
  chunkIndex?: number;
  createdAt: Date;
}

interface SearchResult extends EmbeddingDocument {
  similarity?: number;
}

class VectorSearchEngine {
  private mongoClient: MongoClient;
  private db: Db;
  private collection: Collection<EmbeddingDocument>;
  private genAI: GoogleGenerativeAI;

  constructor(
    mongoUrl: string = process.env.MONGODB_URL || 'mongodb://localhost:27017',
    dbName: string = 'unloan',
    apiKey?: string
  ) {
    this.mongoClient = new MongoClient(mongoUrl);
    this.db = this.mongoClient.db(dbName);
    this.collection = this.db.collection('Embedding');
    
    const googleApiKey = apiKey || process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(googleApiKey);
  }

  async connect() {
    await this.mongoClient.connect();
    console.log('✅ Connected to MongoDB');
  }

  async disconnect() {
    await this.mongoClient.close();
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values || [];
  }

  // Cosine similarity function
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Vector similarity search using in-memory calculation
  async vectorSimilaritySearch(
    queryText: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    console.log(`🔍 Generating embedding for query: "${queryText}"`);
    const queryVector = await this.generateEmbedding(queryText);
    
    console.log(`📊 Searching through embeddings...`);
    // Join with Page collection to get url and title
    const allEmbeddings = await this.collection.aggregate([
      {
        $lookup: {
          from: 'Page',
          localField: 'pageId',
          foreignField: '_id',
          as: 'page'
        }
      },
      {
        $unwind: '$page'
      },
      {
        $project: {
          _id: 1,
          pageId: 1,
          content: 1,
          vector: 1,
          metadata: 1,
          createdAt: 1,
          url: '$page.url',
          title: '$page.title'
        }
      }
    ]).toArray();
    
    const results: SearchResult[] = [];
    
    for (const embedding of allEmbeddings) {
      let vectorArray: number[] = [];
      
      // Handle different vector storage formats
      if (typeof embedding.vector === 'string') {
        try {
          vectorArray = JSON.parse(embedding.vector);
        } catch (e) {
          continue; // Skip invalid JSON
        }
      } else if (Array.isArray(embedding.vector)) {
        vectorArray = embedding.vector;
      } else {
        continue; // Skip if vector is not in expected format
      }
      
      if (vectorArray && vectorArray.length > 0) {
        const similarity = this.cosineSimilarity(queryVector, vectorArray);
        
        if (similarity >= threshold) {
          results.push({
            ...embedding,
            vector: vectorArray, // Normalize to array format
            similarity
          } as SearchResult);
        }
      }
    }
    
    // Sort by similarity descending and limit results
    return results
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);
  }

  // Hybrid search combining vector similarity and text search
  async hybridSearch(
    queryText: string,
    limit: number = 10,
    vectorWeight: number = 0.7,
    textWeight: number = 0.3
  ): Promise<SearchResult[]> {
    console.log(`🔍 Performing hybrid search for: "${queryText}"`);
    
    // Get vector similarity results
    const vectorResults = await this.vectorSimilaritySearch(queryText, limit * 2, 0.5);
    
    // Get text search results with page info
    const textResults = await this.collection.aggregate([
      { $match: { $text: { $search: queryText } } },
      { $addFields: { score: { $meta: "textScore" } } },
      {
        $lookup: {
          from: 'Page',
          localField: 'pageId',
          foreignField: '_id',
          as: 'page'
        }
      },
      { $unwind: '$page' },
      {
        $project: {
          _id: 1,
          pageId: 1,
          content: 1,
          vector: 1,
          metadata: 1,
          createdAt: 1,
          url: '$page.url',
          title: '$page.title',
          score: 1
        }
      },
      { $sort: { score: { $meta: "textScore" } } },
      { $limit: limit * 2 }
    ]).toArray();

    // Combine and score results
    const combinedResults = new Map<string, SearchResult>();
    
    // Add vector results with weighted scores
    vectorResults.forEach((result, index) => {
      const vectorScore = (result.similarity || 0) * vectorWeight;
      const rankBonus = (vectorResults.length - index) / vectorResults.length * 0.1;
      
      combinedResults.set(result.pageId, {
        ...result,
        similarity: vectorScore + rankBonus
      });
    });
    
    // Add text results with weighted scores
    textResults.forEach((result, index) => {
      const textScore = ((result as any).score || 0) / 10; // Normalize text score
      const weightedTextScore = textScore * textWeight;
      const rankBonus = (textResults.length - index) / textResults.length * 0.1;
      
      const existing = combinedResults.get(result.pageId);
      if (existing) {
        // Combine scores if document appears in both results
        existing.similarity = (existing.similarity || 0) + weightedTextScore + rankBonus;
      } else {
        combinedResults.set(result.pageId, {
          ...result,
          similarity: weightedTextScore + rankBonus
        } as SearchResult);
      }
    });
    
    // Sort by combined score and return top results
    return Array.from(combinedResults.values())
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);
  }

  // Simple text-based search
  async textSearch(queryText: string, limit: number = 10): Promise<SearchResult[]> {
    const results = await this.collection.aggregate([
      { $match: { $text: { $search: queryText } } },
      { $addFields: { score: { $meta: "textScore" } } },
      {
        $lookup: {
          from: 'Page',
          localField: 'pageId',
          foreignField: '_id',
          as: 'page'
        }
      },
      { $unwind: '$page' },
      {
        $project: {
          _id: 1,
          pageId: 1,
          content: 1,
          vector: 1,
          metadata: 1,
          createdAt: 1,
          url: '$page.url',
          title: '$page.title',
          score: 1
        }
      },
      { $sort: { score: { $meta: "textScore" } } },
      { $limit: limit }
    ]).toArray();

    return results.map(result => ({
      ...result,
      similarity: (result as any).score / 10, // Normalize text score
      vector: result.vector || [] // Ensure vector property exists
    } as SearchResult));
  }

  // Search by URL pattern
  async searchByUrl(urlPattern: string, limit: number = 10): Promise<EmbeddingDocument[]> {
    return await this.collection
      .find({ url: { $regex: urlPattern, $options: 'i' } })
      .limit(limit)
      .toArray();
  }

  // Get document by page ID
  async getByPageId(pageId: string): Promise<EmbeddingDocument[]> {
    return await this.collection
      .find({ pageId })
      .sort({ chunkIndex: 1 })
      .toArray();
  }

  // Analytics and stats
  async getStats() {
    const totalDocs = await this.collection.countDocuments();
    const uniquePages = await this.collection.distinct('pageId');
    
    // For vector dimensions, we need to handle string format
    const sampleVector = await this.collection.findOne({ vector: { $exists: true } });
    let avgVectorDimensions = 0;
    
    if (sampleVector && sampleVector.vector) {
      try {
        if (typeof sampleVector.vector === 'string') {
          const parsedVector = JSON.parse(sampleVector.vector);
          avgVectorDimensions = Array.isArray(parsedVector) ? parsedVector.length : 0;
        } else if (Array.isArray(sampleVector.vector)) {
          avgVectorDimensions = sampleVector.vector.length;
        }
      } catch (e) {
        avgVectorDimensions = 0;
      }
    }

    return {
      totalDocuments: totalDocs,
      uniquePages: uniquePages.length,
      averageVectorDimensions: avgVectorDimensions
    };
  }
}

// CLI interface for testing
async function main() {
  const args = process.argv.slice(2);
  const query = args.join(' ') || 'home loan features';
  
  const searchEngine = new VectorSearchEngine();
  
  try {
    await searchEngine.connect();
    
    console.log('📊 Collection Stats:');
    const stats = await searchEngine.getStats();
    console.log(`  Total Documents: ${stats.totalDocuments}`);
    console.log(`  Unique Pages: ${stats.uniquePages}`);
    console.log(`  Avg Vector Dimensions: ${stats.averageVectorDimensions.toFixed(0)}`);
    console.log('');
    
    // Test different search methods
    console.log('🔍 Vector Similarity Search:');
    const vectorResults = await searchEngine.vectorSimilaritySearch(query, 5);
    vectorResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title || 'Untitled'} (Similarity: ${result.similarity?.toFixed(3)})`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Content: ${result.content.substring(0, 150)}...`);
      console.log('');
    });
    
    console.log('🔍 Text Search:');
    const textResults = await searchEngine.textSearch(query, 5);
    textResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title || 'Untitled'} (Score: ${result.similarity?.toFixed(3)})`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Content: ${result.content.substring(0, 150)}...`);
      console.log('');
    });
    
    console.log('🔍 Hybrid Search:');
    const hybridResults = await searchEngine.hybridSearch(query, 5);
    hybridResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title || 'Untitled'} (Combined Score: ${result.similarity?.toFixed(3)})`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Content: ${result.content.substring(0, 150)}...`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  } finally {
    await searchEngine.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { VectorSearchEngine };
export type { SearchResult, EmbeddingDocument };