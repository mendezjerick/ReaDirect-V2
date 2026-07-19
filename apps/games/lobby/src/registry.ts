/**
 * The lobby registry is deliberately owner-controlled.
 *
 * Game manifests are added here only after their acceptance checklist passes.
 * Unfinished game slots must not appear in learner or guest navigation.
 */
export const registeredGames = [] as const;
