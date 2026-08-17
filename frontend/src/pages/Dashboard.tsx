import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addMemory,
  getConversations,
  getFamilyMembers,
  getMemories,
  getTranscript,
  type ConversationSession,
  type FamilyMember,
  type Memory,
  type TranscriptTurn,
} from '../lib/api';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Dashboard() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activity, setActivity] = useState<ConversationSession[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [saving, setSaving] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptTurn[]>>({});
  const [transcriptLoading, setTranscriptLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMemories(), getConversations(), getFamilyMembers()])
      .then(([m, a, f]) => {
        setMemories(m);
        setActivity(a);
        setFamilyMembers(f);
      })
      .catch(() => setLoadError('Could not load the dashboard right now. Try refreshing.'));
  }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await addMemory({
        content: text,
        source: 'family_added',
        addedByFamilyMemberId: authorId || undefined,
      });
      const refreshed = await getMemories();
      setMemories(refreshed);
      setDraft('');
    } catch {
      setLoadError('Could not save that memory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTranscript = async (session: ConversationSession) => {
    const key = `${session.startTime}|${session.endTime}`;
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    if (!transcripts[key]) {
      setTranscriptLoading(key);
      try {
        const turns = await getTranscript(session.startTime, session.endTime);
        setTranscripts((t) => ({ ...t, [key]: turns }));
      } catch {
        setLoadError('Could not load that conversation.');
      } finally {
        setTranscriptLoading(null);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '32px 40px 0',
          maxWidth: 1080,
          margin: '0 auto',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/kindred-logo.png" alt="" style={{ height: 28, width: 'auto' }} />
          <span style={{ fontFamily: 'var(--serif)', fontSize: 19, letterSpacing: '0.02em' }}>
            KindredMemory
          </span>
        </span>
        <Link to="/" style={{ fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Back to home
        </Link>
      </header>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 40px 96px' }}>
        <div style={{ maxWidth: '34em' }}>
          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 300,
              fontSize: 'clamp(32px, 4vw, 46px)',
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
              margin: 0,
            }}
          >
            Ruth&rsquo;s memories
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--text-muted)', margin: '18px 0 0' }}>
            Anything you add here, she can talk about. You don&rsquo;t need to write it neatly
            &mdash; a sentence is plenty.
          </p>
        </div>

        {loadError && (
          <p style={{ color: '#a15a5a', fontSize: 14, marginTop: 16 }}>{loadError}</p>
        )}

        <form
          onSubmit={onAdd}
          style={{
            marginTop: 36,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: '22px 24px',
            maxWidth: 720,
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Ellen&rsquo;s bringing the boys on Saturday&hellip;"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              fontWeight: 300,
              fontSize: 19,
              lineHeight: 1.6,
              color: 'var(--text)',
              padding: 0,
            }}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--divider)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 15, color: 'var(--text-faint)' }}>
              <span>Added by</span>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontWeight: 400,
                  fontSize: 15,
                  color: 'var(--text)',
                  borderBottom: '1px solid var(--border)',
                  padding: '2px 0',
                }}
              >
                <option value="">your name</option>
                {familyMembers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              style={{
                border: 'none',
                background: 'var(--accent)',
                color: 'var(--card)',
                fontSize: 16,
                letterSpacing: '0.02em',
                padding: '13px 28px',
                borderRadius: 999,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save it'}
            </button>
          </div>
        </form>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 64,
            marginTop: 80,
            alignItems: 'start',
          }}
        >
          <section>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                alignItems: 'baseline',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 14,
              }}
            >
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 26, margin: 0, letterSpacing: '-0.01em' }}>
                What&rsquo;s on file
              </h2>
              <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>
                {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
              </span>
            </div>

            {memories.map((m) => (
              <div key={m.id} style={{ padding: '26px 0', borderBottom: '1px solid var(--divider)' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 21, lineHeight: 1.5, margin: 0 }}>
                  {m.content}
                </p>
                <p
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    alignItems: 'center',
                    fontSize: 14,
                    color: 'var(--text-faint)',
                    margin: '14px 0 0',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: m.addedByFamilyMember ? 'var(--dot-family)' : 'var(--dot-conversation)',
                    }}
                  />
                  <span>
                    {m.addedByFamilyMember ? `Added by ${m.addedByFamilyMember.name}` : 'From a conversation'}
                  </span>
                  <span style={{ color: '#c4bdc9' }}>&middot;</span>
                  <span>{formatWhen(m.createdAt)}</span>
                </p>
              </div>
            ))}

            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-faint)', margin: '22px 0 0', maxWidth: '30em' }}>
              Lavender means someone in the family wrote it down. Grey means it came up on its own
              while they were talking.
            </p>
          </section>

          <section>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontWeight: 300,
                fontSize: 26,
                margin: 0,
                letterSpacing: '-0.01em',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 14,
              }}
            >
              Lately
            </h2>

            {activity.map((a) => {
              const key = `${a.startTime}|${a.endTime}`;
              const isOpen = expanded === key;
              return (
                <div key={key} style={{ padding: '22px 0', borderBottom: '1px solid var(--divider)' }}>
                  <p style={{ fontSize: 18, lineHeight: 1.55, margin: 0, color: 'var(--text)' }}>
                    {a.preview}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline', marginTop: 8 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>{formatWhen(a.startTime)}</span>
                    <button
                      onClick={() => toggleTranscript(a)}
                      style={{
                        fontSize: 14,
                        color: 'var(--accent)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                    >
                      {isOpen ? 'Hide it' : 'Read it'}
                    </button>
                  </div>
                  {isOpen && (
                    <div
                      style={{
                        marginTop: 14,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 16,
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {transcriptLoading === key && (
                        <span style={{ fontSize: 14, color: 'var(--text-faint)' }}>Loading&hellip;</span>
                      )}
                      {transcripts[key]?.map((turn, i) => (
                        <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.55 }}>
                          <strong style={{ fontWeight: 500 }}>
                            {turn.role === 'elder' ? 'Ruth: ' : 'Companion: '}
                          </strong>
                          {turn.content}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 32, background: 'var(--callout)', borderRadius: 20, padding: 24 }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.6, margin: 0, color: '#5b5364' }}>
                We keep this light on purpose. It&rsquo;s here so you know she&rsquo;s talking to
                someone &mdash; not so you can read over her shoulder.
              </p>
            </div>
          </section>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-faint)', margin: '80px 0 0' }}>
          Built with CockroachDB, Gemini, and AWS Lambda.
        </p>
      </div>
    </div>
  );
}
