import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendChatMessage } from '../lib/api';

interface Message {
  from: 'me' | 'them';
  text: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setError(null);
    setMessages((m) => [...m, { from: 'me', text }]);
    setSending(true);
    try {
      const reply = await sendChatMessage(text);
      setMessages((m) => [...m, { from: 'them', text: reply }]);
    } catch {
      setError('Could not reach the companion. Please try again.');
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

        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <p
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1.6,
                padding: '20px 26px',
                borderRadius: 26,
                background: 'var(--card)',
                color: 'var(--text-faint)',
              }}
            >
              &hellip;
            </p>
          </div>
        )}

        {error && (
          <p style={{ alignSelf: 'center', color: '#a15a5a', fontSize: 14 }}>{error}</p>
        )}
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
