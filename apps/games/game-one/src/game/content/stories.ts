// Compatibility exports for modules that still use the earlier story terminology.
// All learner-facing content now lives in the centralized mission catalog.
export {
  MISSION_IDS as STORY_IDS,
  SKILL_LABELS,
  getMission as getStory,
  type ComprehensionSkill,
  type MissionChoice as StoryChoice,
  type MissionDefinition as StoryDefinition,
  type MissionId as StoryId,
  type MissionQuestion as StoryQuestion,
  type QuestionCategory
} from "./missions";
