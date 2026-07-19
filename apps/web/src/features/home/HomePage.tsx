import { BigButton } from "../../components/ui/BigButton";

function BookIcon() {
  return (
    <svg
      className="home-page__read-icon"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 6.5c4.8-.7 8.8.4 12 3.2v16.1c-3.2-2.8-7.2-3.9-12-3.2V6.5Z" />
      <path d="M28 6.5c-4.8-.7-8.8.4-12 3.2v16.1c3.2-2.8 7.2-3.9 12-3.2V6.5Z" />
    </svg>
  );
}

export function HomePage() {
  return (
    <main
      className="home-page"
      aria-label="ReaDirect home"
      data-route-focus
      tabIndex={-1}
    >
      <h1 className="visually-hidden">ReaDirect home</h1>

      <section className="home-page__actions" aria-label="Home actions">
        <BigButton
          className="home-page__read-button"
          leadingIcon={<BookIcon />}
        >
          Let&apos;s Read!
        </BigButton>

        <BigButton
          className="home-page__staff-button"
          variant="secondary"
          size="regular"
        >
          Staff login
        </BigButton>
      </section>
    </main>
  );
}
