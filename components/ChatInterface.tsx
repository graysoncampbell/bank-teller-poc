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

      const aiMessageWithSources = {
        ...data.aiMessage,
        sources: data.aiMessage.sources
      };

      setMessages(prev => [...prev, data.userMessage, aiMessageWithSources]);
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
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <h3>Welcome to Unloan Q&A!</h3>
                <p>Ask me anything about home loans, interest rates, offset accounts, or any other Unloan services.</p>
                <div style={{ marginTop: '20px', fontSize: '14px' }}>
                  <strong>Try asking:</strong>
                  <ul style={{ listStyle: 'none', marginTop: '10px' }}>
                    <li>• "What are offset accounts and how do they work?"</li>
                    <li>• "What is LMI and when do I need it?"</li>
                    <li>• "How does LVR affect my interest rate?"</li>
                    <li>• "What are the benefits of Unloan's home loan?"</li>
                  </ul>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-role">{message.role}</div>
                <div>{message.content}</div>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="sources">
                    <strong>Sources:</strong>
                    {message.sources.map((source, i) => (
                      <div key={i} className="source">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-url">
                          {source.title}
                        </a>
                        <div style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
                          Similarity: {(source.similarity * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {loading && (
              <div className="message assistant">
                <div className="message-role">assistant</div>
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