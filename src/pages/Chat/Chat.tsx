import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Send, Bot, Loader2, TrendingUp, Package, Users } from 'lucide-react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { chatService, streamChatWS } from '../../api/services/chat.service';
import type { ChatSession, ChatMessage } from '../../api/services/chat.service';

const SUGGESTIONS = [
  { icon: TrendingUp, text: "What were today's total sales?" },
  { icon: Package, text: 'Which products are low on stock?' },
  { icon: Users, text: 'Who are my top customers this month?' },
];

const Chat: React.FC = () => {
  const dispatch = useAppDispatch();

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatUuid, setChatUuid] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchChats = useCallback(async () => {
    try {
      const data = await chatService.getChats();
      setChats(data);
    } catch {
      // silently fail — sidebar is non-critical
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const loadChat = async (uuid: string) => {
    if (streaming) return;
    setLoadingMessages(true);
    setChatUuid(uuid);
    setMessages([]);
    try {
      const data = await chatService.getChatMessages(uuid);
      setMessages(data.messages);
    } catch {
      dispatch(addNotification({ message: 'Failed to load chat messages.', type: 'error' }));
    } finally {
      setLoadingMessages(false);
    }
  };

  const startNewChat = () => {
    if (streaming) return;
    setChatUuid(null);
    setMessages([]);
    setStreamingContent('');
    textareaRef.current?.focus();
  };

  const sendMessage = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || streaming) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setStreaming(true);
    setStreamingContent('');

    await streamChatWS(
      trimmed,
      chatUuid,
      (chunk) => setStreamingContent((prev) => prev + chunk),
      (newUuid) => {
        setStreamingContent((final) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: final }]);
          return '';
        });
        setChatUuid(newUuid);
        setStreaming(false);
        fetchChats();
      },
      (msg) => {
        dispatch(addNotification({ message: msg, type: 'error' }));
        setStreaming(false);
        setStreamingContent('');
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hasContent = messages.length > 0 || streaming;

  return (
    <div className="flex h-[calc(100vh-60px)] bg-gray-50">
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">ShopBot</span>
          </div>
          <button
            onClick={startNewChat}
            disabled={streaming}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loadingChats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-8 px-4">No previous chats</p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.uuid}
                onClick={() => loadChat(chat.uuid)}
                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors duration-100 group
                  ${chatUuid === chat.uuid ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[13px] leading-tight truncate flex-1
                    ${chatUuid === chat.uuid ? 'text-emerald-700 font-medium' : 'text-gray-700'}`}>
                    {chat.name}
                  </p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5 flex-shrink-0">
                    {formatDate(chat.updated_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat window */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!hasContent ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-200">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Ask me anything about your shop</h2>
              <p className="text-sm text-gray-500 mb-8">Get insights on sales, inventory, customers, and more.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendMessage(s.text)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-150 shadow-sm"
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5 shadow-sm">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words
                          ${msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-sm'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm'
                          }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Streaming bubble */}
                  {streaming && (
                    <div className="flex justify-start">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5 shadow-sm">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[75%] px-4 py-3 text-sm leading-relaxed bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm">
                        {streamingContent ? (
                          <>
                            <span className="whitespace-pre-wrap break-words">{streamingContent}</span>
                            <span className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5 align-middle animate-pulse" />
                          </>
                        ) : (
                          <span className="flex gap-1 items-center py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                placeholder="Ask about your sales, inventory, customers…"
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed max-h-[140px] overflow-y-auto"
                style={{ minHeight: '46px' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
            >
              {streaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="max-w-3xl mx-auto mt-2 text-[11px] text-gray-400 text-center">
            ShopBot can only read data — it cannot create or modify records.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
