import { useMemo } from "react";

import {
  advanceLessonThreeItem,
  continueLessonThreeSupport,
  getLessonThree,
  skipLessonThreeItem,
  startLessonThree,
  submitLessonThreeItem,
} from "./lessonApi";
import { SpokenTextLessonPage } from "./SpokenTextLessonPage";

export function LessonThreePage() {
  const api = useMemo(
    () => ({
      start: startLessonThree,
      get: getLessonThree,
      submit: submitLessonThreeItem,
      skip: skipLessonThreeItem,
      continueSupport: continueLessonThreeSupport,
      advance: advanceLessonThreeItem,
    }),
    [],
  );

  return (
    <SpokenTextLessonPage
      lessonNumber={3}
      activityKey="lesson-3"
      missionTitle="Read the phrase"
      itemInstruction="Say the phrase"
      resultFallback="Phrase Pro"
      api={api}
    />
  );
}
