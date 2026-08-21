import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PixelIcon } from "../../components/ui/PixelIcon";

import { webAppEntryHref } from "../../deployment/productionDomains";
import "./browser-landing.css";

// A verified ReaDirect Play Store listing is not configured yet.
const PLAY_STORE_URL: string | null = null;

function BrandMark() {
  return (
    <img
      className="browser-landing__mark"
      src="/assets/icons/rd.png"
      alt=""
      aria-hidden="true"
    />
  );
}

function ArrowIcon() {
  return <PixelIcon className="browser-landing__arrow" name="arrow-right" />;
}

function PlayStoreStatus({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return PLAY_STORE_URL ? (
    <a
      className={className}
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  ) : (
    <span
      className={`${className} browser-landing__play-store-status`}
      aria-disabled="true"
    >
      <span>{label}</span>
      <small>Coming soon</small>
    </span>
  );
}

const LANDING_ARTWORK = {
  offline: "/assets/illustrations/offline.png",
  voice: "/assets/illustrations/speak.png",
  clara: "/assets/illustrations/learn.png",
  progress: "/assets/illustrations/keep.png",
} as const;

function ArtworkSlot({ kind }: { kind: keyof typeof LANDING_ARTWORK }) {
  return (
    <img
      className="browser-landing__art-slot"
      src={LANDING_ARTWORK[kind]}
      alt=""
      data-testid="landing-art-slot"
      data-art-slot={kind}
      aria-hidden="true"
    />
  );
}

export function BrowserLandingPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const root = document.documentElement;
      const maxScroll = root.scrollHeight - window.innerHeight;
      setProgress(
        maxScroll > 0
          ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100))
          : 0,
      );
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const tapToContinueHref = webAppEntryHref(
    window.location.hostname,
    import.meta.env.VITE_WEB_APP_ORIGIN ?? "",
  );

  return (
    <main className="browser-landing">
      <header className="browser-landing__header">
        <div className="browser-landing__progress-track" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <nav className="browser-landing__nav" aria-label="Main navigation">
          <a
            className="browser-landing__brand"
            href="#hero"
            aria-label="ReaDirect home"
          >
            <BrandMark />
            <span>ReaDirect</span>
          </a>
          <div className="browser-landing__links">
            <a href="#hero">Home</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
          <a
            className="browser-landing__nav-join"
            href={tapToContinueHref}
            target="_blank"
            rel="noreferrer"
          >
            Join <ArrowIcon />
          </a>
        </nav>
      </header>

      <div className="browser-landing__shell">
        <section
          className="browser-landing__hero"
          id="hero"
          aria-labelledby="landing-title"
        >
          <div className="browser-landing__hero-copy">
            <p className="browser-landing__eyebrow">
              Reading support, reimagined
            </p>
            <h1 id="landing-title">A clearer path to confident reading.</h1>
            <p className="browser-landing__lede">
              ReaDirect helps young readers practise aloud, understand what they
              read, and keep moving forward with guidance from Ma&apos;am Clara.
            </p>
            <div className="browser-landing__cta-row">
              <a
                className="landing-button landing-button--primary"
                href={tapToContinueHref}
                target="_blank"
                rel="noreferrer"
              >
                Join ReaDirect <ArrowIcon />
              </a>
              <a
                className="landing-button landing-button--mist"
                href={tapToContinueHref}
                target="_blank"
                rel="noreferrer"
              >
                Use in Browser
              </a>
              <PlayStoreStatus
                className="landing-button landing-button--ghost"
                label="Download on Play Store"
              />
            </div>
            <p className="browser-landing__microcopy">
              Built for classrooms, families, and every learner finding their
              voice.
            </p>
          </div>
        </section>

        <section
          className="browser-landing__offline"
          id="offline"
          aria-labelledby="offline-title"
        >
          <div className="browser-landing__offline-art">
            <ArtworkSlot kind="offline" />
          </div>
          <div className="browser-landing__offline-copy">
            <p className="browser-landing__eyebrow">Learning that travels</p>
            <h2 id="offline-title">Try ReaDirect Offline</h2>
            <p>
              Keep reading practice close, even when the internet is not.
              ReaDirect offline mode is designed to help learners stay in the
              rhythm of small, confidence-building wins.
            </p>
            <span className="browser-landing__offline-note">
              Offline access is coming soon
            </span>
          </div>
        </section>

        <section
          className="browser-landing__about"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="browser-landing__about-grid">
            <div className="browser-landing__about-title">
              <p className="browser-landing__eyebrow">Why ReaDirect</p>
              <h2 id="about-title">
                Every learner deserves a patient place to practise.
              </h2>
            </div>
            <div className="browser-landing__about-copy">
              <p>
                ReaDirect is a reading companion for elementary learners. It
                combines oral-reading practice, comprehension activities, games,
                and gentle feedback in one welcoming space.
              </p>
              <p>
                With clear next steps and progress that follows the learner,
                practice becomes a small, repeatable win — at school or at home.
              </p>
            </div>
          </div>
        </section>

        <section
          className="browser-landing__features"
          id="features"
          aria-labelledby="features-title"
        >
          <div className="browser-landing__section-heading">
            <p className="browser-landing__eyebrow">
              A little help, right on time
            </p>
            <h2 id="features-title">
              Designed around the moments that matter.
            </h2>
          </div>
          <div className="browser-landing__feature-grid">
            <article className="landing-feature-card">
              <div className="landing-feature-card__art">
                <ArtworkSlot kind="voice" />
              </div>
              <div className="landing-feature-card__copy">
                <span className="landing-feature-card__number">01 · Voice</span>
                <h3>Speak with confidence</h3>
                <p>
                  Practice aloud with supportive prompts that make the next
                  sentence feel possible.
                </p>
              </div>
            </article>
            <article className="landing-feature-card">
              <div className="landing-feature-card__art">
                <ArtworkSlot kind="clara" />
              </div>
              <div className="landing-feature-card__copy">
                <span className="landing-feature-card__number">02 · Clara</span>
                <h3>Learn with Clara</h3>
                <p>
                  A friendly guide turns reading routines into clear,
                  encouraging steps.
                </p>
              </div>
            </article>
            <article className="landing-feature-card">
              <div className="landing-feature-card__art">
                <ArtworkSlot kind="progress" />
              </div>
              <div className="landing-feature-card__copy">
                <span className="landing-feature-card__number">
                  03 · Progress
                </span>
                <h3>Keep your momentum</h3>
                <p>
                  Lessons, activities, and progress stay connected so learners
                  always know what comes next.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section
          className="browser-landing__contact"
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className="browser-landing__contact-panel">
            <div>
              <p className="browser-landing__eyebrow">
                Let&apos;s make reading feel possible
              </p>
              <h2 id="contact-title">Ready to take the next step?</h2>
              <p>
                Start in the browser today, or ask your school coordinator about
                ReaDirect for your learning community.
              </p>
              <ul className="browser-landing__contact-highlights">
                <li>Guided practice</li>
                <li>Clara&apos;s encouragement</li>
                <li>Progress that stays with you</li>
              </ul>
              <p className="browser-landing__contact-note">
                No complicated setup. Just a calmer way to practise, one small
                win at a time.
              </p>
            </div>
            <div className="browser-landing__contact-actions">
              <button
                type="button"
                className="landing-button landing-button--primary"
                onClick={() => navigate("/home")}
              >
                Start reading <ArrowIcon />
              </button>
              <PlayStoreStatus
                className="landing-button landing-button--mist"
                label="Download on Play Store"
              />
            </div>
          </div>
        </section>

        <footer className="browser-landing__footer">
          <div className="browser-landing__footer-main">
            <div className="browser-landing__footer-spotlight">
              <BrandMark />
              <h3>Reading support that meets learners where they are.</h3>
              <p>
                Practise aloud, learn with Clara, and keep every small win
                moving forward.
              </p>
              <a
                className="browser-landing__footer-site"
                href={tapToContinueHref}
                target="_blank"
                rel="noreferrer"
              >
                Use ReaDirect in Browser <ArrowIcon />
              </a>
            </div>
            <div className="browser-landing__footer-column">
              <h3>For schools</h3>
              <Link to="/docs/for-teachers">For teachers</Link>
              <Link to="/docs/for-schools">For school coordinators</Link>
              <a href="#contact">Bring ReaDirect to your class</a>
            </div>
            <div className="browser-landing__footer-column">
              <h3>Documentation</h3>
              <Link to="/docs">Documentation</Link>
              <Link to="/docs/getting-started">Getting started</Link>
              <Link to="/docs/user-guide">User guide</Link>
              <Link to="/docs/testing">Testing &amp; quality</Link>
              <Link to="/docs/faq">Frequently asked questions</Link>
              <Link to="/credits-licenses">Credits &amp; licenses</Link>
            </div>
            <div className="browser-landing__footer-column">
              <h3>Support</h3>
              <p>Questions, ideas, or a learner ready to begin?</p>
              <Link to="/docs/accessibility">Accessibility</Link>
              <Link to="/docs/privacy">Privacy Policy</Link>
              <a href="mailto:hello@readirect.org">Contact ReaDirect</a>
            </div>
          </div>
          <div className="browser-landing__footer-meta">
            <span>
              © {new Date().getFullYear()} ReaDirect · Made for young readers,
              families, and schools.
            </span>
            <a href="#hero">
              Back to top <PixelIcon name="arrow-up" />
            </a>
          </div>
        </footer>
      </div>

      <div
        className="browser-landing__progress-label"
        role="progressbar"
        aria-label="Page reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span className="sr-only">
          Page reading progress: {Math.round(progress)}%
        </span>
      </div>
    </main>
  );
}
