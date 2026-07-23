import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export interface LearnerActivityResultSegment {
  key: string;
  label: ReactNode;
  value: ReactNode;
  status: ReactNode;
}

interface LearnerActivityResultProps {
  ariaLabel: string;
  segments: LearnerActivityResultSegment[];
  score: ReactNode;
  maximum: ReactNode;
  level: ReactNode;
}

export function LearnerActivityResult({
  ariaLabel,
  segments,
  score,
  maximum,
  level,
}: LearnerActivityResultProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="assessment-result"
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.32 }}
    >
      <div className="assessment-result__segments" aria-label={ariaLabel}>
        {segments.map((segment, index) => (
          <motion.div
            key={segment.key}
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.22 + index * 0.1 }}
          >
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
            <small>{segment.status}</small>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="assessment-result__score"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.55, duration: 0.35 }}
      >
        <strong>{score}</strong>
        <span>/ {maximum}</span>
      </motion.div>

      <motion.p
        className="assessment-result__level"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.9 }}
      >
        {level}
      </motion.p>

      <div className="assessment-result__particles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
    </motion.section>
  );
}
