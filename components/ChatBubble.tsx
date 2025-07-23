'use client';

import { useState } from 'react';

interface ChatBubbleProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
  showInitialMessage?: boolean;
}

export default function ChatBubble({ onClick, isOpen, unreadCount = 0, showInitialMessage = false }: ChatBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Chat bubble button */}
      <div 
        className={`chat-bubble ${isOpen ? 'chat-bubble-open' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="chat-bubble-avatar">
          <img 
            src="https://cdn.unloan.com.au/webflow/icon-head_woman.avif" 
            alt="Jane - Unloan Banker"
          />
          {!isOpen && (
            <div className="chat-bubble-status-indicator"></div>
          )}
        </div>
        
        {/* Unread count badge */}
        {!isOpen && unreadCount > 0 && (
          <div className="chat-bubble-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
        
      </div>

      {/* Initial message bubble */}
      {!isOpen && showInitialMessage && (
        <div className="chat-initial-message">
          <div className="chat-initial-message-content">
            <div className="chat-initial-message-title">Chat with Jane</div>
            <div className="chat-initial-message-subtitle">Ask about home loans</div>
          </div>
          <div className="chat-initial-message-arrow"></div>
        </div>
      )}

      {/* Tooltip */}
      {!isOpen && !showInitialMessage && isHovered && (
        <div className="chat-bubble-tooltip">
          <div className="chat-bubble-tooltip-content">
            <div className="chat-bubble-tooltip-title">Chat with Jane</div>
            <div className="chat-bubble-tooltip-subtitle">Ask about home loans</div>
          </div>
          <div className="chat-bubble-tooltip-arrow"></div>
        </div>
      )}
    </>
  );
}