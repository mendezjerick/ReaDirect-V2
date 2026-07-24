import { motion, useReducedMotion } from "motion/react";

interface LessonProgressRailProps {
  current: number;
  total: number;
}

export function LessonProgressRail({
  current,
  total,
}: LessonProgressRailProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="assessment-progress"
      aria-label={`Item ${current} of ${total}`}
    >
      <span>
        Item {current}/{total}
      </span>
      <div className="assessment-progress__rail" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => {
          const complete = index < current - 1;

          return (
            <motion.i
              key={index}
              data-complete={complete || undefined}
              initial={false}
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: complete ? -2 : 0,
                      scaleY: complete ? 1 : 0.82,
                    }
              }
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          );
        })}
      </div>
    </div>
  );
}
