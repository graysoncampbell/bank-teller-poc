# Unloan Content Scraper & Q&A App

A TypeScript-based web scraper that extracts content from unloan.com.au, generates embeddings using Google's Gemini API, and provides a Next.js chat interface for asking questions about home loans with vector-based search.

## Features

### Data Pipeline
- **Content Scraping**: Extracts all content from unloan.com.au sitemap (250+ URLs)
- **Embedding Generation**: Uses Google Gemini text-embedding-004 model
- **Vector Storage**: MongoDB with vector search capabilities
- **RAG System**: Retrieval-Augmented Generation for accurate responses

### Web Application
- **Email Authentication**: Simple registration/login system
- **Conversation Threads**: Persistent chat history
- **Vector Search**: Hybrid search combining vector similarity and text search
- **Source Attribution**: Shows which Unloan pages were used to generate responses
- **Real-time Chat**: Ask questions and get AI responses with context

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env` file:
```bash
GOOGLE_API_KEY=your_gemini_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

### 3. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 4. Start MongoDB
Ensure MongoDB is running on localhost:27017

## Usage

### Data Pipeline (One-time setup)

#### Phase 1: Scrape Content
```bash
npm run scrape
```
- Fetches sitemap from unloan.com.au (250 URLs)
- Scrapes 4 pages per minute (throttled to avoid rate limiting)
- Stores raw HTML and processed content

#### Phase 2: Generate Embeddings
```bash
npm run generate-embeddings
```
- Processes content through Gemini's text-embedding-004 model
- Splits content into chunks for better embeddings
- Stores 768-dimensional vectors in SQLite

#### Phase 3: Migrate to MongoDB
```bash
npm run migrate-to-mongodb
```
- Transfers all embeddings from SQLite to MongoDB
- Creates vector search indexes
- Sets up production-ready vector store

### Web Application

#### Start the App
```bash
npm run dev
```

#### Access the App
1. Open http://localhost:3000
2. Register with email/password or login
3. Create a new conversation
4. Ask questions about home loans, rates, features, etc.

#### Example Questions
- "What are offset accounts and how do they work?"
- "What is LMI and when do I need it?"
- "How does LVR affect my interest rate?"
- "What are the benefits of Unloan's home loan?"

## Architecture

### Backend
- **Next.js API Routes**: RESTful endpoints for auth and chat
- **Prisma ORM**: Database management (SQLite for development)
- **MongoDB**: Vector storage with hybrid search
- **Google Gemini**: Embedding generation and text completion
- **JWT Authentication**: Secure user sessions

### Frontend
- **Next.js 15**: App Router with React 19
- **TypeScript**: Full type safety
- **CSS**: Simple, responsive design
- **Real-time Updates**: Conversation persistence

### Data Flow
1. User asks question
2. Generate embedding for question using Gemini
3. Search MongoDB for similar content (vector + text search)
4. Use top results as context for Gemini text generation
5. Return answer with source attribution
6. Save conversation to database

## Database Schema

### SQLite (Development)
- `Page`: Scraped URLs, titles, content
- `Embedding`: Vector embeddings with metadata
- `User`: Authentication
- `Conversation`: Chat sessions
- `Message`: Individual messages with sources

### MongoDB (Vector Store)
- `embeddings`: Vector search collection with indexes
- Hybrid search: 2dsphere + text + compound indexes

## Scripts

- `npm run scrape` - Scrape Unloan website content
- `npm run generate-embeddings` - Generate vector embeddings
- `npm run migrate-to-mongodb` - Transfer to MongoDB
- `npm run vector-search "query"` - Test search functionality
- `npm run dev` - Start development server
- `npm run build` - Build for production

## Technical Details

### Vector Search
- **Model**: Google Gemini text-embedding-004
- **Dimensions**: 768
- **Similarity**: Cosine similarity
- **Hybrid Search**: Vector (70%) + Text (30%) weighted scoring

### Rate Limiting
- **Scraping**: 4 pages/minute with IP ban detection
- **Embeddings**: Respects Google API rate limits
- **Resume Capability**: Can restart after interruption

### Security
- JWT tokens with 7-day expiration
- Password hashing with bcrypt
- Environment variable protection
- CORS and validation on all endpoints

## Production Deployment

1. Set up MongoDB Atlas or production MongoDB instance
2. Update connection strings in environment variables
3. Build and deploy Next.js app
4. Ensure GOOGLE_API_KEY is set in production environment
5. Run migration script to populate production vector store

## Troubleshooting

### Rate Limiting
If you get rate limited during scraping:
1. Change your IP address/connection
2. Restart the scraper - it resumes from where it left off

### Missing Embeddings
If some pages don't have embeddings:
```bash
npm run generate-embeddings
```
The script automatically skips existing embeddings.

### Vector Search Not Working
Ensure MongoDB is running and the migration completed:
```bash
npm run migrate-to-mongodb --force
```