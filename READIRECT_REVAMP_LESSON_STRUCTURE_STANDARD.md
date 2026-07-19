# ReaDirect Lesson Structure Standard

This document defines the required lesson structure, content formatting, ASR routing, and comprehension flow for ReaDirect-V2.

## Core Lesson Sequence

Lessons must follow this progression:

```text
Letter drills
    ↓
Word drills
    ↓
Phrase drills
    ↓
Sentence drills
    ↓
Paragraph reading
    ↓
Comprehension readings
```

Paragraph reading and comprehension readings are separate activities.

## Model Assignment

ReaDirect-V2 will use two speech models:

```text
Nu
└── Isolated-letter recognition

Mu
└── Words, phrases, sentences, paragraphs, and spoken comprehension answers
```

Nu must only evaluate isolated English letter names.

Mu must handle all unrestricted word and sentence transcription.

## Display and ASR Separation

The frontend display must remain separate from the ASR target.

Every lesson item must preserve these distinct values:

```text
1. What the learner sees
2. What the learner is expected to say
3. Which model processes the answer
4. Which spoken answers are accepted
```

Frontend formatting must not alter the ASR input or expected spoken target.

## Letter Drills

Letters must be displayed using one uppercase and one lowercase form together:

```text
Aa
Bb
Cc
```

This formatting is display-only.

The learner reads the pair as one letter name.

Example:

```text
Display: Aa
Expected spoken letter: A
Model: Nu
```

The system must not send `Aa` to Nu as the expected class.

Required data example:

```json
{
  "activity_type": "isolated_letter",
  "display_text": "Aa",
  "spoken_target": "A",
  "asr_model": "nu"
}
```

Uppercase and lowercase forms must not be treated as separate spoken answers.

## Word Drills

Isolated words must be displayed in lowercase unless the word is a proper noun.

Examples:

```text
cat
plant
water
happy
Rosa
Ben
Manila
```

Word drills must use Mu.

Example:

```json
{
  "activity_type": "word",
  "display_text": "plant",
  "spoken_target": "plant",
  "asr_model": "mu"
}
```

## Phrase Drills

Phrases must:

- Remain short
- Use familiar words
- Begin with lowercase unless they start with a proper noun
- Have no ending period
- Avoid unnecessary punctuation
- Avoid being written as complete sentences

Examples:

```text
the fat cat
a red bag
in the garden
under the table
Rosa and Ben
```

Phrase drills must use Mu.

Example:

```json
{
  "activity_type": "phrase",
  "display_text": "the fat cat",
  "spoken_target": "the fat cat",
  "asr_model": "mu"
}
```

## Sentence Drills

Sentences must:

- Begin with a capital letter
- End with correct punctuation
- Express one clear idea
- Use simple sentence structures
- Use familiar vocabulary
- Avoid unnecessary clauses

Examples:

```text
Rosa waters the plant.
The cat sits on the mat.
Ben has a red bag.
```

Sentence drills must use Mu.

The displayed punctuation must remain visible, but transcript comparison may use a normalized target.

Example:

```json
{
  "activity_type": "sentence",
  "display_text": "Rosa waters the plant.",
  "spoken_target": "rosa waters the plant",
  "asr_model": "mu",
  "case_sensitive": false,
  "punctuation_sensitive": false
}
```

## Paragraph Reading

Paragraph reading is a standalone oral-reading activity.

The learner reads one complete paragraph.

Paragraph reading must not automatically lead to questions about that same paragraph.

Paragraph reading must evaluate only the transcript against the displayed paragraph.

Do not add:

- Fluency scoring
- Reading-speed scoring
- Words-per-minute scoring
- Timing-based scoring
- Prosody scoring

Example paragraph:

```text
Rosa has a small garden. She waters the plants every morning. The flowers are red and yellow.
```

Required data example:

```json
{
  "activity_type": "paragraph_reading",
  "display_text": "Rosa has a small garden. She waters the plants every morning. The flowers are red and yellow.",
  "spoken_target": "rosa has a small garden she waters the plants every morning the flowers are red and yellow",
  "asr_model": "mu",
  "case_sensitive": false,
  "punctuation_sensitive": false
}
```

Paragraph scoring may examine:

- Correct words
- Substitutions
- Omissions
- Insertions
- Completion of the paragraph

It must not use fluency or timing.

## Comprehension Readings

Comprehension readings are separate from paragraph reading.

Each comprehension item must contain:

```text
One simple sentence
        ↓
One 5W1H question
        ↓
One spoken answer
```

The learner first reads the simple sentence using Mu.

The system then presents one comprehension question.

The learner answers the question aloud.

Mu transcribes the spoken answer.

The system compares the raw transcript with the hidden expected answer and accepted-answer variants.

## Required Comprehension Flow

```text
Simple sentence is displayed
        ↓
Learner reads the sentence
        ↓
Mu returns the raw sentence transcript
        ↓
One comprehension question is displayed and spoken
        ↓
Learner answers aloud
        ↓
Mu returns the raw answer transcript
        ↓
ReaDirect compares the transcript with hidden accepted answers
        ↓
Correct, uncertain, or incorrect
```

The hidden expected answer must not be provided to Mu before transcription.

## Question Types

Comprehension readings must use the simple 5W1H question types:

```text
Who
What
Where
When
Why
How
```

Each sentence must lead to only one question.

Do not ask several questions from one sentence during the standard comprehension flow.

## Who Example

```text
Reading sentence:
Rosa waters the plant.

Question:
Who waters the plant?

Hidden expected answer:
Rosa
```

Accepted answers may include:

```text
rosa
it is rosa
rosa does
rosa waters the plant
```

## What Example

```text
Reading sentence:
Ben carries a red bag.

Question:
What does Ben carry?

Hidden expected answer:
a red bag
```

Accepted answers may include:

```text
a red bag
red bag
the red bag
ben carries a red bag
```

## Where Example

```text
Reading sentence:
The cat sleeps on the mat.

Question:
Where does the cat sleep?

Hidden expected answer:
on the mat
```

Accepted answers may include:

```text
on the mat
the mat
it sleeps on the mat
```

## When Example

```text
Reading sentence:
Rosa waters the plant every morning.

Question:
When does Rosa water the plant?

Hidden expected answer:
every morning
```

Accepted answers may include:

```text
every morning
in the morning
morning
```

## Why Example

```text
Reading sentence:
Rosa waters the plant because it is dry.

Question:
Why does Rosa water the plant?

Hidden expected answer:
because it is dry
```

Accepted answers may include:

```text
because it is dry
it is dry
the plant is dry
because the plant is dry
```

## How Example

```text
Reading sentence:
Rosa waters the plant with a cup.

Question:
How does Rosa water the plant?

Hidden expected answer:
with a cup
```

Accepted answers may include:

```text
with a cup
a cup
she uses a cup
rosa uses a cup
```

## Comprehension Sentence Rules

Comprehension sentences must:

- Be short
- Contain one clear fact
- Use direct and familiar vocabulary
- Avoid several ideas in one sentence
- Avoid ambiguous pronouns
- Avoid figurative language
- Avoid facts requiring outside knowledge
- Provide an answer that is directly stated in the sentence

Avoid:

```text
Rosa waters the green plant with a cup in the garden every morning because it is dry.
```

Prefer:

```text
Rosa waters the plant.
Who waters the plant?
```

```text
The plant is in the garden.
Where is the plant?
```

```text
Rosa waters the plant every morning.
When does Rosa water the plant?
```

## Comprehension Item Data Structure

Each comprehension item must contain two separate Mu interactions.

Example:

```json
{
  "activity_type": "comprehension_reading",
  "question_type": "who",
  "reading": {
    "display_text": "Rosa waters the plant.",
    "spoken_target": "rosa waters the plant",
    "asr_model": "mu",
    "case_sensitive": false,
    "punctuation_sensitive": false
  },
  "question": {
    "display_text": "Who waters the plant?",
    "expected_answer": "rosa",
    "accepted_answers": [
      "rosa",
      "it is rosa",
      "rosa does",
      "rosa waters the plant"
    ],
    "asr_model": "mu",
    "case_sensitive": false,
    "punctuation_sensitive": false
  }
}
```

## Hidden Expected Answers

The expected answer and accepted-answer variants must remain hidden from the learner.

They may only be used after Mu returns the raw transcript.

Required order:

```text
Audio
    ↓
Mu raw transcript
    ↓
Answer normalization
    ↓
Accepted-answer comparison
```

Prohibited order:

```text
Expected answer
    ↓
Passed to Mu as a transcription hint
```

## Answer Normalization

Answer comparison may normalize:

- Letter case
- Ending punctuation
- Extra spaces
- Common harmless contractions
- Leading articles when permitted by the item

The raw Mu transcript must still be preserved separately for evaluation and debugging.

## Required Scoring Separation

Each lesson component must retain a separate result:

```text
Letter drill result
Word drill result
Phrase drill result
Sentence drill result
Paragraph-reading result
Comprehension-reading result
Spoken-comprehension-answer result
```

Do not combine paragraph reading and comprehension into one result.

Do not combine reading accuracy and comprehension accuracy into one score.

## Standard Mini-Lesson Example

### Letter

```text
Display: Pp
Expected speech: P
Model: Nu
```

### Word

```text
Display: plant
Expected speech: plant
Model: Mu
```

### Phrase

```text
Display: the green plant
Expected speech: the green plant
Model: Mu
```

### Sentence

```text
Display: Rosa waters the plant.
Expected speech: rosa waters the plant
Model: Mu
```

### Paragraph Reading

```text
Rosa has a green plant. She waters it every morning. The plant has two flowers.
```

This paragraph is evaluated only as paragraph reading.

### Comprehension Reading — Who

```text
Reading sentence:
Rosa waters the plant.

Question:
Who waters the plant?

Expected answer:
Rosa
```

### Comprehension Reading — Where

```text
Reading sentence:
The plant is in the garden.

Question:
Where is the plant?

Expected answer:
the garden
```

### Comprehension Reading — What

```text
Reading sentence:
Rosa waters the flowers.

Question:
What does Rosa water?

Expected answer:
the flowers
```

### Comprehension Reading — When

```text
Reading sentence:
Rosa waters the plant every morning.

Question:
When does Rosa water the plant?

Expected answer:
every morning
```

### Comprehension Reading — Why

```text
Reading sentence:
Rosa waters the plant because it is dry.

Question:
Why does Rosa water the plant?

Expected answer:
because it is dry
```

### Comprehension Reading — How

```text
Reading sentence:
Rosa waters the plant with a cup.

Question:
How does Rosa water the plant?

Expected answer:
with a cup
```

## Hard Rules

1. Letters must display uppercase and lowercase together, such as `Aa`.
2. The paired letter display must still be evaluated as one isolated letter.
3. Nu must only process isolated letters.
4. Isolated words must be lowercase unless they are proper nouns.
5. Phrases must not begin with uppercase unless required by a proper noun.
6. Phrases must not end with a period.
7. Sentences must follow normal capitalization and punctuation.
8. Paragraphs must follow normal capitalization and punctuation.
9. Paragraph reading must remain separate from comprehension readings.
10. Paragraph reading must not include fluency or timing evaluation.
11. Each comprehension sentence must lead to only one 5W1H question.
12. Comprehension answers must be spoken.
13. Mu must transcribe the spoken answer before expected-answer comparison.
14. Hidden expected answers must never alter Mu's raw transcription.
15. Display formatting must never automatically control ASR behavior.
