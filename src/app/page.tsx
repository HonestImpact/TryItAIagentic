'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('trust-recovery-ui');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  challenged?: boolean;
}

interface BeautyCheck {
  passed: boolean;
  badges: string[];
}

interface Artifact {
  title: string;
  content: string;
  agent?: string;
  beautyCheck?: BeautyCheck;
}

interface SessionArtifact {
  title: string;
  content: string;
  timestamp: number;
  agent: string;
  id: string;
  beautyCheck?: BeautyCheck;
}

// Memoized individual message component for performance
const MessageComponent = React.memo(({
  message,
  index,
  onChallenge,
  isAlreadyChallenged,
  isLoading,
  interfaceLocked
}: {
  message: Message;
  index: number;
  onChallenge: (index: number) => void;
  isAlreadyChallenged: boolean;
  isLoading: boolean;
  interfaceLocked: boolean;
}) => {
  const handleChallenge = useCallback(() => onChallenge(index), [onChallenge, index]);

  const time = new Date(message.timestamp!).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <div className="message">
      {message.role === 'user' ? (
        <>
          <div className="message-header">
            <div className="message-avatar user-avatar">Y</div>
            <div className="message-author">You</div>
            <div className="message-time">{time}</div>
          </div>
          <div className="message-content user-message-content">{message.content}</div>
        </>
      ) : (
        <>
          <div className="message-header">
            <div className="message-avatar ai-avatar">N</div>
            <div className="message-author">Noah</div>
            <div className="message-time">{time}</div>
          </div>
          <div className="message-content">{message.content}</div>
          {!isAlreadyChallenged && !isLoading && !interfaceLocked && (
            <a
              href="#"
              className="challenge-link"
              onClick={(e) => { e.preventDefault(); handleChallenge(); }}
            >
              (challenge this?)
            </a>
          )}
          {isAlreadyChallenged && (
            <div className="text-xs text-green-400 mt-2">✓ Challenged</div>
          )}
        </>
      )}
    </div>
  );
});

MessageComponent.displayName = 'MessageComponent';

export default function TrustRecoveryProtocol() {
  // Trust Recovery Protocol state (preserved)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [sessionArtifacts, setSessionArtifacts] = useState<SessionArtifact[]>([]);
  const [skepticMode, setSkepticMode] = useState(false);
  const [trustLevel, setTrustLevel] = useState(15);
  const [challengedMessages, setChallengedMessages] = useState<Set<number>>(new Set());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [interfaceLocked, setInterfaceLocked] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('Noah');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const scrollTimeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      return () => clearTimeout(scrollTimeout);
    }
  }, [messages.length]);

  // Focus input on page load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Update trust dot color
  const getTrustColor = useCallback(() => {
    if (trustLevel < 40) return 'var(--trust-low)';
    if (trustLevel < 70) return 'var(--trust-med)';
    return 'var(--trust-high)';
  }, [trustLevel]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || interfaceLocked) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Hide welcome message on first send
    if (!hasStarted) {
      setHasStarted(true);
    }

    // Add user message
    const newMessages = [...messages, {
      role: 'user' as const,
      content: userMessage,
      timestamp: Date.now()
    }];
    setMessages(newMessages);

    try {
      // Check if this looks like a tool creation request
      const toolKeywords = ['calculator', 'timer', 'converter', 'form', 'tracker', 'tool', 'widget', 'app', 'create', 'build', 'make', 'search'];
      const isToolRequest = toolKeywords.some(keyword =>
        userMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      // Use non-streaming for tool creation to get proper truncation
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (!isToolRequest) {
        headers['x-streaming'] = 'true';
      }

      // Call our API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: newMessages,
          skepticMode: skepticMode
        }),
      });

      // Capture session ID from response headers for artifact logging
      const sessionIdFromResponse = response.headers.get('x-session-id');
      if (sessionIdFromResponse && !currentSessionId) {
        setCurrentSessionId(sessionIdFromResponse);
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle response based on type
      if (isToolRequest) {
        // Handle non-streaming JSON response for tool creation
        const data = await response.json();

        // Handle interface lockdown
        if (data.status === 'interface_locked') {
          setInterfaceLocked(true);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.content,
            timestamp: Date.now()
          }]);
          return;
        }

        // Update agent if provided
        if (data.agentStrategy?.selectedAgent) {
          const agentName = data.agentStrategy.selectedAgent.charAt(0).toUpperCase() +
                           data.agentStrategy.selectedAgent.slice(1);
          setCurrentAgent(agentName);
        }

        // Add the assistant message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          timestamp: Date.now()
        }]);

        // Handle artifact if present
        if (data.artifact) {
          logger.info('Tool artifact received', { title: data.artifact.title });
          setTimeout(() => {
            setArtifact({
              title: data.artifact.title,
              content: data.artifact.content,
              agent: data.agentStrategy?.selectedAgent || 'Noah',
              beautyCheck: data.artifact.beautyCheck
            });
          }, 800);
        }

        // Handle session artifacts for accumulated toolbox
        if (data.sessionArtifacts) {
          logger.info('Session artifacts received', { count: data.sessionArtifacts.length });
          setSessionArtifacts(data.sessionArtifacts);
        }

        // Adjust trust level
        if (data.content.toLowerCase().includes('uncertain') || data.content.toLowerCase().includes('not sure')) {
          setTrustLevel(prev => Math.min(100, prev + 5));
        }

      } else if (response.body) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        // Add placeholder message for streaming
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '',
          timestamp: Date.now()
        }]);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;

            // Update the last message with accumulated content
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedContent
              };
              return updated;
            });
          }
        } finally {
          reader.releaseLock();
        }

        // Adjust trust level based on response quality
        if (accumulatedContent.toLowerCase().includes('uncertain') || accumulatedContent.toLowerCase().includes('not sure')) {
          setTrustLevel(prev => Math.min(100, prev + 5));
        }

        // Check for artifacts after streaming completes
        try {
          if (currentSessionId || sessionIdFromResponse) {
            const sessionId = sessionIdFromResponse || currentSessionId;
            const artifactResponse = await fetch(`/api/artifacts?sessionId=${sessionId}`);
            if (artifactResponse.ok) {
              const artifactData = await artifactResponse.json();
              if (artifactData.artifact) {
                logger.info('Artifact received after streaming', { title: artifactData.artifact.title });
                setTimeout(() => {
                  setArtifact({
                    title: artifactData.artifact.title,
                    content: artifactData.artifact.content,
                    beautyCheck: artifactData.artifact.beautyCheck
                  });
                }, 800);
              }
              // Handle session artifacts for accumulated toolbox
              if (artifactData.sessionArtifacts) {
                logger.info('Session artifacts received after streaming', { count: artifactData.sessionArtifacts.length });
                setSessionArtifacts(artifactData.sessionArtifacts);
              }
            }
          }
        } catch (artifactError) {
          logger.warn('Failed to fetch artifacts', { error: artifactError });
        }
      } else {
        // Fallback to non-streaming if no body
        const data = await response.json();

        // Handle interface lockdown
        if (data.status === 'interface_locked') {
          setInterfaceLocked(true);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.content,
            timestamp: Date.now()
          }]);
          return;
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          timestamp: Date.now()
        }]);

        if (data.artifact) {
          logger.info('Artifact received from API', { title: data.artifact.title });
          setTimeout(() => {
            setArtifact({
              title: data.artifact.title,
              content: data.artifact.content,
              beautyCheck: data.artifact.beautyCheck
            });
          }, 800);
        }

        // Handle session artifacts for accumulated toolbox
        if (data.sessionArtifacts) {
          logger.info('Session artifacts received', { count: data.sessionArtifacts.length });
          setSessionArtifacts(data.sessionArtifacts);
        }
      }

    } catch (error) {
      logger.error('Chat request failed', { error: error instanceof Error ? error.message : String(error) });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong on my end. Want to try that again? I learn from failures.',
        timestamp: Date.now()
      }]);
    }

    setIsLoading(false);
  };

  const downloadArtifact = useCallback((sessionArtifact: SessionArtifact) => {
    if (interfaceLocked) return;
    logger.debug('Download initiated', { title: sessionArtifact.title });

    const content = `${sessionArtifact.title}\n\n${sessionArtifact.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionArtifact.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info('Artifact download completed', { filename: sessionArtifact.title });
  }, [interfaceLocked]);

  const challengeMessage = useCallback(async (messageIndex: number) => {
    if (isLoading || interfaceLocked) return;

    const message = messages[messageIndex];
    if (message.role !== 'assistant') return;

    // Mark as challenged
    setChallengedMessages(prev => new Set(prev).add(messageIndex));

    // Increase trust level for challenging (shows the system respects skepticism)
    setTrustLevel(prev => Math.min(100, prev + 3));

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.slice(0, messageIndex + 1),
            {
              role: 'user',
              content: `I want to challenge your previous response: "${message.content}". Can you think about this differently or explain your reasoning more clearly?`
            }
          ],
          trustLevel,
          skepticMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Handle radio silence
      if (data.status === 'radio_silence') {
        return;
      }

      // Add the challenge response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        timestamp: Date.now()
      }]);

      // Adjust trust level based on response quality
      if (data.content.toLowerCase().includes('uncertain') || data.content.toLowerCase().includes('not sure')) {
        setTrustLevel(prev => Math.min(100, prev + 5));
      }

      // Handle artifact if present in challenge response
      if (data.artifact) {
        logger.info('Challenge artifact received', { title: data.artifact.title });
        setTimeout(() => {
          setArtifact({
            title: data.artifact.title,
            content: data.artifact.content,
            beautyCheck: data.artifact.beautyCheck
          });
        }, 800);
      }

      // Handle session artifacts
      if (data.sessionArtifacts) {
        logger.info('Challenge session artifacts received', { count: data.sessionArtifacts.length });
        setSessionArtifacts(data.sessionArtifacts);
      }

    } catch (error) {
      logger.error('Challenge request failed', { error: error instanceof Error ? error.message : String(error) });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I appreciate the challenge, but I\'m having trouble responding right now. Want to try that again?',
        timestamp: Date.now()
      }]);
    }

    setIsLoading(false);
  }, [messages, trustLevel, skepticMode, isLoading, interfaceLocked]);

  // Memoized message list to prevent unnecessary re-renders
  const messagesWithMemoization = useMemo(() => {
    return messages.map((message, index) => (
      <MessageComponent
        key={`${index}-${message.timestamp}`}
        message={message}
        index={index}
        onChallenge={challengeMessage}
        isAlreadyChallenged={challengedMessages.has(index)}
        isLoading={isLoading}
        interfaceLocked={interfaceLocked}
      />
    ));
  }, [messages, challengedMessages, isLoading, challengeMessage, interfaceLocked]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, []);

  return (
    <>
      <style jsx global>{`
        :root {
          --black: #0a0a0a;
          --charcoal: #1a1a1a;
          --charcoal-light: #252525;
          --amber: #d4a574;
          --bronze: #c89456;
          --copper: #b87333;
          --sky-blue: #87ceeb;
          --sky-blue-dark: #6ba3c8;
          --white: #f5f5f5;
          --white-dim: #e8e8e8;
          --gray: #9ca3af;
          --gray-dark: #6b7280;

          --trust-low: #ef4444;
          --trust-med: #eab308;
          --trust-high: #22c55e;

          --ease-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', system-ui, sans-serif;
          background: var(--black);
          color: var(--white);
          line-height: 1.6;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        .dragonfly-bg {
          position: fixed;
          inset: 0;
          background-image: url('/dragonfly-bg.png');
          background-position: center center;
          background-repeat: no-repeat;
          background-size: 65%;
          opacity: 0.20;
          pointer-events: none;
          z-index: 0;
        }

        .container {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .chat-section {
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
          padding: 2rem 2rem 1rem;
          height: calc(100vh - 300px);
          min-height: 500px;
          z-index: 10;
        }

        .branding {
          text-align: center;
          margin-bottom: 2rem;
          opacity: 0;
          animation: fadeIn 0.8s var(--ease-smooth) 0.2s forwards;
        }

        .brand-name {
          font-size: 2.5rem;
          font-weight: 300;
          letter-spacing: 0.02em;
          margin-bottom: 0.5rem;
        }

        .brand-name .tryit {
          font-weight: 700;
        }

        .brand-name .ai {
          font-weight: 300;
          color: var(--sky-blue);
        }

        .welcome-message {
          max-width: 600px;
          margin: 0 auto 2rem;
          text-align: center;
          font-size: 1.125rem;
          line-height: 1.7;
          color: var(--white-dim);
          opacity: 0;
          animation: fadeIn 0.8s var(--ease-smooth) 0.4s forwards;
          transition: opacity 0.3s var(--ease-smooth);
        }

        .welcome-message.hidden {
          display: none;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 1rem;
          scroll-behavior: smooth;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: var(--charcoal-light);
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: var(--bronze);
        }

        .message {
          margin-bottom: 1.5rem;
          opacity: 0;
          animation: messageAppear 0.4s var(--ease-smooth) forwards;
        }

        @keyframes messageAppear {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .message-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .user-avatar {
          background: linear-gradient(135deg, var(--copper), var(--amber));
          color: var(--black);
        }

        .ai-avatar {
          background: linear-gradient(135deg, var(--sky-blue-dark), var(--sky-blue));
          color: var(--black);
        }

        .message-author {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .message-time {
          font-size: 0.75rem;
          color: var(--gray-dark);
          margin-left: auto;
        }

        .message-content {
          background: var(--charcoal);
          border: 1px solid var(--charcoal-light);
          border-radius: 10px;
          padding: 1rem;
          line-height: 1.6;
          color: var(--white-dim);
          white-space: pre-wrap;
        }

        .user-message-content {
          background: var(--charcoal-light);
        }

        .challenge-link {
          display: inline-block;
          margin-top: 0.5rem;
          color: var(--gray-dark);
          font-size: 0.813rem;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;
        }

        .challenge-link:hover {
          color: var(--amber);
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          color: var(--gray-dark);
          font-size: 0.875rem;
        }

        .typing-dots {
          display: flex;
          gap: 0.25rem;
        }

        .typing-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--bronze);
          animation: typingBounce 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        .input-bar {
          background: var(--charcoal);
          border: 1px solid var(--charcoal-light);
          border-radius: 12px;
          padding: 0.75rem;
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
          opacity: 0;
          animation: fadeIn 0.8s var(--ease-smooth) 0.6s forwards;
          transition: all 0.2s var(--ease-smooth);
        }

        .input-bar:focus-within {
          border-color: var(--bronze);
          box-shadow: 0 0 20px rgba(212, 165, 116, 0.12);
        }

        .input-wrapper {
          flex: 1;
        }

        .message-input {
          width: 100%;
          min-height: 44px;
          max-height: 150px;
          padding: 0.5rem 0;
          background: transparent;
          border: none;
          color: var(--white);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 1rem;
          resize: none;
          outline: none;
        }

        .message-input::placeholder {
          color: var(--gray-dark);
        }

        .send-btn {
          width: 44px;
          height: 44px;
          background: var(--amber);
          border: none;
          border-radius: 10px;
          color: var(--black);
          cursor: pointer;
          transition: all 0.2s var(--ease-smooth);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-btn:hover:not(:disabled) {
          background: var(--bronze);
          transform: translateY(-2px);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bottom-section {
          border-top: 1px solid var(--charcoal-light);
          flex-shrink: 0;
          position: relative;
          transition: all 0.6s var(--ease-smooth);
        }

        .features-bar {
          height: 0;
          overflow: hidden;
          background: var(--charcoal);
          border-bottom: 1px solid var(--charcoal-light);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          padding: 0 2rem;
          transition: height 0.6s var(--ease-smooth);
        }

        .features-bar.visible {
          height: 56px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          opacity: 0;
          transition: opacity 0.3s var(--ease-smooth) 0.2s;
        }

        .features-bar.visible .feature-item {
          opacity: 1;
        }

        .feature-label {
          color: var(--gray-dark);
          font-weight: 500;
        }

        .feature-value {
          color: var(--white);
          font-weight: 600;
        }

        .trust-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .trust-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--trust-med);
          transition: background 0.3s;
        }

        .portfolio-btn {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid var(--charcoal-light);
          color: var(--white);
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s var(--ease-smooth);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .portfolio-btn:hover {
          border-color: var(--bronze);
          color: var(--bronze);
          transform: translateY(-1px);
        }

        .tools-area {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          max-height: 400px;
          overflow-y: auto;
          transition: all 0.5s var(--ease-smooth);
        }

        .tools-area::-webkit-scrollbar {
          width: 6px;
        }

        .tools-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .tools-area::-webkit-scrollbar-thumb {
          background: var(--charcoal-light);
          border-radius: 3px;
        }

        .tools-area::-webkit-scrollbar-thumb:hover {
          background: var(--bronze);
        }

        .video-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 45%;
          background: var(--charcoal);
          border: 1px solid var(--charcoal-light);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.6s var(--ease-smooth), opacity 0.6s var(--ease-smooth);
        }

        .video-container.fade-out {
          opacity: 0;
          transform: translateY(-20px);
        }

        .video-container iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .video-container:hover {
          border-color: var(--bronze);
          box-shadow: 0 4px 30px rgba(212, 165, 116, 0.12);
        }

        .tool-card {
          background: var(--charcoal);
          border: 1px solid var(--charcoal-light);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 1rem;
          transition: all 0.3s var(--ease-smooth);
          opacity: 0;
          animation: slideDown 0.8s var(--ease-smooth) forwards;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .tool-card:hover {
          border-color: var(--bronze);
          transform: translateY(-2px);
        }

        .tool-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }

        .tool-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 1rem;
          font-weight: 600;
          color: var(--amber);
        }

        .tool-time {
          font-size: 0.75rem;
          color: var(--gray-dark);
        }

        .tool-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.75rem;
          font-size: 0.813rem;
          color: var(--gray);
        }

        .tool-agent {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .beauty-badges {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .beauty-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--trust-high);
        }

        .tool-actions {
          display: flex;
          gap: 0.5rem;
        }

        .tool-btn {
          padding: 0.5rem 1rem;
          background: var(--charcoal-light);
          border: 1px solid var(--charcoal-light);
          color: var(--white);
          font-size: 0.813rem;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s var(--ease-smooth);
        }

        .tool-btn:hover {
          background: var(--black);
          border-color: var(--bronze);
        }

        @media (max-width: 768px) {
          .chat-section {
            padding: 1.5rem 1rem;
          }

          .brand-name {
            font-size: 2rem;
          }

          .welcome-message {
            font-size: 1rem;
          }

          .features-bar {
            gap: 1rem;
            padding: 0 1rem;
          }

          .feature-item {
            font-size: 0.75rem;
          }

          .tools-area {
            padding: 1rem;
          }

          .message-input {
            font-size: 16px;
          }
        }

        .hidden {
          display: none !important;
        }
      `}</style>

      <div className="dragonfly-bg"></div>

      <div className="container">
        {/* Top Section: Chat */}
        <div className="chat-section">
          <div className="branding">
            <h1 className="brand-name">
              <span className="tryit">TryIt</span> <span className="ai">A.I.</span>
            </h1>
          </div>

          {!hasStarted && (
            <div className="welcome-message">
              Hi, I'm Noah. I don't know why you're here or what you expect. Most AI tools oversell and underdeliver. This one's different, but you'll have to see for yourself. Want to test it with something small?
            </div>
          )}

          <div className="messages-container">
            {messagesWithMemoization}

            {isLoading && (
              <div className="typing">
                <span>Noah is thinking</span>
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-bar">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                className="message-input"
                placeholder="Type your message..."
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoResize();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isLoading || interfaceLocked}
              />
            </div>
            <button
              className="send-btn"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || interfaceLocked}
              aria-label="Send"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom Section: Features + Tools */}
        <div className="bottom-section">
          {/* Features bar (appears after first response) */}
          <div className={`features-bar ${hasStarted && messages.length > 0 ? 'visible' : ''}`}>
            <div className="feature-item">
              <span className="feature-label">Trust</span>
              <div className="trust-indicator">
                <span className="trust-dot" style={{ background: getTrustColor() }}></span>
                <span className="feature-value">{trustLevel}%</span>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-label">Agent</span>
              <span className="feature-value">{currentAgent}</span>
            </div>
            <a href="#portfolio" className="portfolio-btn">
              Portfolio
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          {/* Tools area */}
          <div className="tools-area">
            {/* Initially: Video */}
            {sessionArtifacts.length === 0 && (
              <div className="video-container">
                <iframe
                  src="https://www.youtube.com/embed/Zf_Z66SX7wk?rel=0&modestbranding=1&showinfo=0"
                  title="Meet Noah - AI for Skeptics"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen>
                </iframe>
              </div>
            )}

            {/* Tools stack */}
            {sessionArtifacts.length > 0 && (
              <div>
                {sessionArtifacts.map((tool) => {
                  const agentIcon = tool.agent === 'Tinkerer' ? '🔧' :
                                   tool.agent === 'Wanderer' ? '👁️' : '💭';

                  const timeAgo = (() => {
                    const seconds = Math.floor((Date.now() - tool.timestamp) / 1000);
                    if (seconds < 60) return 'just now';
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) return `${minutes}m ago`;
                    const hours = Math.floor(minutes / 60);
                    return `${hours}h ago`;
                  })();

                  return (
                    <div key={tool.id} className="tool-card">
                      <div className="tool-header">
                        <div className="tool-title">{tool.title}</div>
                        <div className="tool-time">{timeAgo}</div>
                      </div>
                      <div className="tool-meta">
                        <div className="tool-agent">
                          <span>{agentIcon}</span>
                          <span>Created by {tool.agent}</span>
                        </div>
                      </div>

                      {/* Beauty check badges - only show for code tools */}
                      {tool.beautyCheck && tool.beautyCheck.passed && tool.beautyCheck.badges.length > 0 && (
                        <div className="beauty-badges">
                          {tool.beautyCheck.badges.map((badge, idx) => (
                            <div key={idx} className="beauty-badge">
                              <span>✓</span>
                              <span>{badge}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="tool-actions">
                        <button className="tool-btn">View</button>
                        <button className="tool-btn" onClick={() => downloadArtifact(tool)}>Download</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interface Lockdown Banner */}
      {interfaceLocked && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid var(--trust-low)',
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(10px)',
          zIndex: 50
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'var(--trust-low)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p style={{ color: 'var(--trust-low)', fontWeight: 600, fontSize: '0.875rem' }}>Interface Locked</p>
                <p style={{ color: 'var(--gray)', fontSize: '0.75rem' }}>Your message violated safety guidelines. Refresh to restore functionality.</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--trust-low)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}
    </>
  );
}
