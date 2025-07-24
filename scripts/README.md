# Scripts Directory

This directory contains utility scripts for maintaining and operating the Unloan RAG (Retrieval-Augmented Generation) system.

## Core Scripts

### `vector-search.ts` ⭐ **Required for App**
- **Purpose**: Provides vector similarity search for the RAG system
- **Used by**: `/lib/rag.ts` - powers the chat functionality
- **Features**: Vector search, text search, hybrid search
- **Database**: Remote MongoDB Atlas
- **Test**: `npx tsx scripts/vector-search.ts "home loan features"`

### `scraper.ts` 🔄 **Content Updates**
- **Purpose**: Scrapes content from unloan.com.au to keep knowledge base current
- **Usage**: `npx tsx scripts/scraper.ts`
- **Features**: Sitemap parsing, rate limiting (15 pages/min), error handling
- **Output**: Updates `Page` collection in MongoDB

### `generate-embeddings.ts` 🔄 **Content Processing**
- **Purpose**: Generates vector embeddings for scraped content
- **Usage**: `npx tsx scripts/generate-embeddings.ts`
- **Features**: Chunking, rate limiting, retry logic
- **Output**: Populates `Embedding` collection in MongoDB
- **API**: Uses Google's text-embedding-004 model

### `setup.ts` 🛠️ **System Verification**
- **Purpose**: Verifies system configuration and database connectivity
- **Usage**: `npx tsx scripts/setup.ts`
- **Checks**: Database connection, environment variables, data integrity

## Workflow

1. **Initial Setup**: Run `setup.ts` to verify configuration
2. **Content Updates**: Run `scraper.ts` to fetch latest content
3. **Embedding Generation**: Run `generate-embeddings.ts` to process new content
4. **App Usage**: `vector-search.ts/js` automatically used by the application

## Environment Variables Required

- `MONGODB_URL`: MongoDB Atlas connection string
- `GOOGLE_API_KEY`: Google AI API key for embeddings

## Database Collections

- `Page`: Scraped web page content
- `Embedding`: Vector embeddings for search
- `User`, `Conversation`, `Message`: Application data