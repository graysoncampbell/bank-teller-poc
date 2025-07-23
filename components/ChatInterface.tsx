'use client';

import { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  email: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    url: string;
    title: string;
    content: string;
    similarity: number;
  }>;
  createdAt: string;
  isLastInGroup?: boolean;
}

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

export default function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversation();
  }, []);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: getAuthHeaders(),
      });
      const conversation = await response.json();
      
      if (conversation.messages) {
        setMessages(conversation.messages.map((msg: any) => ({
          ...msg,
          sources: msg.sources ? JSON.parse(msg.sources) : undefined
        })));
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setError('');
    setLoading(true);
    const userMessage = input;
    setInput('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: userMessage }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message');
      }

      // Split AI response into separate messages for each paragraph
      const aiResponse = data.aiMessage.content;
      const paragraphs = aiResponse.split('\n\n').filter((p: string) => p.trim().length > 0);
      
      const aiMessages = paragraphs.map((paragraph: string, index: number) => ({
        ...data.aiMessage,
        id: `${data.aiMessage.id}-${index}`,
        content: paragraph.trim(),
        sources: undefined, // Sources will be handled separately
        isLastInGroup: index === paragraphs.length - 1
      }));

      // Add sources message if there are sources
      const allMessages = [data.userMessage, ...aiMessages];
      if (data.aiMessage.sources && data.aiMessage.sources.length > 0) {
        const sourcesMessage = {
          ...data.aiMessage,
          id: `${data.aiMessage.id}-sources`,
          content: "Here are a couple articles from our website",
          sources: data.aiMessage.sources,
          isLastInGroup: true
        };
        allMessages.push(sourcesMessage);
      }

      setMessages(prev => [...prev, ...allMessages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="chat-container" style={{ height: 'calc(100vh - 40px)' }}>
        <div className="main-chat" style={{ width: '100%' }}>
          <div className="chat-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Unloan Q&A Assistant</h2>
                <p>Ask me anything about home loans and Unloan's services</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '14px', color: '#6c757d' }}>{user.email}</span>
                <button onClick={onLogout} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 40px', color: '#666' }}>
                <h3 style={{ 
                  fontFamily: 'Inter, sans-serif', 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: '#000000', 
                  marginBottom: '12px',
                  letterSpacing: '-0.01em'
                }}>
                  Welcome to Unloan Q&A!
                </h3>
                <p style={{ 
                  fontFamily: 'Inter, sans-serif', 
                  fontSize: '14px', 
                  lineHeight: '1.5',
                  marginBottom: '24px'
                }}>
                  Ask me anything about home loans, interest rates, offset accounts, or any other Unloan services.
                </p>
                <div style={{ fontSize: '14px' }}>
                  <strong style={{ 
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Try asking:
                  </strong>
                  <ul style={{ 
                    listStyle: 'none', 
                    marginTop: '16px',
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: '1.6'
                  }}>
                    <li style={{ marginBottom: '8px' }}>• "What are offset accounts and how do they work?"</li>
                    <li style={{ marginBottom: '8px' }}>• "What is LMI and when do I need it?"</li>
                    <li style={{ marginBottom: '8px' }}>• "How does LVR affect my interest rate?"</li>
                    <li style={{ marginBottom: '8px' }}>• "What are the benefits of Unloan's home loan?"</li>
                  </ul>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`message ${message.role}`}>
                  <div>{message.content}</div>
                </div>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="source-carousel">
                    <div className="source-cards">
                      {message.sources.map((source, i) => (
                        <div
                          key={i}
                          className={`source-card ${i % 2 === 0 ? 'source-card-dark' : 'source-card-light'}`}
                          onClick={() => window.open(source.url, '_blank')}
                        >
                          <div className="source-card-title">
                            {source.title.replace(/^Unloan \| /, '')}
                          </div>
                          <div className="source-card-excerpt">
                            {source.content}
                          </div>
                          <div className="source-card-footer">
                            <span>unloan.com.au</span>
                            <span className="source-card-similarity">
                              {(source.similarity * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="message assistant">
                <div>Thinking...</div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            {error && <div className="error">{error}</div>}
            <form onSubmit={sendMessage} className="input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about home loans, rates, features..."
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}