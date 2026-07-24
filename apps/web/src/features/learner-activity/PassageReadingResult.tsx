export interface PassageReadingReview {
  title: string;
  skipped: boolean;
  review_available: boolean;
  performance_band?:
    | "excellent"
    | "strong"
    | "growing"
    | "beginning"
    | "skipped"
    | "unavailable";
  reading_accuracy_percent: number | null;
  reading_seconds: number | null;
  words_per_minute: number | null;
  correct_words_per_minute: number | null;
  words: Array<{
    text: string;
    status: "correct" | "missed" | "replaced" | "unscored";
    heard: string | null;
  }>;
  extra_words: string[];
}

interface PassageReadingResultProps {
  review: PassageReadingReview;
  accuracyPercent: number | null;
}

export function PassageReadingResult({
  review,
  accuracyPercent,
}: PassageReadingResultProps) {
  return (
    <section className="assessment-passage-result">
      <div className="assessment-passage-result__heading">
        <div>
          <span>Passage reading</span>
          <h2>{review.title}</h2>
        </div>
        <div className="assessment-passage-result__facts">
          <div>
            <span>Accuracy</span>
            <strong>
              {accuracyPercent === null
                ? "Not available"
                : `${accuracyPercent}%`}
            </strong>
          </div>
          <div>
            <span>Speed</span>
            <strong>
              {review.words_per_minute === null
                ? "Not available"
                : `${review.words_per_minute} WPM`}
            </strong>
          </div>
        </div>
      </div>
      <section
        className="assessment-passage-review"
        aria-label={`Story review for ${review.title}`}
      >
        <div className="assessment-passage-review__heading">
          {review.review_available ? (
            <small>
              <i aria-hidden="true" />
              Highlighted words need another try
            </small>
          ) : null}
        </div>
        <p className="assessment-passage-review__text">
          {review.words.map((word, index) => {
            const detail =
              word.status === "replaced"
                ? `Expected ${word.text}. Heard ${word.heard}.`
                : word.status === "missed"
                  ? `The word ${word.text} was missed.`
                  : word.text;

            return (
              <span
                key={`${index}-${word.text}`}
                data-status={word.status}
                aria-label={detail}
                title={word.status === "correct" ? undefined : detail}
              >
                {word.text}{" "}
              </span>
            );
          })}
        </p>
        {review.skipped ? (
          <p className="assessment-passage-review__note">
            Passage skipped. No word review is available.
          </p>
        ) : !review.review_available ? (
          <p className="assessment-passage-review__note">
            Word details are unavailable for this reading.
          </p>
        ) : review.extra_words.length > 0 ? (
          <p className="assessment-passage-review__note">
            Extra words heard: {review.extra_words.join(", ")}
          </p>
        ) : null}
      </section>
    </section>
  );
}
