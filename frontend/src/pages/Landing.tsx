import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const el = heroRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, -r.top / (r.height || 1)));
        el.style.transform = `translate3d(0,${(p * -22).toFixed(2)}px,0) scale(${(1 + p * 0.015).toFixed(4)})`;
        el.style.opacity = (0.92 - p * 0.14).toFixed(3);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ overflowX: 'hidden' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 12,
          padding: 'clamp(20px, 6vw, 32px) clamp(20px, 6vw, 48px) 0',
          maxWidth: 1240,
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span style={{ fontFamily: 'var(--serif)', fontSize: 19, letterSpacing: '0.02em' }}>
          KindredMemory
        </span>
        <Link
          to="/dashboard"
          style={{ fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}
        >
          Family dashboard
        </Link>
      </header>

      <section
        style={{
          position: 'relative',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '0 clamp(16px, 5vw, 24px)',
        }}
      >
        <div ref={heroRef} style={{ willChange: 'transform', opacity: 0.92 }}>
          <img
            src="/threads.png"
            alt=""
            role="presentation"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              // Two gradients, one per axis, combined with an intersect
              // composite so alpha multiplies (a1 * a2) rather than unions
              // (the default "add" would keep corners opaque as long as
              // either axis was still opaque there). Left/right stops move
              // in further (18%/82%) than top/bottom (6%/94%) so the
              // horizontal edges — the hard boundary visible on the left —
              // fade out more aggressively than the top/bottom edges.
              maskImage:
                'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), ' +
                'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), ' +
                'linear-gradient(to bottom, transparent 0%, black 6%, black 94%, transparent 100%)',
              WebkitMaskComposite: 'source-in',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateRows: 'auto',
            alignContent: 'start',
            justifyItems: 'center',
            textAlign: 'center',
            padding: '7% 8% 0',
            pointerEvents: 'none',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 300,
              fontSize: 'clamp(38px, 5.2vw, 74px)',
              lineHeight: 1.06,
              letterSpacing: '-0.015em',
              margin: 0,
              maxWidth: '15em',
            }}
          >
            Conversations that don&rsquo;t start from nothing
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 1.5vw, 21px)',
              lineHeight: 1.6,
              margin: '26px 0 0',
              maxWidth: '30em',
              color: 'var(--text-muted)',
            }}
          >
            A companion for people living with memory loss. It remembers who your family is, the
            stories you&rsquo;ve told before, and what&rsquo;s coming up this week.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
            margin: '36px 0 0',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <Link
            to="/chat"
            style={{
              background: 'var(--accent)',
              color: 'var(--card)',
              padding: 'clamp(14px, 3.5vw, 17px) clamp(22px, 6vw, 34px)',
              borderRadius: 999,
              fontSize: 16,
              letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            Start a conversation
          </Link>
          <Link
            to="/dashboard"
            style={{
              border: '1px solid #c9c2ba',
              color: 'var(--text)',
              padding: 'clamp(14px, 3.5vw, 17px) clamp(22px, 6vw, 34px)',
              borderRadius: 999,
              fontSize: 16,
              letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            Open the family dashboard
          </Link>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: 'clamp(56px, 14vw, 112px) clamp(20px, 6vw, 48px) 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(32px, 8vw, 56px)',
        }}
      >
        <div>
          <p
            style={{
              fontSize: 13,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
              margin: '0 0 16px',
            }}
          >
            For the person
          </p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(18px, 4vw, 22px)', lineHeight: 1.55, margin: 0 }}>
            They just talk. There&rsquo;s nothing to set up, nothing to learn, and no wrong way to
            use it. One page, one place to type, and someone who already knows them.
          </p>
        </div>
        <div>
          <p
            style={{
              fontSize: 13,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
              margin: '0 0 16px',
            }}
          >
            For the family
          </p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(18px, 4vw, 22px)', lineHeight: 1.55, margin: 0 }}>
            You add the things that matter &mdash; names, relationships, what happened last
            weekend, Thursday&rsquo;s appointment &mdash; and see how they come up in conversation.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(56px, 13vw, 104px) clamp(20px, 6vw, 48px) 0' }}>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 300,
            fontSize: 'clamp(26px, 4.5vw, 32px)',
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
          }}
        >
          What that looks like
        </h2>
        <div style={{ display: 'grid', gap: 0, marginTop: 40 }}>
          {[
            {
              title: 'It knows that Ellen is your daughter, and that she has two boys.',
              body: 'So when she comes up, it doesn’t ask who she is. Relationships stay in place between visits.',
            },
            {
              title: 'It remembers the story about the boat in Galway.',
              body: 'Told once, held onto. It can ask about it again later, the way a friend would.',
            },
            {
              title: 'It can mention Thursday’s appointment when Thursday comes up.',
              body: 'Family adds it once in the dashboard. It arrives in conversation when it’s relevant, not as a reminder alarm.',
            },
          ].map((item, i) => (
            <div
              key={item.title}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: 10,
                padding: '32px 0',
                borderTop: '1px solid var(--border)',
                borderBottom: i === 2 ? '1px solid var(--border)' : undefined,
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: 'clamp(20px, 4.5vw, 25px)',
                  lineHeight: 1.45,
                  margin: 0,
                  maxWidth: '22em',
                }}
              >
                {item.title}
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.65, margin: 0, color: 'var(--text-muted)', maxWidth: '34em' }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          margin: 'clamp(56px, 14vw, 112px) 0 0',
          background: 'var(--callout)',
          padding: 'clamp(48px, 12vw, 88px) clamp(20px, 6vw, 48px)',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(18px, 3.5vw, 23px)', lineHeight: 1.6, margin: 0 }}>
            KindredMemory is a companion, not a medical device. It doesn&rsquo;t diagnose, monitor,
            or treat anything, and it isn&rsquo;t a substitute for you being there. It&rsquo;s for
            the hours in between &mdash; so the thread of a conversation holds until you&rsquo;re
            back.
          </p>
        </div>
      </section>

      <footer
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: 'clamp(32px, 8vw, 48px) clamp(20px, 6vw, 48px) clamp(40px, 10vw, 64px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: 14,
          color: 'var(--text-faint)',
        }}
      >
        <span>KindredMemory</span>
        <span>Built with CockroachDB, Gemini, and AWS Lambda.</span>
      </footer>
    </div>
  );
}
