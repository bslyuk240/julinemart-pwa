'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Headphones, User, Bot, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useCustomerAuth } from '@/context/customer-auth-context';

// ── Types ────────────────────────────────────────────────────────────────────

interface SupportMessage {
  id: string;
  sender_type: 'customer' | 'staff' | 'ai';
  sender_name: string | null;
  content: string;
  created_at: string;
}

interface SupportSession {
  id: string;
  status: 'open' | 'assigned' | 'closed';
  mode: 'ai' | 'human';
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  unread_count: number;
}

type WidgetScreen = 'closed' | 'pre-chat' | 'chatting';

// ── Constants ────────────────────────────────────────────────────────────────

const SESSION_KEY_STORAGE   = 'julinemart-support-key';
const SESSION_ID_STORAGE    = 'julinemart-support-session-id';
const PRECHAT_NAME_STORAGE  = 'julinemart-support-name';
const PRECHAT_EMAIL_STORAGE = 'julinemart-support-email';

function generateSessionKey(): string {
  return crypto.randomUUID();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

// ── Widget ───────────────────────────────────────────────────────────────────

export default function SupportChatWidget() {
  const { user, customer } = useCustomerAuth();

  // screenRef must be declared before the useState that references it to avoid TDZ
  const screenRef      = useRef<WidgetScreen>('closed');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [screen, setScreen]         = useState<WidgetScreen>('closed');
  const setScreenSynced = useCallback((s: WidgetScreen | ((prev: WidgetScreen) => WidgetScreen)) => {
    setScreen(prev => {
      const next = typeof s === 'function' ? s(prev) : s;
      screenRef.current = next;
      return next;
    });
  }, []);
  const [session, setSession]       = useState<SupportSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [messages, setMessages]     = useState<SupportMessage[]>([]);
  const [inputText, setInputText]   = useState('');
  const [sending, setSending]       = useState(false);
  const [aiTyping, setAiTyping]     = useState(false);
  const [staffTyping, setStaffTyping] = useState(false);
  const [unreadDot, setUnreadDot]   = useState(false);
  const [agentJoined, setAgentJoined] = useState(false);

  const typingTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelReadyRef   = useRef(false);

  // Pre-chat form state
  const [preName, setPreName]       = useState('');
  const [preEmail, setPreEmail]     = useState('');
  const [preError, setPreError]     = useState('');
  const [preLoading, setPreLoading] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const getSessionKey = useCallback((): string => {
    if (user) return user.id;
    let key = localStorage.getItem(SESSION_KEY_STORAGE);
    if (!key) {
      key = generateSessionKey();
      localStorage.setItem(SESSION_KEY_STORAGE, key);
    }
    return key;
  }, [user]);

  // ── Realtime subscription ─────────────────────────────────────────────────

  const subscribeToSession = useCallback((sessionId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelReadyRef.current = false;
    }

    const channel = supabase
      .channel(`support_chat_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages(prev => {
            const base = newMsg.sender_type === 'customer'
              ? prev.filter(m => !m.id.startsWith('optimistic-'))
              : prev;
            if (base.some(m => m.id === newMsg.id)) return base;
            return [...base, newMsg];
          });
          setAiTyping(false);
          if (screenRef.current === 'closed') setUnreadDot(true);
          setTimeout(scrollToBottom, 50);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const updated = payload.new as SupportSession;
          setSession(prev => {
            if (updated.mode === 'human' && prev?.mode !== 'human' && updated.assigned_staff_name) {
              setAgentJoined(true);
              setTimeout(() => setAgentJoined(false), 6000);
            }
            return updated;
          });
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.role === 'staff') {
          setStaffTyping(true);
          if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
          typingClearTimerRef.current = setTimeout(() => setStaffTyping(false), 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload?.role === 'staff') setStaffTyping(false);
      })
      .subscribe((status) => {
        channelReadyRef.current = status === 'SUBSCRIBED';
      });

    channelRef.current = channel;
  }, [scrollToBottom]);

  // ── Polling fallback (catches msgs/session updates when Realtime is unreliable for anon clients) ──

  const startPolling = useCallback((sessionKey: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/support/session?key=${encodeURIComponent(sessionKey)}`);
        if (!res.ok) return;
        const { session: s, messages: msgs } = await res.json();
        if (s) {
          setSession(prev => {
            if (s.mode === 'human' && prev?.mode !== 'human' && s.assigned_staff_name) {
              setAgentJoined(true);
              setTimeout(() => setAgentJoined(false), 6000);
            }
            return s;
          });
        }
        if (msgs) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = (msgs as SupportMessage[]).filter(m => !existingIds.has(m.id));
            if (!newMsgs.length) return prev;
            const withoutOptimistic = prev.filter(m => !m.id.startsWith('optimistic-'));
            // Only clear AI typing when an AI or staff reply actually arrives
            if (newMsgs.some(m => m.sender_type === 'ai' || m.sender_type === 'staff')) setAiTyping(false);
            if (screenRef.current === 'closed' && newMsgs.some(m => m.sender_type !== 'customer')) setUnreadDot(true);
            setTimeout(scrollToBottom, 50);
            return [...withoutOptimistic, ...newMsgs.filter(m => !withoutOptimistic.some(p => p.id === m.id))];
          });
        }
      } catch { /* silent */ }
    }, 4000);
  }, [scrollToBottom]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  // ── Load existing session on mount ────────────────────────────────────────

  useEffect(() => {
    const cachedSessionId = localStorage.getItem(SESSION_ID_STORAGE);
    if (!cachedSessionId) return;

    const key = getSessionKey();
    fetch(`/api/support/session?key=${encodeURIComponent(key)}`)
      .then(r => r.json())
      .then(({ session: s, messages: msgs }) => {
        if (s) {
          setSession(s);
          setMessages(msgs ?? []);
          subscribeToSession(s.id);
          startPolling(key);
          localStorage.setItem(SESSION_ID_STORAGE, s.id);
        }
      })
      .catch(() => {});
  }, [getSessionKey, subscribeToSession, startPolling]);

  // ── Scroll to bottom when messages or typing indicators change ───────────

  useEffect(() => {
    if (screen === 'chatting') scrollToBottom();
  }, [messages, aiTyping, staffTyping, screen, scrollToBottom]);

  // ── Focus input when chatting screen opens ────────────────────────────────

  useEffect(() => {
    if (screen === 'chatting') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [screen]);

  // ── Cleanup realtime + polling on unmount ─────────────────────────────────

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      stopPolling();
    };
  }, [stopPolling]);

  // ── Open widget ───────────────────────────────────────────────────────────

  const openWidget = () => {
    setUnreadDot(false);
    if (session) {
      setScreenSynced('chatting');
      return;
    }
    // Logged-in users skip pre-chat form
    if (user) {
      startSessionForLoggedInUser();
    } else {
      // Restore saved pre-chat info if available
      setPreName(localStorage.getItem(PRECHAT_NAME_STORAGE) ?? '');
      setPreEmail(localStorage.getItem(PRECHAT_EMAIL_STORAGE) ?? '');
      setScreenSynced('pre-chat');
    }
  };

  // ── Create session for logged-in user ─────────────────────────────────────

  const startSessionForLoggedInUser = async () => {
    setScreenSynced('chatting');
    if (session) return;
    setSessionLoading(true);
    try {
      const res  = await fetch('/api/support/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_session_key: user!.id,
          customer_name:        customer?.first_name ? `${customer.first_name} ${customer.last_name ?? ''}`.trim() : user!.email,
          customer_email:       user!.email,
          customer_user_id:     user!.id,
        }),
      });
      const { session: s } = await res.json();
      if (s) {
        setSession(s);
        localStorage.setItem(SESSION_ID_STORAGE, s.id);
        subscribeToSession(s.id);
        startPolling(user!.id);
      }
    } catch { /* session creation errors are silent */ }
    finally { setSessionLoading(false); }
  };

  // ── Pre-chat form submit ──────────────────────────────────────────────────

  const handlePreChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preName.trim() || !preEmail.trim()) {
      setPreError('Please fill in both fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(preEmail)) {
      setPreError('Please enter a valid email address.');
      return;
    }
    setPreError('');
    setPreLoading(true);

    try {
      const key = getSessionKey();
      localStorage.setItem(PRECHAT_NAME_STORAGE, preName.trim());
      localStorage.setItem(PRECHAT_EMAIL_STORAGE, preEmail.trim());

      const res = await fetch('/api/support/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_session_key: key,
          customer_name:        preName.trim(),
          customer_email:       preEmail.trim(),
        }),
      });
      const { session: s } = await res.json();
      if (s) {
        setSession(s);
        localStorage.setItem(SESSION_ID_STORAGE, s.id);
        subscribeToSession(s.id);
        startPolling(key);
        setScreenSynced('chatting');
      }
    } catch {
      setPreError('Could not start chat. Please try again.');
    } finally {
      setPreLoading(false);
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !session || sending) return;

    setInputText('');
    setSending(true);

    // Optimistic UI
    const optimisticMsg: SupportMessage = {
      id:          `optimistic-${Date.now()}`,
      sender_type: 'customer',
      sender_name: null,
      content:     text,
      created_at:  new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    if (session.mode === 'ai') setAiTyping(true);

    try {
      const key = getSessionKey();
      await fetch('/api/support/message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, customer_session_key: key, content: text }),
      });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (channelReadyRef.current) {
        channelRef.current?.send({ type: 'broadcast', event: 'stop_typing', payload: { role: 'customer' } });
      }
      // Realtime will deliver the AI reply and replace optimistic msg
    } catch {
      setAiTyping(false);
    } finally {
      setSending(false);
    }
  };

  // ── Request human agent ───────────────────────────────────────────────────

  const requestHuman = async () => {
    if (!session || session.mode === 'human') return;
    try {
      const key = getSessionKey();
      await fetch('/api/support/request-human', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, customer_session_key: key }),
      });
      setSession(prev => prev ? { ...prev, mode: 'human' } : prev);
    } catch { /* silent */ }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={openWidget}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px)+var(--jm-vv-bottom-inset,0px))] right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 md:bottom-6"
        style={{ backgroundColor: '#77088a' }}
        aria-label="Open support chat"
      >
        <Headphones className="w-6 h-6 text-white" />
        {unreadDot && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
        {/* Pulse ring */}
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: '#77088a' }}
        />
      </button>

      {/* Chat panel */}
      {screen !== 'closed' && (
        <div className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px)+var(--jm-vv-bottom-inset,0px))] right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm md:bottom-20 md:right-6 md:w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-slide-in"
          style={{ height: 'min(540px, calc(100vh - 180px))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: '#77088a' }}>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">JulineMart Support</p>
              <p className="text-white/75 text-xs">
                {session?.mode === 'human' && session.assigned_staff_name
                  ? `Chatting with ${session.assigned_staff_name}`
                  : 'We typically reply within a few hours'}
              </p>
            </div>
            <button
              onClick={() => setScreenSynced('closed')}
              className="text-white/75 hover:text-white transition-colors p-1 flex-shrink-0"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Pre-chat form */}
          {screen === 'pre-chat' && (
            <div className="flex-1 bg-white flex flex-col justify-center px-6 py-8">
              <h3 className="text-gray-900 font-semibold text-base mb-1">Start a conversation</h3>
              <p className="text-gray-500 text-sm mb-6">Tell us who you are so our team can help you better.</p>
              <form onSubmit={handlePreChatSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                  <input
                    type="text"
                    value={preName}
                    onChange={e => setPreName(e.target.value)}
                    placeholder="e.g. Amaka Johnson"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#77088a' } as React.CSSProperties}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
                  <input
                    type="email"
                    value={preEmail}
                    onChange={e => setPreEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    required
                  />
                </div>
                {preError && <p className="text-red-500 text-xs">{preError}</p>}
                <button
                  type="submit"
                  disabled={preLoading}
                  className="mt-2 text-white font-semibold py-3 rounded-xl text-sm transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#77088a' }}
                >
                  {preLoading ? 'Starting…' : 'Start Chat'}
                </button>
                <p className="text-center text-xs text-gray-400">
                  Your email helps us follow up if you disconnect.
                </p>
              </form>
            </div>
          )}

          {/* Chat messages */}
          {screen === 'chatting' && (
            <>
              {/* Agent joined banner */}
              {agentJoined && (
                <div className="px-4 py-2 text-center text-xs font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: '#670779' }}>
                  You are now chatting with {session?.assigned_staff_name}
                </div>
              )}

              {/* Mode badge */}
              {session?.mode === 'human' && !session.assigned_staff_name && (
                <div className="px-4 py-2 bg-amber-50 text-amber-700 text-xs text-center flex-shrink-0 border-b border-amber-100">
                  Connecting you to an agent…
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 flex flex-col gap-2">
                {/* Session loading indicator */}
                {sessionLoading && (
                  <div className="flex items-center justify-center gap-2 py-6 text-gray-400 text-sm">
                    <span className="w-4 h-4 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin" />
                    Connecting…
                  </div>
                )}

                {/* Welcome message when no messages yet */}
                {!sessionLoading && messages.length === 0 && (
                  <div className="flex items-start gap-2 mt-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#77088a' }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm max-w-[78%]">
                      <p className="text-gray-800 text-sm">
                        Hi{customer?.first_name ? ` ${customer.first_name}` : ''}! 👋 I&apos;m the JulineMart support assistant. How can I help you today?
                      </p>
                      <p className="text-gray-400 text-[11px] mt-1">JulineMart AI</p>
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}

                {/* AI typing indicator */}
                {aiTyping && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#77088a' }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}

                {/* Staff typing indicator */}
                {staffTyping && !aiTyping && (
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Input footer */}
              <div className="bg-white border-t border-gray-100 flex-shrink-0">
                {/* Talk to human button */}
                {session?.mode === 'ai' && (
                  <div className="px-4 pt-2 flex justify-center">
                    <button
                      onClick={requestHuman}
                      className="text-xs font-medium flex items-center gap-1.5 px-3 py-1 rounded-full border transition-colors hover:bg-purple-50"
                      style={{ color: '#77088a', borderColor: '#77088a' }}
                    >
                      <User className="w-3 h-3" />
                      Talk to an agent
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 px-4 py-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => {
                      setInputText(e.target.value);
                      if (!channelRef.current || !channelReadyRef.current) return;
                      channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { role: 'customer' } });
                      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                      typingTimerRef.current = setTimeout(() => {
                        if (channelReadyRef.current) {
                          channelRef.current?.send({ type: 'broadcast', event: 'stop_typing', payload: { role: 'customer' } });
                        }
                      }, 2000);
                    }}
                    onBlur={() => {
                      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                      if (channelReadyRef.current) {
                        channelRef.current?.send({ type: 'broadcast', event: 'stop_typing', payload: { role: 'customer' } });
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message…"
                    disabled={!session || sessionLoading || session?.status === 'closed'}
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-gray-400 disabled:opacity-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending || !session || sessionLoading || session?.status === 'closed'}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: '#77088a' }}
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>

                {session?.status === 'closed' && (
                  <p className="text-center text-xs text-gray-400 pb-3">This chat has been closed.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function renderMessageContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    // Strip leading bullet markers
    const stripped = line.replace(/^[\-\*•]\s+/, '');
    // Split by **bold**
    const parts = stripped.split(/\*\*(.+?)\*\*/g);
    const nodes = parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
    return (
      <span key={li}>
        {nodes}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

function MessageBubble({ msg }: { msg: SupportMessage }) {
  const isCustomer = msg.sender_type === 'customer';
  const isAi       = msg.sender_type === 'ai';

  if (isCustomer) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%]">
          <div className="text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed"
            style={{ backgroundColor: '#77088a' }}>
            {msg.content}
          </div>
          <p className="text-gray-400 text-[11px] mt-0.5 text-right">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isAi ? '' : 'bg-gray-300'}`}
        style={isAi ? { backgroundColor: '#77088a' } : {}}>
        {isAi
          ? <Bot className="w-4 h-4 text-white" />
          : <User className="w-4 h-4 text-white" />}
      </div>
      <div className="max-w-[78%]">
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm text-sm text-gray-800 leading-relaxed">
          {renderMessageContent(msg.content)}
        </div>
        <p className="text-gray-400 text-[11px] mt-0.5">
          {msg.sender_name ?? (isAi ? 'JulineMart AI' : 'Support')} · {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-4">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// Scroll-to-bottom button (appears when user scrolls up)
export function ScrollDownButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white shadow-md rounded-full p-1.5 border border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <ChevronDown className="w-4 h-4 text-gray-500" />
    </button>
  );
}
