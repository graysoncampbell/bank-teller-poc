# Mortgage Lending Conversational Agent POC - Project Plan

## Overview
Build a conversational AI agent for a digital mortgage lending company that acts as an online relationship manager. The agent will use managed RAG (Retrieval-Augmented Generation) to answer customer questions using scraped website content, helping alleviate customer anxiety about mortgage applications without impacting their credit or formal application process.

## Technical Architecture

### Core Stack
- **Frontend**: Next.js 14+ with App Router
- **Backend**: GraphQL API with Apollo Server
- **Database**: MongoDB with vector embeddings
- **Authentication**: Passwordless auth (similar to Outrun pattern)
- **AI**: Claude API for conversational responses
- **RAG**: Vector search with embeddings for knowledge retrieval

### Key Features
1. **Persistent Conversation Threads**: Long-running conversations with customers
2. **Managed RAG**: Vectorized knowledge base from scraped website content
3. **Context-Aware Responses**: AI agent that understands mortgage lending context
4. **Non-Application Disclaimer**: Clear messaging that conversations don't impact credit/applications

## Implementation Phases

### Phase 1: Foundation Setup
- [ ] **Project Structure**: Next.js project with GraphQL setup
- [ ] **Database Setup**: MongoDB with vector storage capabilities
- [ ] **Authentication**: Passwordless auth system (email-based)
- [ ] **Basic UI**: Simple chat interface with Tailwind CSS

### Phase 2: Content & RAG System
- [ ] **Website Scraping**: Automated scraping of mortgage lender website
- [ ] **Content Processing**: Clean, chunk, and prepare content for embeddings
- [ ] **Vector Database**: Store embeddings in MongoDB with metadata
- [ ] **RAG Pipeline**: Retrieval system for relevant context

### Phase 3: AI Integration
- [ ] **Claude API Setup**: Integration with Anthropic's Claude API
- [ ] **Conversation Management**: Thread persistence and context handling
- [ ] **RAG Integration**: Combine retrieved context with Claude responses
- [ ] **Response Optimization**: Fine-tune for mortgage lending domain

### Phase 4: User Experience
- [ ] **Chat Interface**: Real-time chat with typing indicators
- [ ] **Conversation History**: Persistent threads per user
- [ ] **Disclaimer System**: Clear non-application messaging
- [ ] **Mobile Responsive**: Ensure mobile-friendly experience

## Technical Implementation Details

### Data Models

#### User
```javascript
{
  _id: ObjectId,
  email: string,
  createdAt: Date,
  lastActive: Date
}
```

#### Conversation Thread
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  messages: [MessageSchema],
  createdAt: Date,
  updatedAt: Date
}
```

#### Knowledge Base Entry
```javascript
{
  _id: ObjectId,
  content: string,
  embedding: [number], // Vector embedding
  metadata: {
    url: string,
    title: string,
    section: string,
    pageType: string
  },
  createdAt: Date
}
```

### GraphQL Schema

#### Core Operations
```graphql
type Query {
  getConversations(userId: ID!): [Conversation!]!
  getConversation(id: ID!): Conversation
  searchKnowledge(query: String!): [KnowledgeEntry!]!
}

type Mutation {
  sendMessage(conversationId: ID!, content: String!): Message!
  createConversation(userId: ID!): Conversation!
  authenticateUser(email: String!): AuthResponse!
  verifyToken(token: String!): User
}
```

### RAG Implementation Strategy

1. **Content Scraping**:
   - Use Puppeteer for dynamic content
   - Target key pages: rates, requirements, FAQ, application process
   - Extract structured content with metadata

2. **Embedding Generation**:
   - Use OpenAI's text-embedding-ada-002 for consistency
   - Chunk content into 500-800 token segments
   - Store with rich metadata for filtering

3. **Retrieval Strategy**:
   - Semantic search using vector similarity
   - Hybrid approach: combine vector + keyword search
   - Context ranking based on relevance scores

4. **Response Generation**:
   - Provide retrieved context to Claude
   - Use structured prompts for mortgage domain
   - Include disclaimer messaging in system prompts

## File Structure
```
mortgage-agent-poc/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/graphql/        # GraphQL endpoint
│   │   ├── auth/               # Authentication pages
│   │   ├── chat/               # Chat interface
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── Chat/               # Chat UI components
│   │   ├── Auth/               # Auth components
│   │   └── Layout/             # Layout components
│   ├── lib/                    # Utilities
│   │   ├── mongodb.js          # Database connection
│   │   ├── claude.js           # Claude API client
│   │   ├── embeddings.js       # Embedding utilities
│   │   └── auth.js             # Auth utilities
│   ├── graphql/                # GraphQL schema & resolvers
│   │   ├── schema.js           # Type definitions
│   │   ├── resolvers/          # Query/mutation resolvers
│   │   └── context.js          # GraphQL context
│   └── scrapers/               # Website scraping scripts
│       ├── scraper.js          # Main scraping logic
│       └── processors.js       # Content processing
├── scripts/                    # Utility scripts
│   ├── setup-db.js            # Database initialization
│   └── scrape-content.js      # Content scraping runner
└── docs/                      # Documentation
    └── API.md                 # API documentation
```

## Development Timeline

### Week 1: Foundation
- Set up Next.js project with GraphQL
- Implement passwordless authentication
- Create basic chat UI
- Set up MongoDB connection

### Week 2: Content & RAG
- Build website scraping system
- Process and embed content
- Set up vector search in MongoDB
- Test retrieval accuracy

### Week 3: AI Integration
- Integrate Claude API
- Implement conversation management
- Build RAG pipeline
- Test end-to-end flow

### Week 4: Refinement
- Optimize response quality
- Improve UI/UX
- Add error handling
- Performance testing

## Success Metrics
1. **Response Accuracy**: Agent provides relevant, helpful mortgage information
2. **User Engagement**: Users continue conversations and ask follow-up questions
3. **Conversion Intent**: Users express interest in proceeding with applications
4. **Technical Performance**: Sub-2s response times, 99%+ uptime

## Risk Mitigation
- **Content Freshness**: Implement automated scraping schedules
- **API Rate Limits**: Implement proper caching and rate limiting
- **Data Privacy**: Ensure secure handling of user conversations
- **Response Quality**: Implement feedback mechanisms and monitoring

## Next Steps for Review
1. **Target Website**: Which mortgage lender website should we scrape?
2. **Authentication Method**: Confirm passwordless email approach
3. **Deployment Target**: Local development vs cloud deployment?
4. **Claude Model**: Which Claude model version (Haiku, Sonnet, Opus)?
5. **Vector Database**: MongoDB vs dedicated vector DB (Pinecone, Weaviate)?

Please review this plan and provide feedback on priorities, technical choices, or any modifications you'd like to make before we begin implementation.