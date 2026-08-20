import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { LearnWithClaraLettersScene } from "./learnWithClaraLettersApi";
import type { claraLettersCopy } from "./learnWithClaraCopy";

interface LearnWithClaraLetterParadeProps {
  scene: LearnWithClaraLettersScene;
  copy: (typeof claraLettersCopy)["en"] | (typeof claraLettersCopy)["fil"];
  interactive?: boolean;
  wrongChoice: string;
  foundChoice: string;
  choosing: boolean;
  onChoose: (choice: string) => void;
}

const paradeLetters = ["A", "B", "C", "D", "E"] as const;

function foundCountFor(scene: LearnWithClaraLettersScene) {
  if (scene.kind === "completion") {
    return 5;
  }

  const current = scene.item_progress?.current ?? 1;
  return scene.kind === "teach" ? current : Math.max(0, current - 1);
}

function StationProp({ letter }: { letter: string }) {
  const reduceMotion = useReducedMotion();
  const gentle = reduceMotion
    ? undefined
    : {
        y: [0, -7, 0],
        rotate: [-1, 1, -1],
      };

  if (letter === "A") {
    return (
      <motion.g
        animate={gentle}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        <path
          className="parade-story__arch"
          d="M490 242V135a76 76 0 0 1 152 0v107"
        />
        <circle className="parade-story__apple" cx="515" cy="121" r="17" />
        <circle className="parade-story__apple" cx="610" cy="102" r="15" />
        <path
          className="parade-story__leaf"
          d="M516 103c10-12 22-8 24 0-10 4-18 4-24 0Z"
        />
      </motion.g>
    );
  }

  if (letter === "B") {
    return (
      <motion.g animate={gentle} transition={{ duration: 2, repeat: Infinity }}>
        {[
          [520, 102, "parade-story__balloon--one"],
          [575, 76, "parade-story__balloon--two"],
          [626, 112, "parade-story__balloon--three"],
        ].map(([cx, cy, className]) => (
          <g key={`${cx}`}>
            <ellipse
              className={String(className)}
              cx={Number(cx)}
              cy={Number(cy)}
              rx="29"
              ry="35"
            />
            <path
              className="parade-story__rope"
              d={`M${cx} ${Number(cy) + 34} 575 238`}
            />
          </g>
        ))}
        <rect
          className="parade-story__float"
          x="512"
          y="220"
          width="126"
          height="44"
          rx="15"
        />
      </motion.g>
    );
  }

  if (letter === "C") {
    return (
      <motion.g
        animate={reduceMotion ? undefined : { rotate: [0, -2, 2, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        <path
          className="parade-story__banner-pole"
          d="M500 90v172M644 90v172"
        />
        <path
          className="parade-story__banner"
          d="M500 104c42 18 102-18 144 0v94c-42-18-102 18-144 0Z"
        />
        <path
          className="parade-story__banner-line"
          d="M530 153c26-25 64-25 86 0-22 25-60 25-86 0Z"
        />
      </motion.g>
    );
  }

  if (letter === "D") {
    return (
      <motion.g
        animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 0.72, repeat: Infinity }}
      >
        <ellipse
          className="parade-story__drum-side"
          cx="574"
          cy="139"
          rx="70"
          ry="28"
        />
        <rect
          className="parade-story__drum"
          x="504"
          y="138"
          width="140"
          height="94"
        />
        <ellipse
          className="parade-story__drum-side"
          cx="574"
          cy="232"
          rx="70"
          ry="28"
        />
        <path
          className="parade-story__drum-line"
          d="m518 157 112 56M630 157 518 213"
        />
        <motion.path
          className="parade-story__drum-stick"
          d="m544 83 43 68"
          animate={reduceMotion ? undefined : { rotate: [0, 14, 0] }}
          transition={{ duration: 0.55, repeat: Infinity }}
        />
      </motion.g>
    );
  }

  return (
    <motion.g animate={gentle} transition={{ duration: 1.8, repeat: Infinity }}>
      <rect
        className="parade-story__wagon"
        x="495"
        y="163"
        width="157"
        height="78"
        rx="17"
      />
      <path className="parade-story__wagon-roof" d="m510 164 63-55 65 55Z" />
      <circle className="parade-story__wheel" cx="528" cy="251" r="20" />
      <circle className="parade-story__wheel" cx="618" cy="251" r="20" />
      <path
        className="parade-story__star"
        d="m574 179 8 16 18 3-13 13 3 19-16-9-16 9 3-19-13-13 18-3Z"
      />
    </motion.g>
  );
}

function ParadeLine({
  foundCount,
  finale,
}: {
  foundCount: number;
  finale: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <g aria-hidden="true">
      <path className="parade-story__track" d="M56 306h608" />
      {paradeLetters.map((letter, index) => {
        const found = index < foundCount;
        const x = 102 + index * 119;

        return (
          <motion.g
            key={letter}
            initial={false}
            animate={
              found && !reduceMotion
                ? {
                    x: finale ? [0, 8, 0] : 0,
                    y: [0, -5, 0],
                  }
                : { x: 0, y: 0 }
            }
            transition={{
              duration: finale ? 0.75 : 1.4,
              delay: index * 0.1,
              repeat: finale ? Infinity : 0,
            }}
          >
            <rect
              className={
                found
                  ? "parade-story__pair parade-story__pair--found"
                  : "parade-story__pair"
              }
              x={x - 38}
              y="281"
              width="76"
              height="48"
              rx="14"
            />
            <text
              className={
                found
                  ? "parade-story__pair-text parade-story__pair-text--found"
                  : "parade-story__pair-text"
              }
              x={x}
              y="313"
              textAnchor="middle"
            >
              {found ? `${letter}${letter.toLowerCase()}` : "?"}
            </text>
          </motion.g>
        );
      })}
    </g>
  );
}

function OpeningScene({ title }: { title: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.g
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <text
        className="parade-story__opening-title"
        x="360"
        y="105"
        textAnchor="middle"
      >
        {title}
      </text>
      {paradeLetters.map((letter, index) => (
        <motion.g
          key={letter}
          initial={reduceMotion ? false : { opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, type: "spring" }}
        >
          <circle
            className="parade-story__capital-badge"
            cx={196 + index * 82}
            cy="178"
            r="31"
          />
          <text
            className="parade-story__capital"
            x={196 + index * 82}
            y="191"
            textAnchor="middle"
          >
            {letter}
          </text>
        </motion.g>
      ))}
      {["a", "b", "c", "d", "e"].map((letter, index) => (
        <motion.text
          key={letter}
          className="parade-story__scattered-letter"
          x={176 + index * 92}
          y="239"
          initial={reduceMotion ? false : { x: 0, y: 0, opacity: 1 }}
          animate={
            reduceMotion
              ? { opacity: 0.35 }
              : {
                  x: index % 2 === 0 ? -88 - index * 7 : 86 + index * 5,
                  y: index % 2 === 0 ? -62 : 35,
                  rotate: index % 2 === 0 ? -34 : 36,
                  opacity: 0.2,
                }
          }
          transition={{
            delay: 0.55 + index * 0.1,
            duration: 1.05,
            ease: "easeOut",
          }}
        >
          {letter}
        </motion.text>
      ))}
      <motion.path
        className="parade-story__wind"
        d="M118 211c92-42 176 51 284-7 70-38 124-26 188-4"
        pathLength="1"
        initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 1.2, delay: 0.4 }}
      />
    </motion.g>
  );
}

function ActiveLetterScene({
  scene,
  foundChoice,
  stationNames,
}: {
  scene: LearnWithClaraLettersScene;
  foundChoice: string;
  stationNames:
    | typeof claraLettersCopy.en.parade.stationNames
    | typeof claraLettersCopy.fil.parade.stationNames;
}) {
  const reduceMotion = useReducedMotion();
  const [capital, lowercase] = scene.display_text.split(" ");
  const teaching = scene.kind === "teach";

  return (
    <motion.g
      key={scene.key}
      initial={reduceMotion ? false : { opacity: 0, x: 35 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: -25 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <rect
        className="parade-story__station-sign"
        x="52"
        y="59"
        width="238"
        height="44"
        rx="14"
      />
      <text
        className="parade-story__station-label"
        x="171"
        y="88"
        textAnchor="middle"
      >
        {stationNames[capital as keyof typeof stationNames]}
      </text>

      <motion.g
        animate={
          reduceMotion
            ? undefined
            : teaching
              ? { y: [0, -8, 0], rotate: [0, -2, 2, 0] }
              : { y: [0, -4, 0] }
        }
        transition={{ duration: teaching ? 0.8 : 1.7, repeat: Infinity }}
      >
        <circle
          className="parade-story__capital-badge"
          cx="172"
          cy="178"
          r="66"
        />
        <text
          className="parade-story__hero-capital"
          x="172"
          y="207"
          textAnchor="middle"
        >
          {capital}
        </text>
      </motion.g>

      {teaching || foundChoice ? (
        <motion.g
          initial={reduceMotion ? false : { opacity: 0, scale: 0.35, x: 240 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 190, damping: 15 }}
        >
          <path className="parade-story__partner-line" d="M248 178h75" />
          <circle
            className="parade-story__little-badge"
            cx="382"
            cy="178"
            r="58"
          />
          <text
            className="parade-story__hero-lowercase"
            x="382"
            y="204"
            textAnchor="middle"
          >
            {lowercase}
          </text>
        </motion.g>
      ) : (
        <motion.text
          className="parade-story__waiting-mark"
          x="382"
          y="207"
          textAnchor="middle"
          animate={reduceMotion ? undefined : { scale: [1, 1.12, 1] }}
          transition={{ duration: 1.35, repeat: Infinity }}
        >
          ?
        </motion.text>
      )}

      <StationProp letter={capital} />
    </motion.g>
  );
}

function FinaleScene({ title, copy }: { title: string; copy: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.g
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.text
        className="parade-story__finale-title"
        x="360"
        y="101"
        textAnchor="middle"
        animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        {title}
      </motion.text>
      {Array.from({ length: 18 }, (_, index) => (
        <motion.circle
          key={index}
          className={`parade-story__confetti parade-story__confetti--${(index % 3) + 1}`}
          cx={72 + ((index * 71) % 590)}
          cy={78 + ((index * 43) % 155)}
          r={4 + (index % 3)}
          initial={reduceMotion ? false : { opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.7 }}
        />
      ))}
      <path
        className="parade-story__finale-ribbon"
        d="M111 160c133-73 365 77 498 0"
      />
      <text
        className="parade-story__finale-copy"
        x="360"
        y="214"
        textAnchor="middle"
      >
        {copy}
      </text>
    </motion.g>
  );
}

export function LearnWithClaraLetterParade({
  scene,
  copy,
  interactive = true,
  wrongChoice,
  foundChoice,
  choosing,
  onChoose,
}: LearnWithClaraLetterParadeProps) {
  const foundCount = foundCountFor(scene);
  const choicesReady = scene.kind === "find" && interactive && !choosing;
  const stationNames = copy.parade.stationNames;
  const sceneTitle =
    scene.kind === "story"
      ? copy.parade.sceneTitle.story
      : scene.kind === "completion"
        ? copy.parade.sceneTitle.completion
        : scene.kind === "find"
          ? copy.parade.sceneTitle.find(scene.display_text.slice(-1))
          : copy.parade.sceneTitle.teach(scene.display_text.charAt(0));

  return (
    <section className="parade-story" aria-labelledby="letters-class-title">
      <div className="parade-story__heading">
        <div>
          <p>
            {scene.kind === "find"
              ? copy.parade.findHeading
              : copy.parade.storyHeading}
          </p>
          <h2 id="letters-class-title">{sceneTitle}</h2>
        </div>
        <span>{copy.parade.foundCount(foundCount, 5)}</span>
      </div>

      <div className="parade-story__canvas-wrap">
        <svg
          className="parade-story__canvas"
          viewBox="0 0 720 350"
          role="img"
          aria-label={
            scene.kind === "completion"
              ? copy.parade.completionAria
              : scene.kind === "story"
                ? copy.parade.storyAria
                : copy.parade.sceneAria(
                    sceneTitle,
                    stationNames[
                      scene.display_text.charAt(0) as keyof typeof stationNames
                    ],
                  )
          }
        >
          <defs>
            <linearGradient id="parade-sky" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                stopColor="var(--color-accent-sky)"
                stopOpacity="0.52"
              />
              <stop
                offset="1"
                stopColor="var(--color-surface-panel)"
                stopOpacity="0.2"
              />
            </linearGradient>
          </defs>
          <rect
            className="parade-story__sky"
            width="720"
            height="350"
            rx="24"
          />
          <path
            className="parade-story__hill parade-story__hill--back"
            d="M0 225c96-78 170 9 264-55 98-66 180 58 276-13 64-47 120-38 180 9v184H0Z"
          />
          <path
            className="parade-story__hill"
            d="M0 259c103-61 190 27 293-27 92-48 160 32 249-13 71-36 124-23 178 7v124H0Z"
          />
          <motion.g
            animate={{ x: [0, 26, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ellipse
              className="parade-story__cloud"
              cx="95"
              cy="64"
              rx="42"
              ry="18"
            />
            <ellipse
              className="parade-story__cloud"
              cx="131"
              cy="62"
              rx="31"
              ry="15"
            />
          </motion.g>
          <path
            className="parade-story__bunting-line"
            d="M24 31c184 43 462 43 672 0"
          />
          {Array.from({ length: 11 }, (_, index) => (
            <path
              key={index}
              className={`parade-story__flag parade-story__flag--${(index % 3) + 1}`}
              d={`M${48 + index * 62} ${39 + (index % 2) * 8}v31l16-12 16 12V43`}
            />
          ))}

          <AnimatePresence mode="wait" initial={false}>
            {scene.kind === "story" ? (
              <OpeningScene key="opening" title={copy.parade.openingTitle} />
            ) : scene.kind === "completion" ? (
              <FinaleScene
                key="finale"
                title={copy.parade.finaleTitle}
                copy={copy.parade.finaleCopy}
              />
            ) : (
              <ActiveLetterScene
                key={scene.key}
                scene={scene}
                foundChoice={foundChoice}
                stationNames={stationNames}
              />
            )}
          </AnimatePresence>

          <ParadeLine
            foundCount={foundCount}
            finale={scene.kind === "completion"}
          />
        </svg>
      </div>

      {scene.kind === "find" ? (
        <div
          className="parade-story__choices"
          aria-label={copy.parade.choicesAria(scene.display_text.slice(-1))}
        >
          {scene.choices.map((choice, index) => (
            <motion.button
              key={choice}
              type="button"
              className="parade-story__choice"
              data-wrong={wrongChoice === choice || undefined}
              data-found={foundChoice === choice || undefined}
              disabled={!choicesReady}
              aria-label={copy.parade.chooseLittle(choice)}
              onClick={() => onChoose(choice)}
              animate={
                wrongChoice === choice
                  ? { x: [-9, 9, -7, 7, 0], rotate: [-4, 4, -3, 3, 0] }
                  : foundChoice === choice
                    ? { y: [0, -14, 0], scale: [1, 1.12, 1] }
                    : { y: [0, index % 2 === 0 ? -3 : 3, 0] }
              }
              transition={{
                duration: wrongChoice === choice ? 0.38 : 1.5,
                repeat: choicesReady ? Infinity : 0,
              }}
            >
              {choice}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="parade-story__story-beat" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  );
}
