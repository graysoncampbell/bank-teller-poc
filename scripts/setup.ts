#!/usr/bin/env tsx

/**
 * Setup Verification Script
 * 
 * This script verifies that the application environment is properly configured.
 * 
 * Usage: npx tsx scripts/setup.ts
 * 
 * Checks:
 * - Database connection to MongoDB Atlas
 * - Required environment variables (GOOGLE_API_KEY, MONGODB_URL)
 * - Database collections and sample data
 * - Overall system readiness
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSetup() {
  console.log('🔧 Checking setup...\n');
  
  // Check database connection
  try {
    await prisma.$connect();
    console.log('✅ Database connection: OK');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
  
  // Check if tables exist
  try {
    const pageCount = await prisma.page.count();
    const embeddingCount = await prisma.embedding.count();
    console.log(`✅ Database tables: OK (${pageCount} pages, ${embeddingCount} embeddings)`);
  } catch (error) {
    console.error('❌ Database tables not found. Run: npx prisma db push');
    return false;
  }
  
  // Check Google API key
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY environment variable not set');
    console.log('   Set it with: export GOOGLE_API_KEY=your_api_key_here');
    console.log('   Get your key from: https://makersuite.google.com/app/apikey');
    return false;
  } else {
    console.log('✅ Google API key: Set');
  }
  
  console.log('\n🎉 Setup complete! You can now run:');
  console.log('   npm run scrape           # Phase 1: Scrape content');
  console.log('   npm run generate-embeddings  # Phase 2: Generate embeddings');
  
  return true;
}

async function showStatus() {
  try {
    const totalPages = await prisma.page.count();
    const scrapedPages = await prisma.page.count({ where: { scraped: true } });
    const pagesWithEmbeddings = await prisma.page.count({
      where: { embeddings: { some: {} } }
    });
    const totalEmbeddings = await prisma.embedding.count();
    
    console.log('\n📊 Current Status:');
    console.log(`   Pages in database: ${totalPages}`);
    console.log(`   Pages scraped: ${scrapedPages}/${totalPages}`);
    console.log(`   Pages with embeddings: ${pagesWithEmbeddings}/${scrapedPages}`);
    console.log(`   Total embeddings: ${totalEmbeddings}`);
    
    if (scrapedPages === 0) {
      console.log('\n➡️  Next step: Run scraper with "npm run scrape"');
    } else if (pagesWithEmbeddings < scrapedPages) {
      console.log('\n➡️  Next step: Generate embeddings with "npm run generate-embeddings"');
    } else {
      console.log('\n🎉 All done! Content scraped and embeddings generated.');
    }
    
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

async function main() {
  const setupOk = await checkSetup();
  if (setupOk) {
    await showStatus();
  }
  
  await prisma.$disconnect();
}

if (require.main === module) {
  main();
}