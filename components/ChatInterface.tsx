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
  isAnimating?: boolean;
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
  const [isTyping, setIsTyping] = useState(false);
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
        const processedMessages: Message[] = [];
        
        conversation.messages.forEach((msg: any) => {
          if (msg.role === 'user') {
            // User messages don't need splitting
            processedMessages.push({
              ...msg,
              sources: msg.sources ? JSON.parse(msg.sources) : undefined
            });
          } else if (msg.role === 'assistant') {
            // Check if this message has sources
            const sources = msg.sources ? JSON.parse(msg.sources) : undefined;
            
            if (sources && sources.length > 0) {
              // This is a sources message, keep it as is
              if (msg.content === "Here are a couple articles from our website") {
                processedMessages.push({
                  ...msg,
                  sources: sources
                });
              } else {
                // This is a regular AI message that needs splitting
                const paragraphs = msg.content.split('\n\n').filter((p: string) => p.trim().length > 0);
                
                // Add split paragraphs
                paragraphs.forEach((paragraph: string, index: number) => {
                  processedMessages.push({
                    ...msg,
                    id: `${msg.id}-${index}`,
                    content: paragraph.trim(),
                    sources: undefined,
                    isLastInGroup: index === paragraphs.length - 1
                  });
                });
                
                // Add sources message
                processedMessages.push({
                  ...msg,
                  id: `${msg.id}-sources`,
                  content: "Here are a couple articles from our website",
                  sources: sources,
                  isLastInGroup: true
                });
              }
            } else {
              // Regular AI message without sources, split it
              const paragraphs = msg.content.split('\n\n').filter((p: string) => p.trim().length > 0);
              
              paragraphs.forEach((paragraph: string, index: number) => {
                processedMessages.push({
                  ...msg,
                  id: `${msg.id}-${index}`,
                  content: paragraph.trim(),
                  sources: undefined,
                  isLastInGroup: index === paragraphs.length - 1
                });
              });
            }
          }
        });
        
        setMessages(processedMessages);
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
    }
  };

  const animateMessages = async (messagesToAnimate: Message[]) => {
    for (let i = 0; i < messagesToAnimate.length; i++) {
      const message = messagesToAnimate[i];
      
      // Add typing indicator for assistant messages (except user message)
      if (message.role === 'assistant' && i > 0) {
        setIsTyping(true);
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600)); // Random delay between 800-1400ms
        setIsTyping(false);
      }
      
      // Add the message with animation
      setMessages(prev => [...prev, { ...message, isAnimating: true }]);
      
      // Brief pause after each message appears
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Remove animation class
      setMessages(prev => 
        prev.map(msg => 
          msg.id === message.id ? { ...msg, isAnimating: false } : msg
        )
      );
      
      // Small delay before next message
      if (i < messagesToAnimate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setError('');
    setLoading(true);
    setIsTyping(true);
    const userMessage = input;
    setInput('');

    // Add user message immediately
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: userMessage,
      createdAt: new Date().toISOString(),
      isAnimating: true
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Remove animation from user message
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMsg.id ? { ...msg, isAnimating: false } : msg
        )
      );
    }, 300);

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

      setIsTyping(false);

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
      const messagesToAnimate = [...aiMessages];
      if (data.aiMessage.sources && data.aiMessage.sources.length > 0) {
        const sourcesMessage = {
          ...data.aiMessage,
          id: `${data.aiMessage.id}-sources`,
          content: "Here are a couple articles from our website",
          sources: data.aiMessage.sources,
          isLastInGroup: true
        };
        messagesToAnimate.push(sourcesMessage);
      }

      // Animate messages one by one
      await animateMessages(messagesToAnimate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsTyping(false);
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
                <div className={`message ${message.role} ${message.isAnimating ? 'message-entering' : ''}`}>
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
            
            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
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