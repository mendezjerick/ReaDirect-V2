import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "./browser-landing.css";

// A verified ReaDirect Play Store listing is not configured yet.
const PLAY_STORE_URL: string | null = null;

function BrandMark() {
  return (
    <img
      className="browser-landing__mark"
      src="/assets/icons/icon.png"
      alt=""
      aria-hidden="true"
    />
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="browser-landing__arrow"
    >
      <path
        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg
      className="browser-landing__play-store-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3.6 2.7 13.9 12 3.6 21.3c-.4-.3-.6-.8-.6-1.4V4.1c0-.6.2-1.1.6-1.4Z"
        fill="#55c9f2"
      />
      <path
        d="m15.2 10.8 3.2-2.9 2.2 1.2c.8.5.8 1.6 0 2.1l-2.2 1.2-3.2-2.9Z"
        fill="#f9d34c"
      />
      <path d="m3.6 2.7 11.6 8.1-3.2 2.9L3.6 2.7Z" fill="#62d48f" />
      <path d="m3.6 21.3 8.4-8.6 3.2 2.9-11.6 5.7Z" fill="#ed6c73" />
    </svg>
  );
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
      <PlayStoreIcon /> {label}
    </a>
  ) : (
    <span
      className={`${className} browser-landing__play-store-status`}
      aria-disabled="true"
    >
      <PlayStoreIcon />
      <span>{label}</span>
      <small>Coming soon</small>
    </span>
  );
}

type FeatureIconKind = "voice" | "clara" | "progress";

function FeatureIcon({ kind }: { kind: FeatureIconKind }) {
  if (kind === "voice") {
    return (
      <svg viewBox="0 0 48 48" focusable="false">
        <path
          d="M24 8a6 6 0 0 0-6 6v10a6 6 0 0 0 12 0V14a6 6 0 0 0-6-6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M12 23a12 12 0 0 0 24 0M24 35v6M18 41h12"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "clara") {
    return (
      <svg viewBox="0 0 48 48" focusable="false">
        <path d="M10 24c0-10 6-16 14-16s14 6 14 16v7H10v-7Z" fill="#62b96c" />
        <path d="M14 27c0-7 4-11 10-11s10 4 10 11v7H14v-7Z" fill="#ffac68" />
        <path
          d="M15 23h7v6h-7zM26 23h7v6h-7zM22 25h4"
          fill="none"
          stroke="#202744"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M20 34h8v6h-8z" fill="#202744" />
        <path
          d="M12 22c1-7 5-11 12-11s11 4 12 11"
          fill="none"
          stroke="#27723d"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" focusable="false">
      <circle
        cx="24"
        cy="24"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M24 9v7l5-4M39 24h-7M24 39v-7l-5 4M9 24h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type FooterIconKind = "site" | "mail" | "play";

function FooterIcon({ kind }: { kind: FooterIconKind }) {
  if (kind === "mail") {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="3" y="5" width="18" height="14" rx="3" fill="none" />
        <path d="m4 7 8 6 8-6" fill="none" />
      </svg>
    );
  }

  if (kind === "play") {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M8 5.5 18 12 8 18.5v-13Z" fill="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="8.5" fill="none" />
      <path
        d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5S9.8 5.8 12 3.5Z"
        fill="none"
      />
    </svg>
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

  const goTo = (path: string) => navigate(path);
  const tapToContinueHref = "/?entry=tap";

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
          <div className="browser-landing__nav-actions">
            <a
              className="landing-button landing-button--quiet"
              href={tapToContinueHref}
              target="_blank"
              rel="noreferrer"
            >
              Join
            </a>
          </div>
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
                className="landing-button landing-button--outline"
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

          <div
            className="browser-landing__hero-visual"
            aria-label="A preview of the ReaDirect reading journey"
          >
            <div className="landing-orbit landing-orbit--one" />
            <div className="landing-orbit landing-orbit--two" />
            <div className="landing-preview-card">
              <div className="landing-preview-card__topline">
                <span className="landing-status-dot" /> Today&apos;s reading
                journey <span>01</span>
              </div>
              <div
                className="landing-preview-card__illustration"
                aria-hidden="true"
              >
                <div className="landing-preview-card__sun" />
                <div className="landing-preview-card__hill landing-preview-card__hill--back" />
                <div className="landing-preview-card__hill landing-preview-card__hill--front" />
                <div className="landing-preview-card__book">
                  <span />
                  <span />
                </div>
              </div>
              <div className="landing-preview-card__footer">
                <div>
                  <strong>Clara&apos;s next step</strong>
                  <span>Read it. Say it. Understand it.</span>
                </div>
                <div className="landing-preview-card__progress">
                  <span style={{ width: "64%" }} />
                </div>
              </div>
            </div>
            <div className="landing-float landing-float--one">
              Listen &amp; practise <span>↗</span>
            </div>
            <div className="landing-float landing-float--two">
              Progress saved <span>✓</span>
            </div>
          </div>
        </section>

        <section
          className="browser-landing__offline-hero"
          id="offline"
          aria-labelledby="offline-title"
        >
          <div
            className="browser-landing__offline-visual"
            aria-label="A preview of ReaDirect offline mode"
          >
            <div className="offline-orbit offline-orbit--one" />
            <div className="offline-orbit offline-orbit--two" />
            <div className="offline-device">
              <div className="offline-device__topline">
                <span className="landing-status-dot" /> ReaDirect offline
                <span>01</span>
              </div>
              <div className="offline-device__screen">
                <div className="offline-device__clara">
                  <FeatureIcon kind="clara" />
                </div>
                <div className="offline-device__lesson">
                  <span>Today&apos;s reading</span>
                  <strong>Read. Say. Understand.</strong>
                  <div className="offline-device__progress">
                    <span />
                  </div>
                </div>
              </div>
              <span className="offline-device__status">
                Ready to use offline
              </span>
            </div>
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
              Offline access is coming soon.
            </span>
          </div>
        </section>

        <section
          className="browser-landing__section"
          id="about"
          aria-labelledby="about-title"
        >
          <div className="browser-landing__section-heading">
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
        </section>

        <section
          className="browser-landing__features"
          id="features"
          aria-labelledby="features-title"
        >
          <div className="browser-landing__section-heading browser-landing__section-heading--center">
            <p className="browser-landing__eyebrow">
              A little help, right on time
            </p>
            <h2 id="features-title">
              Designed around the moments that matter.
            </h2>
          </div>
          <div className="browser-landing__feature-grid">
            <article className="landing-feature-card">
              <span className="landing-feature-card__number">01</span>
              <span className="landing-feature-card__icon" aria-hidden="true">
                <FeatureIcon kind="voice" />
              </span>
              <h3>Speak with confidence</h3>
              <p>
                Practice aloud with supportive prompts that make the next
                sentence feel possible.
              </p>
            </article>
            <article className="landing-feature-card">
              <span className="landing-feature-card__number">02</span>
              <span className="landing-feature-card__icon" aria-hidden="true">
                <FeatureIcon kind="clara" />
              </span>
              <h3>Learn with Clara</h3>
              <p>
                A friendly guide turns reading routines into clear, encouraging
                steps.
              </p>
            </article>
            <article className="landing-feature-card">
              <span className="landing-feature-card__number">03</span>
              <span className="landing-feature-card__icon" aria-hidden="true">
                <FeatureIcon kind="progress" />
              </span>
              <h3>Keep your momentum</h3>
              <p>
                Lessons, activities, and progress stay connected so learners
                always know what comes next.
              </p>
            </article>
          </div>
        </section>

        <section
          className="browser-landing__contact"
          id="contact"
          aria-labelledby="contact-title"
        >
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
              No complicated setup. Just a calmer way to practise, one small win
              at a time.
            </p>
          </div>
          <div className="browser-landing__contact-actions">
            <button
              type="button"
              className="landing-button landing-button--primary"
              onClick={() => goTo("/home")}
            >
              Start reading <ArrowIcon />
            </button>
            <PlayStoreStatus
              className="landing-button landing-button--outline"
              label="Download on Play Store"
            />
          </div>
        </section>

        <footer className="browser-landing__footer">
          <div className="browser-landing__footer-main">
            <div className="browser-landing__footer-spotlight">
              <BrandMark />
              <strong>
                Reading support that meets learners where they are.
              </strong>
              <p>
                Practise aloud, learn with Clara, and keep every small win
                moving forward.
              </p>
              <PlayStoreStatus
                className="browser-landing__footer-store"
                label="Download on Google Play"
              />
              <Link
                className="browser-landing__footer-site browser-landing__footer-site--legacy"
                to="/home"
                aria-label="Use ReaDirect in Browser"
              >
                Visit readirect.org â†—
              </Link>
              <Link className="browser-landing__footer-site-clean" to="/home">
                Use ReaDirect in Browser <ArrowIcon />
              </Link>
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
            </div>
            <div className="browser-landing__footer-column browser-landing__footer-connect">
              <h3>Support</h3>
              <p>Questions, ideas, or a learner ready to begin?</p>
              <Link to="/docs/accessibility">Accessibility</Link>
              <Link to="/docs/privacy">Privacy &amp; data</Link>
              <a href="mailto:hello@readirect.org">Contact ReaDirect</a>
              <div className="browser-landing__footer-socials">
                <Link to="/home" aria-label="Open ReaDirect in Browser">
                  <FooterIcon kind="site" />
                </Link>
                <a
                  href="mailto:hello@readirect.org"
                  aria-label="Email ReaDirect"
                >
                  <FooterIcon kind="mail" />
                </a>
              </div>
            </div>
          </div>
          <div className="browser-landing__footer-meta">
            <span>© {new Date().getFullYear()} ReaDirect</span>
            <span className="browser-landing__footer-meta-clean">
              © {new Date().getFullYear()} ReaDirect
            </span>
            <span>Made for young readers, families, and schools.</span>
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
