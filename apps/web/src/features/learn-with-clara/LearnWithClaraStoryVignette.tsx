import { motion, useReducedMotion } from "motion/react";

interface LearnWithClaraStoryVignetteProps {
  sceneKey: string;
}

const sceneLabels: Record<string, string> = {
  "chapter-1-story-opening":
    "A sheet of paper with an enormous letter C and very little room left.",
  "chapter-1-story-detail":
    "The remaining letters in Clara squeeze into the corner beside a giant C.",
  "chapter-1-story-close":
    "A fresh sheet shows Clara written with evenly spaced letters.",
  "chapter-1-story-return":
    "The story page closes and the letters A, B, and C return.",
};

const smallLetters = [
  { letter: "L", x: 145, size: 30 },
  { letter: "A", x: 174, size: 26 },
  { letter: "R", x: 199, size: 22 },
  { letter: "A", x: 221, size: 18 },
] as const;

const balancedLetters = ["C", "L", "A", "R", "A"] as const;
const returnLetters = ["A", "B", "C"] as const;

export function LearnWithClaraStoryVignette({
  sceneKey,
}: LearnWithClaraStoryVignetteProps) {
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion ? false : { opacity: 0, y: 12 };
  const transition = { duration: 0.55, ease: "easeOut" as const };

  return (
    <figure
      className="learn-with-clara-story"
      role="img"
      aria-label={sceneLabels[sceneKey] ?? "Ma'am Clara's letter story."}
    >
      <svg
        className="learn-with-clara-story__canvas"
        viewBox="0 0 320 176"
        aria-hidden="true"
      >
        {sceneKey === "chapter-1-story-return" ? (
          <motion.g initial={enter} animate={{ opacity: 1, y: 0 }}>
            <motion.g
              animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <rect
                className="learn-with-clara-story__book-depth"
                x="73"
                y="110"
                width="174"
                height="23"
                rx="7"
              />
              <rect
                className="learn-with-clara-story__book"
                x="69"
                y="102"
                width="174"
                height="23"
                rx="7"
              />
              <path
                className="learn-with-clara-story__book-line"
                d="M156 104v20"
              />
            </motion.g>

            {returnLetters.map((letter, index) => (
              <motion.g
                key={letter}
                initial={
                  reduceMotion ? false : { opacity: 0, y: 18, scale: 0.82 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...transition, delay: index * 0.14 }}
              >
                <rect
                  className="learn-with-clara-story__letter-tile-depth"
                  x={88 + index * 55}
                  y="39"
                  width="42"
                  height="48"
                  rx="10"
                />
                <rect
                  className="learn-with-clara-story__letter-tile"
                  x={88 + index * 55}
                  y="34"
                  width="42"
                  height="48"
                  rx="10"
                />
                <text
                  className="learn-with-clara-story__return-letter"
                  x={109 + index * 55}
                  y="68"
                  textAnchor="middle"
                >
                  {letter}
                </text>
              </motion.g>
            ))}
          </motion.g>
        ) : (
          <>
            <rect
              className="learn-with-clara-story__paper-depth"
              x="49"
              y="25"
              width="224"
              height="132"
              rx="13"
            />
            <motion.rect
              className="learn-with-clara-story__paper"
              x="45"
              y="19"
              width="224"
              height="132"
              rx="13"
              initial={enter}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
            />

            {sceneKey === "chapter-1-story-opening" ? (
              <motion.g initial={enter} animate={{ opacity: 1, y: 0 }}>
                <motion.text
                  className="learn-with-clara-story__giant-letter"
                  x="76"
                  y="127"
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, scale: 0.62, originX: 0.5, originY: 1 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.75, ease: "backOut" }}
                >
                  C
                </motion.text>
                <motion.g
                  initial={
                    reduceMotion ? false : { opacity: 0, x: 22, rotate: 8 }
                  }
                  animate={{ opacity: 1, x: 0, rotate: -7 }}
                  transition={{ ...transition, delay: 0.55 }}
                >
                  <rect
                    className="learn-with-clara-story__pencil"
                    x="202"
                    y="72"
                    width="51"
                    height="13"
                    rx="5"
                  />
                  <path
                    className="learn-with-clara-story__pencil-tip"
                    d="m196 78 8-7v14Z"
                  />
                </motion.g>
                <motion.text
                  className="learn-with-clara-story__oh-no"
                  x="221"
                  y="115"
                  textAnchor="middle"
                  initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transition, delay: 0.9 }}
                >
                  oh no!
                </motion.text>
              </motion.g>
            ) : null}

            {sceneKey === "chapter-1-story-detail" ? (
              <motion.g initial={enter} animate={{ opacity: 1, y: 0 }}>
                <text
                  className="learn-with-clara-story__detail-c"
                  x="72"
                  y="124"
                >
                  C
                </text>
                {smallLetters.map(({ letter, x, size }, index) => (
                  <motion.text
                    key={`${letter}-${x}`}
                    className="learn-with-clara-story__small-letter"
                    x={x}
                    y="119"
                    style={{ fontSize: size }}
                    initial={
                      reduceMotion ? false : { opacity: 0, x: -18, scale: 1.25 }
                    }
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ ...transition, delay: 0.18 + index * 0.16 }}
                  >
                    {letter}
                  </motion.text>
                ))}
                <motion.path
                  className="learn-with-clara-story__ant-path"
                  d="M141 137c26 8 60 7 91-2"
                  pathLength="1"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              </motion.g>
            ) : null}

            {sceneKey === "chapter-1-story-close" ? (
              <motion.g initial={enter} animate={{ opacity: 1, y: 0 }}>
                {balancedLetters.map((letter, index) => (
                  <motion.text
                    key={`${letter}-${index}`}
                    className="learn-with-clara-story__balanced-letter"
                    x={81 + index * 39}
                    y="108"
                    textAnchor="middle"
                    initial={
                      reduceMotion ? false : { opacity: 0, y: -12, scale: 0.86 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...transition, delay: index * 0.12 }}
                  >
                    {letter}
                  </motion.text>
                ))}
                <motion.path
                  className="learn-with-clara-story__smile"
                  d="M124 128c20 14 52 14 72 0"
                  pathLength="1"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, delay: 0.65 }}
                />
              </motion.g>
            ) : null}
          </>
        )}
      </svg>
      <figcaption className="visually-hidden">
        {sceneLabels[sceneKey] ?? "Ma'am Clara's letter story."}
      </figcaption>
    </figure>
  );
}
