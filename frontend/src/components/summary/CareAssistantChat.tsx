import { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useCareChatHistory, useSendChatMessage } from '../../hooks/useSummaries';
import { useSocketStore } from '../../store/socketStore';
import { useAuthStore } from '../../store/authStore';
import type { CareChatMessage } from '../../types/summary';

interface CareAssistantChatProps {
  fid: string;
  initialQuery?: string;
  patientId?: string;
  patientName?: string;
}

const PRESET_PROMPTS = [
  'What tasks are overdue?',
  'Upcoming doctor appointments',
  'What medications & refills are scheduled?',
  'Who is assigned to pending tasks?',
  'Give me a family care summary',
];

function renderFormattedMessage(content: string) {
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    const isBullet = /^\s*[\*\-]\s+(.*)$/.test(line);
    const lineText = isBullet ? line.replace(/^\s*[\*\-]\s+/, '') : line;

    const parts = lineText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    const parsedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-inherit">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={pIdx} className="italic opacity-90">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={idx} className="flex items-start gap-2 my-1 pl-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
          <span className="flex-1 leading-relaxed">{parsedLine}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }

    return (
      <p key={idx} className="my-0.5 leading-relaxed">
        {parsedLine}
      </p>
    );
  });
}

export default function CareAssistantChat({ fid, initialQuery, patientId, patientName }: CareAssistantChatProps) {
  const [input, setInput] = useState(initialQuery || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const chatQuery = useCareChatHistory(fid);
  const sendMutation = useSendChatMessage(fid);
  const messages = chatQuery.data || [];

  const socket = useSocketStore((s) => s.socket);

  // Listen for real-time chat messages
  useEffect(() => {
    if (!socket || !fid) return;

    const handleNewMessage = (payload: { message: CareChatMessage }) => {
      if (!payload?.message || payload.message.familyId !== fid) return;
      queryClient.setQueryData<CareChatMessage[]>(['careChat', fid], (old = []) => {
        if (old.some((m) => m._id === payload.message._id)) return old;
        return [...old, payload.message];
      });
    };

    socket.on('chat:message', handleNewMessage);
    return () => {
      socket.off('chat:message', handleNewMessage);
    };
  }, [socket, fid, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sendMutation.isPending]);

  // If initialQuery is provided and non-empty, set input
  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery);
    }
  }, [initialQuery]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || sendMutation.isPending) return;

    setInput('');
    try {
      await sendMutation.mutateAsync({ message: textToSend, patientId, patientName });
    } catch {
      // Error handled by hook toast
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-[640px] flex-col rounded-card border border-border bg-surface shadow-card overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-text-primary">CareRelay AI Assistant</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Active
              </span>
              {patientName && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Patient: {patientName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-secondary">
              Grounded in tasks, appointments, medicines, and family activities
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void chatQuery.refetch()}
          disabled={chatQuery.isFetching}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-background transition"
          title="Refresh conversation"
        >
          <RefreshCw className={`h-3 w-3 ${chatQuery.isFetching ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/70 bg-background/50 px-4 py-2 text-xs no-scrollbar">
        <span className="shrink-0 text-[11px] font-medium text-text-secondary flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          Try:
        </span>
        {PRESET_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void handleSend(prompt)}
            disabled={sendMutation.isPending}
            className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-primary hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text-secondary">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Loading care conversation…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Bot className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary">How can I help you today?</h4>
            <p className="text-xs text-text-secondary max-w-sm mt-1">
              Ask any question about your family's care schedule, overdue items, upcoming doctor visits, or active prescriptions.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {PRESET_PROMPTS.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void handleSend(prompt)}
                  className="rounded-input border border-border bg-background px-3 py-1.5 text-xs text-text-primary hover:border-primary/60 hover:text-primary transition"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg._id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                    <img src="/logo-icon.png" alt="Assistant" className="h-4 w-4 object-contain" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${isUser
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-border bg-background text-text-primary shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-75">
                    <span className="font-semibold">
                      {isUser ? (msg.senderName || user?.name || 'You') : 'Care Assistant'}
                    </span>
                    <span>
                      {msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}
                    </span>
                  </div>

                  <div className="text-xs font-normal">
                    {renderFormattedMessage(msg.message)}
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary mt-0.5">
                    {(msg.senderName || user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })
        )}

        {sendMutation.isPending && (
          <div className="flex gap-3 justify-start items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <img src="/logo-icon.png" alt="Assistant" className="h-4 w-4 object-contain" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2 text-xs text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              <span>Care Assistant is checking family records…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-border bg-surface p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about tasks, appointments, medicines, or care updates… (Press Enter to send)"
              className="w-full resize-none rounded-input border border-border bg-background px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-secondary/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 max-h-28"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || sendMutation.isPending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition shadow-sm"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-2 text-[10px] text-text-secondary/70 text-center flex items-center justify-center gap-1">
          <AlertCircle className="h-3 w-3" />
          CareRelay is an organizational care coordination tool and does not provide medical diagnoses or advice.
        </p>
      </div>
    </div>
  );
}
