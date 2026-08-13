import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendChatMessage } from '../lib/api';

interface Message {
  from: 'me' | 'them';
  text: string;
}

// Cold Lambda starts on /chat can run 30+ seconds — a running "X.Xs" timer
// (rather than a static spinner) reads as "still working" instead of
// "frozen" the longer it goes, which matters most right at the point a
// first-time visitor is most likely to give up on it.
function useElapsedSeconds(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = performance.now();
    const id = setInterval(() => {
      setElapsed((performance.now() - start) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, [active]);

  return elapsed;
}

function ThinkingBubble({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <p
        style={{
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 26px',
          borderRadius: 26,
          background: 'var(--card)',
          color: 'var(--text-faint)',
        }}
      >
        <span style={{ display: 'inline-flex', gap: 5 }} aria-hidden="true">
          <span className="km-thinking-dot" style={{ animationDelay: '0s' }} />
          <span className="km-thinking-dot" style={{ animationDelay: '0.18s' }} />
          <span className="km-thinking-dot" style={{ animationDelay: '0.36s' }} />
        </span>
        <span
          style={{
            fontSize: 13,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-placeholder)',
            letterSpacing: '0.02em',
          }}
        >
          {elapsedSeconds.toFixed(1)}s
        </span>
      </p>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const elapsedSeconds = useElapsedSeconds(sending);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setMessages((m) => [...m, { from: 'me', text }]);
    setSending(true);
    try {
      const reply = await sendChatMessage(text);
      setMessages((m) => [...m, { from: 'them', text: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          from: 'them',
          text: 'Having trouble reaching the companion right now — try again in a moment.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '22px 32px',
          maxWidth: 820,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <span style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--text-faint)', letterSpacing: '0.02em' }}>
          KindredMemory
        </span>
        <Link to="/" style={{ fontSize: 15 }}>
          Back
        </Link>
      </header>

      <main
        style={{
          maxWidth: 820,
          width: '100%',
          margin: '0 auto',
          padding: '8px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <p
          style={{
            alignSelf: 'center',
            fontSize: 14,
            color: 'var(--text-placeholder)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '8px 0 0',
          }}
        >
          Today
        </p>

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <p
              style={{
                margin: 0,
                maxWidth: '34em',
                fontSize: 22,
                lineHeight: 1.6,
                padding: '20px 26px',
                borderRadius: 26,
                background: m.from === 'me' ? 'var(--accent)' : 'var(--card)',
                color: m.from === 'me' ? 'var(--card)' : 'var(--text)',
              }}
            >
              {m.text}
            </p>
          </div>
        ))}

        {sending && <ThinkingBubble elapsedSeconds={elapsedSeconds} />}
        <div ref={bottomRef} />
      </main>

      <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '16px 32px 32px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          style={{
            maxWidth: 820,
            margin: '0 auto',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-end',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 32,
            padding: '12px 12px 12px 24px',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Write a message"
            disabled={sending}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              fontWeight: 300,
              fontSize: 22,
              lineHeight: 1.5,
              color: 'var(--text)',
              padding: '12px 0',
              maxHeight: 160,
              opacity: sending ? 0.7 : 1,
            }}
          />
          <button
            type="submit"
            disabled={sending}
            style={{
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--card)',
              fontSize: 19,
              letterSpacing: '0.02em',
              padding: '16px 32px',
              borderRadius: 999,
              cursor: sending ? 'default' : 'pointer',
              minHeight: 56,
              opacity: sending ? 0.7 : 1,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
