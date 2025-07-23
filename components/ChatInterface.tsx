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
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatInterface({ user, onLogout, isOpen, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [shouldShowWelcomeBack, setShouldShowWelcomeBack] = useState(false);
  const [hasShownInitialWelcome, setHasShownInitialWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const welcomeShownRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversation();
  }, []);

  const showInitialWelcome = async () => {
    // Prevent showing initial welcome multiple times using ref (survives re-renders)
    if (welcomeShownRef.current || hasShownInitialWelcome || messages.length > 0) return;
    
    welcomeShownRef.current = true;
    setHasShownInitialWelcome(true);
    
    // Clear any existing messages first
    setMessages([]);
    
    const welcomeMessages = [
      'Hi there! I\'m Jane 👋',
      'I\'m here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan!',
      'Try asking:',
      '"What are offset accounts and how do they work?"',
      '"What is LMI and when do I need it?"',
      '"How does LVR affect my interest rate?"',
      '"What are the benefits of Unloan\'s home loan?"'
    ];
    
    const timestamp = Date.now();
    const messagesToAnimate: Message[] = welcomeMessages.map((content, index) => ({
      id: `initial-welcome-${timestamp}-${index}`,
      role: 'assistant' as const,
      content,
      createdAt: new Date().toISOString(),
      isLastInGroup: index === welcomeMessages.length - 1
    }));
    
    // Small delay then animate messages
    setTimeout(async () => {
      await animateMessages(messagesToAnimate);
    }, 500);
  };

  const checkForWelcomeBack = (messages: Message[]) => {
    if (messages.length === 0) return false;
    
    // Check if there are recent welcome messages (within last 5 messages)
    const recentMessages = messages.slice(-5);
    const hasRecentWelcome = recentMessages.some(msg => 
      msg.role === 'assistant' && 
      (msg.content.includes('Hi there! I\'m Jane') || 
       msg.content.includes('Welcome back!') ||
       msg.content.includes('What can I help you with today?'))
    );
    
    if (hasRecentWelcome) {
      return false; // Don't show welcome back if we already have recent welcome messages
    }
    
    const lastMessageTimestamp = localStorage.getItem(`lastMessage_${user.id}`);
    const currentTime = Date.now();
    
    if (lastMessageTimestamp) {
      const timeDiff = currentTime - parseInt(lastMessageTimestamp);
      const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      return timeDiff > fifteenMinutes;
    }
    
    return false;
  };

  const showWelcomeBackMessage = async () => {
    setShouldShowWelcomeBack(false);
    
    const welcomeMessages = [
      'Welcome back! 👋',
      'What can I help you with today?'
    ];
    
    const messagesToAnimate: Message[] = welcomeMessages.map((content, index) => ({
      id: `welcome-back-${Date.now()}-${index}`,
      role: 'assistant' as const,
      content,
      createdAt: new Date().toISOString(),
      isLastInGroup: index === welcomeMessages.length - 1
    }));
    
    // Animate messages one by one like regular AI responses
    await animateMessages(messagesToAnimate);
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const fetchConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      
      const conversation = await response.json();
      
      if (conversation.messages && conversation.messages.length > 0) {
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
        setHasShownInitialWelcome(true); // Mark that we have existing messages
        welcomeShownRef.current = true; // Prevent welcome from showing
        
        // Check if we should show welcome back message
        if (checkForWelcomeBack(processedMessages)) {
          setTimeout(() => {
            showWelcomeBackMessage();
          }, 1500); // Small delay to let messages load first
        }
      } else {
        // No messages exist, show initial welcome (only if not already shown)
        if (!welcomeShownRef.current && !hasShownInitialWelcome) {
          showInitialWelcome();
        }
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
      // If there's an error fetching, show initial welcome (only if not already shown)
      if (!welcomeShownRef.current && !hasShownInitialWelcome) {
        showInitialWelcome();
      }
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
      
      // Store timestamp of last message for welcome back feature
      localStorage.setItem(`lastMessage_${user.id}`, Date.now().toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsTyping(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-window-overlay">
      <div className="chat-window">
        <div className="chat-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="profile-avatar">
                <img 
                  src="https://cdn.unloan.com.au/webflow/icon-head_woman.avif" 
                  alt="Jane"
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    objectFit: 'cover' 
                  }}
                />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600', margin: '0', lineHeight: '1.2' }}>
                  Jane
                </h2>
                <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0 0', lineHeight: '1.2' }}>
                  Unloan Banker
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={onClose}
                className="chat-close-button"
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="messages">            
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
                          <span className="source-card-similarity">
                            {source.similarity >= 0.7 ? 'Must read' : 'Good to know'}
                          </span>
                          <div className="source-card-arrow">
                            <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.5659 7.30591C17.5659 7.63916 17.4207 7.9895 17.1899 8.22021L11.6187 13.7744C11.3623 14.0308 11.0547 14.1589 10.7556 14.1589C10.0293 14.1589 9.53369 13.6548 9.53369 12.9883C9.53369 12.6208 9.69604 12.3218 9.92676 12.0996L11.8408 10.1855L13.7378 8.44238L11.8665 8.54492H2.21069C1.44165 8.54492 0.928955 8.04077 0.928955 7.30591C0.928955 6.5625 1.44165 6.06689 2.21069 6.06689H11.8665L13.7292 6.16943L11.8408 4.42627L9.92676 2.50366C9.69604 2.28149 9.53369 1.99097 9.53369 1.61499C9.53369 0.948486 10.0293 0.444336 10.7556 0.444336C11.0547 0.444336 11.3623 0.57251 11.6272 0.837402L17.1899 6.3916C17.4207 6.62231 17.5659 6.97266 17.5659 7.30591Z" fill="currentColor"></path>
                            </svg>
                          </div>
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
  );
}