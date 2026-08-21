import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { PublicInfoShell } from "../public-info/PublicInfoShell";

import "./public-docs.css";

type DocSlug =
  | "getting-started"
  | "user-guide"
  | "for-teachers"
  | "for-schools"
  | "system-overview"
  | "testing"
  | "faq"
  | "accessibility"
  | "privacy";

type DocSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type DocPage = {
  slug: DocSlug;
  group: string;
  title: string;
  kicker: string;
  description: string;
  sections: DocSection[];
};

// Normalize a handful of legacy strings that were authored with a mismatched
// text encoding before they reach the public documentation UI.
function legacyCleanPublicCopy(value: string) {
  return value
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u2020\u2019/g, "->")
    .replace(/\u00c2\u00a9/g, "©");
}

function cleanPublicCopy(value: string) {
  return legacyCleanPublicCopy(value).replace(
    /\u00c2\u00a9/g,
    String.fromCharCode(169),
  );
}

const DOC_GROUPS = [
  {
    label: "Get started",
    links: [
      ["Getting Started", "getting-started"],
      ["User Guide", "user-guide"],
    ],
  },
  {
    label: "For educators",
    links: [
      ["For Teachers", "for-teachers"],
      ["For Schools", "for-schools"],
    ],
  },
  {
    label: "Understand ReaDirect",
    links: [
      ["System Overview", "system-overview"],
      ["Testing & Quality", "testing"],
    ],
  },
  {
    label: "Help & support",
    links: [
      ["FAQ", "faq"],
      ["Accessibility", "accessibility"],
      ["Privacy Policy", "privacy"],
    ],
  },
] as const;

const DOC_PAGES: Record<DocSlug, DocPage> = {
  "getting-started": {
    slug: "getting-started",
    group: "Get started",
    title: "Getting Started",
    kicker: "A calm first step",
    description:
      "Use this quick guide to open ReaDirect, sign in, and find the first activity that fits your learning moment.",
    sections: [
      {
        heading: "Choose how you will use ReaDirect",
        paragraphs: [
          "On the web, open ReaDirect in a supported browser and choose Use in Browser from the landing page. The mobile app keeps its Tap to Continue entry flow so learners can begin from a familiar screen.",
          "If your school has provided a ReaDirect address or app, use that approved entry point. Do not share learner sign-in details with anyone else.",
        ],
      },
      {
        heading: "Sign in and find your workspace",
        bullets: [
          "Learners sign in with the account details supplied by their school, then arrive at the learner dashboard.",
          "Open Reading Journey to see the Diagnostic, available lessons, and Final Assessment status.",
          "Open Games or Learn with Clara when you want optional practice outside the main journey.",
          "Use the account menu to review the current profile and sign out when you finish on a shared device.",
        ],
      },
      {
        heading: "Microphone permissions",
        paragraphs: [
          "Some oral-reading activities ask for microphone access. Allow the permission only when you are ready to record, and choose the browser or device setting that lets ReaDirect use the microphone for that activity.",
          "If permission was denied, open the browser or device site settings, allow the microphone for ReaDirect, and retry the activity. Reading and navigation can still be reviewed without starting a recording.",
        ],
      },
      {
        heading: "If something does not work",
        bullets: [
          "Refresh once and retry the action; keep the ReaDirect tab open while a request is completing.",
          "Check that the device is online for browser activities and that the learner is still signed in.",
          "For speech activities, check microphone permission and make sure another app is not using the microphone.",
          "If the problem continues, note the page and action that failed and contact your school or ReaDirect support.",
        ],
      },
    ],
  },
  "user-guide": {
    slug: "user-guide",
    group: "Get started",
    title: "User Guide",
    kicker: "The learner experience",
    description:
      "A concise map of the learner-facing areas currently available in ReaDirect.",
    sections: [
      {
        heading: "Learner dashboard",
        paragraphs: [
          "The dashboard is the learner’s home base. It brings together the Reading Journey, optional Games, Learn with Clara, achievements, and account or progress details that are available for the signed-in learner.",
        ],
      },
      {
        heading: "Reading Journey",
        paragraphs: [
          "Reading Journey shows the current Diagnostic, lesson, and Final Assessment states. Start with the Diagnostic when it is required. The screen explains which activities are available and preserves a completed or in-progress state when you return.",
          "The current product lets learners open available lessons after the Diagnostic; the exact academic sequence is controlled by the school’s approved learning guidance. ReaDirect does not present these activities as an official CRLA assessment unless a school has separately authorized that use.",
        ],
      },
      {
        heading: "Learn with Clara",
        paragraphs: [
          "Learn with Clara is an optional guided practice area. Clara can support letter, word, and sentence practice with encouraging prompts and speech-enabled activities where the device and permissions allow it.",
        ],
      },
      {
        heading: "Games and progress",
        bullets: [
          "Games are optional practice, not a replacement for the Reading Journey.",
          "Signed-in learners and Guest Readers can open supported games. Guest game progress stays only in that browser and can be reset from the Guest dashboard.",
          "Game progress is kept separate from academic assessment and lesson progression.",
          "Use the visible sign-out action when you finish on a shared device.",
        ],
      },
    ],
  },
  "for-teachers": {
    slug: "for-teachers",
    group: "For educators",
    title: "For Teachers",
    kicker: "A clearer view of learner practice",
    description:
      "ReaDirect gives teachers a role-scoped workspace for following learner activity and using evidence to support instruction.",
    sections: [
      {
        heading: "Teacher quick start",
        bullets: [
          "Confirm that you are in the correct school and class workspace before reviewing activity.",
          "Open Learners to check the roster, then choose Reading Journey or progress views for the learner you are supporting.",
          "Use the next visible activity to plan one small instructional step; treat scores as evidence to discuss, not as the whole learner story.",
          "Return to the class view when you are finished so the next teacher action is easy to find.",
        ],
      },
      {
        heading: "What teachers can do",
        bullets: [
          "View the learners assigned to the teacher’s class and school scope.",
          "Follow Diagnostic, lesson, and Final Assessment completion where those records are available.",
          "Review class progress reports and instructional summaries.",
          "Open learner details and review progress, transcripts, scoring outcomes, and instructional evidence within the teacher's assigned scope.",
          "Create or manage learner accounts using the staff tools provided by the school.",
        ],
      },
      {
        heading: "A safe teacher smoke test",
        bullets: [
          "Use a designated QA or staff account, never a real learner account, when checking a new release.",
          "Confirm that only the expected class and school learners are visible.",
          "Open one learner's progress, reload once, and return to the class list to check that the session and scope remain intact.",
          "Sign out and verify that opening the protected teacher page returns to staff sign-in.",
          "Record the page, device or browser, viewport, time, and a non-sensitive description if something fails.",
        ],
      },
      {
        heading: "Use evidence with context",
        paragraphs: [
          "ReaDirect is intended to support teacher judgment, not replace it. Progress indicators, transcripts, and assessment evidence should be interpreted alongside classroom knowledge and the school’s approved reading practice.",
        ],
      },
      {
        heading: "Bring ReaDirect to your class",
        paragraphs: [
          "Talk with your school coordinator about learner setup, teacher access, and the best way to introduce ReaDirect to your class.",
        ],
      },
    ],
  },
  "for-schools": {
    slug: "for-schools",
    group: "For educators",
    title: "For Schools",
    kicker: "A shared reading support space",
    description:
      "ReaDirect helps schools connect learner practice, teacher visibility, and school-level support without exposing private records publicly.",
    sections: [
      {
        heading: "A role-based model",
        paragraphs: [
          "Schools can organize learners, teachers, and school administrators in separate workspaces. Each role sees the tools and records appropriate to its responsibilities, while learner accounts remain protected behind sign-in.",
        ],
      },
      {
        heading: "School implementation",
        bullets: [
          "Agree on the learner groups, teachers, and school coordinator responsibilities before onboarding.",
          "Provide learners with their own sign-in details through the school’s normal protected process.",
          "Use reports and progress views to identify where teacher follow-up may help.",
          "Plan microphone permissions, device access, and a support contact before speech activities begin.",
        ],
      },
      {
        heading: "Support and stewardship",
        paragraphs: [
          "School teams remain responsible for instructional decisions and for following their own privacy, safeguarding, and data-handling procedures. ReaDirect’s public pages do not publish school records, learner codes, or administrative credentials.",
        ],
      },
    ],
  },
  "system-overview": {
    slug: "system-overview",
    group: "Understand ReaDirect",
    title: "System Overview",
    kicker: "What ReaDirect does",
    description:
      "ReaDirect combines guided reading practice with clear progress views for learners, teachers, and schools.",
    sections: [
      {
        heading: "The public picture",
        paragraphs: [
          "ReaDirect can process selected reading activities using speech-recognition technology to support guided oral-reading practice. It also provides structured reading activities, optional Clara practice, games, and role-specific progress support.",
        ],
      },
      {
        heading: "A simple way to think about the system",
        bullets: [
          "Learner → ReaDirect",
          "ReaDirect → Reading activities, Clara practice, and optional games",
          "Progress → Learner feedback and teacher or school support",
        ],
      },
      {
        heading: "Designed around the learner",
        paragraphs: [
          "The learner experience keeps the next action visible: read, listen, speak, practise, and return to the journey. Staff workspaces provide additional context without putting internal services or private infrastructure on the public page.",
        ],
      },
    ],
  },
  testing: {
    slug: "testing",
    group: "Understand ReaDirect",
    title: "Testing & Quality",
    kicker: "Evidence, not absolute guarantees",
    description:
      "ReaDirect uses targeted automated, integration, and browser-based checks across key system areas. Testing coverage continues to evolve as ReaDirect develops.",
    sections: [
      {
        heading: "Functional testing",
        bullets: [
          "Authentication, protected navigation, and role boundaries",
          "Learner dashboard, Reading Journey, assessments, and lessons",
          "Learn with Clara, games, teacher workflows, and school or admin workflows",
        ],
      },
      {
        heading: "A safe teacher smoke test",
        paragraphs: [
          "A smoke test is a short, non-destructive check that the most important path is available after a change. Use a provisioned QA account and stop if a result could alter real learner work.",
        ],
        bullets: [
          "Sign in, confirm the role and school scope, and open the teacher workspace.",
          "Check the learner list, one progress view, one reload, and one protected-route sign-out check.",
          "Repeat the same route at a narrow viewport to catch clipped controls or horizontal overflow.",
        ],
      },
      {
        heading: "Responsive and browser testing",
        paragraphs: [
          "Responsive layouts are checked across desktop, tablet, portrait mobile, and landscape mobile sizes where appropriate. Browser checks use a Chromium-based environment in the project’s automated verification workflow, alongside focused UI tests.",
        ],
      },
      {
        heading: "Before reporting an issue",
        bullets: [
          "Include the page or route and the action that was attempted.",
          "Describe the expected result and the observed result in plain language.",
          "Include the browser, device, viewport size, and whether reload or retry changed the outcome.",
          "Leave out passwords, learner codes, private URLs, recordings, and personal learner information.",
        ],
      },
      {
        heading: "Speech, games, and persistence",
        bullets: [
          "Speech-recognition and speech-output paths receive focused readiness, error, and recovery checks.",
          "Game Alpha, Game One, and OtterTale have focused runtime and persistence tests where those modules are active.",
          "Persistent learner and game records receive ownership, isolation, and recovery checks at a high level.",
        ],
      },
      {
        heading: "Security and privacy testing",
        paragraphs: [
          "Testing includes high-level checks that signed-out users cannot open protected learner or staff areas and that role-scoped records remain separated. Public documentation intentionally omits private endpoints, credentials, attack procedures, and internal QA evidence.",
        ],
      },
    ],
  },
  faq: {
    slug: "faq",
    group: "Help & support",
    title: "Frequently Asked Questions",
    kicker: "Quick answers",
    description:
      "Common questions about using ReaDirect in a browser, on a device, and in a school-supported learning routine.",
    sections: [
      {
        heading: "What is ReaDirect?",
        paragraphs: [
          "ReaDirect is a reading support system for elementary learners. It combines oral-reading practice, comprehension activities, optional Clara guidance, games, and progress support.",
        ],
      },
      {
        heading: "Who is ReaDirect for?",
        paragraphs: [
          "Learners use the reading activities, while teachers and school teams use role-specific workspaces to support practice and review progress.",
        ],
      },
      {
        heading: "Can I use ReaDirect on a phone or in a browser?",
        paragraphs: [
          "Yes. ReaDirect has a browser landing and learner flow, and the mobile app keeps a Tap to Continue entry flow. The exact features available depend on the current device, account, and school setup.",
        ],
      },
      {
        heading: "Do I need a microphone?",
        paragraphs: [
          "Only for activities that ask you to read aloud or use speech support. The browser or device will request permission when needed.",
        ],
      },
      {
        heading: "What is Learn with Clara?",
        paragraphs: [
          "It is an optional guided practice area where Clara encourages letter, word, and sentence work.",
        ],
      },
      {
        heading: "Are games required?",
        paragraphs: [
          "No. Games are optional practice and do not replace the Reading Journey or its assessments.",
        ],
      },
      {
        heading: "Does ReaDirect save game progress?",
        paragraphs: [
          "Signed-in game modules can save game-specific progress when persistence is active for that module. Game progress remains separate from academic progression.",
        ],
      },
      {
        heading: "What should I do if speech recognition misses a word?",
        paragraphs: [
          "Check microphone permission, reduce background noise, and retry the bounded activity prompt. If the problem continues, ask a teacher or school coordinator for help.",
        ],
      },
      {
        heading: "Who do I contact for help?",
        paragraphs: [
          "Start with your school coordinator or teacher. For public questions, email hello@readirect.org with the page and general issue; never include passwords, learner codes, or private learner information.",
        ],
      },
    ],
  },
  accessibility: {
    slug: "accessibility",
    group: "Help & support",
    title: "Accessibility",
    kicker: "Designed with access in mind",
    description:
      "ReaDirect is designed with accessibility considerations across reading, navigation, and recovery states.",
    sections: [
      {
        heading: "Current considerations",
        bullets: [
          "Responsive layouts for desktop, tablet, portrait mobile, and landscape mobile use.",
          "Semantic headings, labeled actions, readable status messages, and visible focus treatment where supported.",
          "Text alternatives for meaningful interface icons and clear labels for public links.",
          "Bounded loading, error, and retry states instead of silent or indefinite failures.",
        ],
      },
      {
        heading: "Speech alternatives",
        paragraphs: [
          "Speech-supported activities are optional within the broader experience. When microphone access is unavailable, learners can still use the surrounding navigation and non-recording areas. School teams can help choose an appropriate alternative activity.",
        ],
      },
      {
        heading: "Need accessibility assistance?",
        paragraphs: [
          "Ask your teacher or school coordinator first, or contact hello@readirect.org with the page and the type of support needed. Please do not send private learner details by email.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    group: "Help & support",
    title: "Privacy Policy",
    kicker: "Effective 21 August 2026",
    description:
      "This Privacy Policy explains how ReaDirect collects, uses, and protects information when people use the ReaDirect website and mobile app.",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "ReaDirect operates the ReaDirect website and mobile app. If you have a privacy question or want to request access to or deletion of personal information, contact readirect.exe@gmail.com.",
        ],
      },
      {
        heading: "Information we use",
        bullets: [
          "Account and profile information used to sign in and provide the appropriate learner, teacher, school, or administrator workspace.",
          "Learning activity, assessment, transcript, score, and progress information used to provide reading activities, show progress, and support the teacher or school views authorized for that learner.",
          "Game-specific progress for signed-in game modules where persistence is active.",
        ],
      },
      {
        heading: "Microphone and voice recordings",
        paragraphs: [
          "ReaDirect asks for microphone permission only when a learner chooses an oral-reading activity that needs a recording. A voice recording is sent over HTTPS to ReaDirect's speech-recognition service for immediate checking and scoring.",
          "Voice recordings are deleted after checking or submission. They are not retained for teacher replay. ReaDirect may keep the resulting transcript, score, and instructional evidence needed to provide the learning service.",
        ],
      },
      {
        heading: "How we use and share information",
        paragraphs: [
          "We use information only to operate, secure, support, and improve ReaDirect's learning activities and role-scoped progress views. ReaDirect does not sell learner data or use it for advertising.",
          "ReaDirect uses service providers to host and operate the application, database, and speech-processing infrastructure. These providers process information only as needed to provide ReaDirect.",
        ],
      },
      {
        heading: "Security and retention",
        paragraphs: [
          "ReaDirect uses HTTPS for information sent between the app and its services. We keep account and learning information only for as long as it is needed to provide the service, meet school obligations, resolve support issues, or comply with applicable requirements.",
          "Learner and staff areas require authentication, and access is scoped to the account's role and school.",
        ],
      },
      {
        heading: "Your choices and requests",
        paragraphs: [
          "A learner, parent or guardian, or authorized school representative may request access to, correction of, or deletion of personal information by emailing readirect.exe@gmail.com. We may need to verify the request and may retain limited information when required for legitimate security, legal, or school-record obligations.",
          "Schools and families remain responsible for following their own approved privacy, safeguarding, and consent processes when using ReaDirect with learners.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "We may update this Privacy Policy when ReaDirect's practices change. The effective date at the top of this page shows when it was last updated.",
        ],
      },
    ],
  },
};

function DocsNavigation({ activeSlug }: { activeSlug?: string }) {
  return (
    <>
      <nav className="public-docs__side-nav" aria-label="Documentation">
        <Link className="public-docs__side-home" to="/docs">
          Documentation home
        </Link>
        {DOC_GROUPS.map((group) => (
          <div className="public-docs__nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.links.map(([label, slug]) => (
              <Link
                key={slug}
                to={`/docs/${slug}`}
                aria-current={activeSlug === slug ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <details className="public-docs__mobile-nav">
        <summary>Browse documentation</summary>
        <nav aria-label="Documentation pages">
          <Link to="/docs">Documentation home</Link>
          {DOC_GROUPS.flatMap((group) =>
            group.links.map(([label, slug]) => (
              <Link
                key={slug}
                to={`/docs/${slug}`}
                aria-current={activeSlug === slug ? "page" : undefined}
              >
                {label}
              </Link>
            )),
          )}
        </nav>
      </details>
    </>
  );
}

function DocsShell({
  activeSlug,
  children,
}: {
  activeSlug?: string;
  children: ReactNode;
}) {
  return (
    <PublicInfoShell className="public-docs">
      <div className="public-docs__layout">
        <DocsNavigation activeSlug={activeSlug} />
        {children}
      </div>
    </PublicInfoShell>
  );
}

function DocsHome() {
  return (
    <DocsShell>
      <section className="public-docs__home" aria-labelledby="docs-title">
        <div className="public-docs__home-hero">
          <p className="public-docs__eyebrow">Public help area</p>
          <h1 id="docs-title">ReaDirect Documentation</h1>
          <p className="public-docs__lead">
            Everything you need to understand, use, and support ReaDirect.
          </p>
        </div>
        <div className="public-docs__card-grid">
          {DOC_GROUPS.map((group) => (
            <section className="public-docs__category" key={group.label}>
              <p className="public-docs__category-label">{group.label}</p>
              <div>
                {group.links.map(([label, slug]) => (
                  <Link
                    className="public-docs__category-link"
                    to={`/docs/${slug}`}
                    key={slug}
                  >
                    <span>{label}</span>
                    <PixelIcon name="arrow-right" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="public-docs__home-note">
          <strong>Need a human starting point?</strong>
          <span>
            Learners and families can begin with Getting Started. Teachers and
            coordinators can jump to their role guide.
          </span>
        </div>
      </section>
    </DocsShell>
  );
}

function DocsArticle({ page }: { page: DocPage }) {
  return (
    <article className="public-docs__article" aria-labelledby="doc-page-title">
      <div className="public-docs__article-hero">
        <div className="public-docs__breadcrumbs" aria-label="Breadcrumb">
          <Link to="/docs">Documentation</Link>
          <span aria-hidden="true">/</span>
          <span>{page.group}</span>
        </div>
        <p className="public-docs__eyebrow">{page.kicker}</p>
        <h1 id="doc-page-title">{page.title}</h1>
        <p className="public-docs__lead">{cleanPublicCopy(page.description)}</p>
      </div>

      {page.slug === "for-teachers" ? (
        <section
          className="public-docs__quick-start"
          aria-labelledby="teacher-quick-start-title"
        >
          <div className="public-docs__quick-start-heading">
            <p className="public-docs__eyebrow">Start here</p>
            <h2 id="teacher-quick-start-title">
              A calm routine for every class.
            </h2>
            <p>
              Move from roster to evidence to the next small teaching step
              without losing the context around the learner.
            </p>
          </div>
          <ol className="public-docs__steps">
            <li>
              <span>01</span>
              <h3>Open your class</h3>
              <p>Check the school and class scope before you begin.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Notice the next step</h3>
              <p>
                Use progress and activity evidence to choose focused support.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Keep the learner moving</h3>
              <p>Return to the journey with one clear, encouraging action.</p>
            </li>
          </ol>
        </section>
      ) : null}

      {page.slug === "testing" ? (
        <aside
          className="public-docs__quality-callout"
          aria-label="Quality snapshot"
        >
          <p className="public-docs__eyebrow">Quality snapshot</p>
          <strong>Check the path, the role, and the recovery.</strong>
          <span>
            Good verification checks both the happy path and what happens when a
            request is interrupted.
          </span>
        </aside>
      ) : null}

      <div className="public-docs__prose">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{cleanPublicCopy(paragraph)}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{cleanPublicCopy(bullet)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      {page.slug === "for-teachers" || page.slug === "for-schools" ? (
        <div className="public-docs__article-cta">
          <strong>Bring ReaDirect to your class</strong>
          <a href="mailto:hello@readirect.org?subject=Bring%20ReaDirect%20to%20my%20class">
            Contact ReaDirect support <PixelIcon name="arrow-right" />
          </a>
        </div>
      ) : null}
      {page.slug === "for-teachers" ? (
        <nav
          className="public-docs__related"
          aria-label="Related educator guides"
        >
          <p className="public-docs__eyebrow">Keep exploring</p>
          <div>
            <Link to="/docs/testing">
              Testing &amp; Quality <PixelIcon name="arrow-right" />
            </Link>
            <Link to="/docs/for-schools">
              For Schools <PixelIcon name="arrow-right" />
            </Link>
          </div>
        </nav>
      ) : null}
    </article>
  );
}

export function PublicDocsPage() {
  const { docSlug } = useParams<{ docSlug?: string }>();

  if (!docSlug) return <DocsHome />;
  if (!(docSlug in DOC_PAGES)) return <Navigate to="/docs" replace />;

  return (
    <DocsShell activeSlug={docSlug}>
      <DocsArticle page={DOC_PAGES[docSlug as DocSlug]} />
    </DocsShell>
  );
}
