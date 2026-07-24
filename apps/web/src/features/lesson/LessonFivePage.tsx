import { useMemo } from "react";

import {
  advanceLessonFiveItem,
  continueLessonFiveReview,
  continueLessonFiveSupport,
  getLessonFive,
  skipLessonFiveItem,
  startLessonFive,
  submitLessonFiveItem,
} from "./lessonApi";
import { SpokenTextLessonPage } from "./SpokenTextLessonPage";

export function LessonFivePage() {
  const api = useMemo(
    () => ({
      start: startLessonFive,
      get: getLessonFive,
      submit: submitLessonFiveItem,
      skip: skipLessonFiveItem,
      continueSupport: continueLessonFiveSupport,
      advance: advanceLessonFiveItem,
      continueReview: continueLessonFiveReview,
    }),
    [],
  );

  return (
    <SpokenTextLessonPage
      lessonNumber={5}
      activityKey="lesson-5"
      missionTitle="Read the passage"
      itemInstruction="Read the story aloud"
      resultFallback="Passage Explorer"
      api={api}
    />
  );
}
