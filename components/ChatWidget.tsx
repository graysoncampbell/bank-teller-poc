'use client';

import { useState } from 'react';
import ChatBubble from './ChatBubble';
import ChatInterface from './ChatInterface';

interface User {
  id: string;
  email: string;
}

interface ChatWidgetProps {
  user: User;
  onLogout: () => void;
}

export default function ChatWidget({ user, onLogout }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenClicked, setHasBeenClicked] = useState(false);

  const handleToggle = () => {
    if (!hasBeenClicked) {
      setHasBeenClicked(true);
    }
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating logout button */}
      <button 
        onClick={onLogout}
        className="floating-logout-button"
        title="Logout"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M10 10L14 6L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 6H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Logout
      </button>

      <ChatBubble 
        onClick={handleToggle}
        isOpen={isOpen}
        unreadCount={0}
        showInitialMessage={!hasBeenClicked}
      />
      <ChatInterface 
        user={user}
        onLogout={onLogout}
        isOpen={isOpen}
        onClose={handleClose}
      />
    </>
  );
}