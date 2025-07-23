import { PrismaClient } from '@prisma/client';
import { MongoClient, Db, Collection } from 'mongodb';

const prisma = new PrismaClient();

interface EmbeddingDocument {
  _id?: string;
  pageId: string;
  url: string;
  title: string | null;
  content: string;
  vector: number[];
  metadata: any;
  chunkIndex?: number;
  createdAt: Date;
}

class EmbeddingMigrator {
  private mongoClient: MongoClient;
  private db: Db;
  private collection: Collection<EmbeddingDocument>;

  constructor(mongoUrl: string = 'mongodb://localhost:27017', dbName: string = 'unloan_vectors') {
    this.mongoClient = new MongoClient(mongoUrl);
    this.db = this.mongoClient.db(dbName);
    this.collection = this.db.collection('embeddings');
  }

  async connect() {
    await this.mongoClient.connect();
    console.log('✅ Connected to MongoDB');
  }

  async disconnect() {
    await this.mongoClient.close();
    console.log('✅ Disconnected from MongoDB');
  }

  async getCollectionCount(): Promise<number> {
    return await this.collection.estimatedDocumentCount();
  }

  async dropCollection(): Promise<void> {
    await this.collection.drop();
  }

  async createVectorSearchIndex() {
    try {
      // Create vector search index for Atlas Search (if using MongoDB Atlas)
      // This will fail on local MongoDB but that's expected
      await this.collection.createIndex(
        { vector: "2dsphere" },
        { name: "vector_index" }
      );
      console.log('✅ Created 2dsphere index for vector field');
    } catch (error) {
      console.log('ℹ️  2dsphere index creation skipped (local MongoDB)');
    }

    // Create text indexes for content search
    await this.collection.createIndex(
      { content: "text", title: "text" },
      { name: "text_search_index" }
    );
    console.log('✅ Created text search index');

    // Create compound indexes for filtering
    await this.collection.createIndex({ pageId: 1, chunkIndex: 1 }, { name: "page_chunk_index" });
    await this.collection.createIndex({ url: 1 }, { name: "url_index" });
    
    console.log('✅ Created additional indexes');
  }

  async migrateEmbeddings() {
    console.log('🔄 Starting embedding migration...');
    
    // Get all embeddings with page data
    const embeddings = await prisma.embedding.findMany({
      include: {
        page: {
          select: {
            url: true,
            title: true
          }
        }
      }
    });

    console.log(`📊 Found ${embeddings.length} embeddings to migrate`);

    let processed = 0;
    const batchSize = 100;
    
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize);
      
      const documents: EmbeddingDocument[] = batch.map(embedding => {
        // Parse the vector from JSON string
        let vector: number[];
        try {
          vector = JSON.parse(embedding.vector);
        } catch (error) {
          console.error(`❌ Failed to parse vector for embedding ${embedding.id}:`, error);
          vector = [];
        }

        // Parse metadata if it exists
        let metadata = {};
        if (embedding.metadata) {
          try {
            metadata = JSON.parse(embedding.metadata);
          } catch (error) {
            console.warn(`⚠️  Failed to parse metadata for embedding ${embedding.id}`);
          }
        }

        return {
          pageId: embedding.pageId,
          url: embedding.page.url,
          title: embedding.page.title,
          content: embedding.content,
          vector: vector,
          metadata: metadata,
          chunkIndex: (metadata as any)?.chunkIndex || 0,
          createdAt: embedding.createdAt
        };
      });

      // Insert batch to MongoDB
      try {
        await this.collection.insertMany(documents, { ordered: false });
        processed += documents.length;
        console.log(`✅ Migrated batch ${Math.ceil((i + 1) / batchSize)} - ${processed}/${embeddings.length} embeddings`);
      } catch (error) {
        console.error(`❌ Failed to insert batch:`, error);
      }
    }

    console.log(`🎉 Migration completed! Processed ${processed}/${embeddings.length} embeddings`);
  }

  async getCollectionStats() {
    const count = await this.collection.countDocuments();
    const indexes = await this.collection.listIndexes().toArray();
    
    console.log('\n📈 Collection Statistics:');
    console.log(`Documents: ${count}`);
    console.log(`Indexes: ${indexes.length}`);
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Sample document
    const sample = await this.collection.findOne();
    if (sample) {
      console.log('\n📄 Sample Document:');
      console.log(`URL: ${sample.url}`);
      console.log(`Content length: ${sample.content.length}`);
      console.log(`Vector dimensions: ${sample.vector.length}`);
      console.log(`Metadata: ${JSON.stringify(sample.metadata)}`);
    }
  }

  async testVectorSimilaritySearch(queryText: string = "home loan features") {
    console.log(`\n🔍 Testing similarity search for: "${queryText}"`);
    
    // Simple text search (since we don't have vector search on local MongoDB)
    const results = await this.collection
      .find(
        { $text: { $search: queryText } },
        { projection: { score: { $meta: "textScore" } } }
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .toArray();

    console.log(`Found ${results.length} results:`);
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title || 'Untitled'} (Score: ${(result as any).score?.toFixed(3)})`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Content: ${result.content.substring(0, 150)}...`);
      console.log('');
    });
  }
}

async function main() {
  const migrator = new EmbeddingMigrator();
  
  try {
    await migrator.connect();
    
    // Check if collection already has data
    const existingCount = await migrator.getCollectionCount();
    if (existingCount > 0) {
      console.log(`⚠️  Collection already contains ${existingCount} documents`);
      const answer = process.argv.includes('--force') ? 'y' : 
        await new Promise<string>((resolve) => {
          process.stdout.write('Drop existing collection and re-migrate? (y/N): ');
          process.stdin.once('data', (data) => resolve(data.toString().trim()));
        });
      
      if (answer.toLowerCase() === 'y') {
        await migrator.dropCollection();
        console.log('🗑️  Dropped existing collection');
      } else {
        console.log('✋ Migration cancelled');
        return;
      }
    }
    
    await migrator.createVectorSearchIndex();
    await migrator.migrateEmbeddings();
    await migrator.getCollectionStats();
    await migrator.testVectorSimilaritySearch();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await migrator.disconnect();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { EmbeddingMigrator };