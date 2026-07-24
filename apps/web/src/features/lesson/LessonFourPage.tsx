import { useMemo } from "react";

import {
  advanceLessonFourItem,
  continueLessonFourSupport,
  getLessonFour,
  skipLessonFourItem,
  startLessonFour,
  submitLessonFourItem,
} from "./lessonApi";
import { SpokenTextLessonPage } from "./SpokenTextLessonPage";

export function LessonFourPage() {
  const api = useMemo(
    () => ({
      start: startLessonFour,
      get: getLessonFour,
      submit: submitLessonFourItem,
      skip: skipLessonFourItem,
      continueSupport: continueLessonFourSupport,
      advance: advanceLessonFourItem,
    }),
    [],
  );

  return (
    <SpokenTextLessonPage
      lessonNumber={4}
      activityKey="lesson-4"
      missionTitle="Read the sentence"
      itemInstruction="Say the sentence"
      resultFallback="Sentence Star"
      api={api}
    />
  );
}
