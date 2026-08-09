# Chapter 3: Methodology and System Design Documentation

## 3.1 Research Design

This project follows an applied software development research design. The study focuses on the design, development, and evaluation of ReaDirect—an AI-based speech recognition-assisted oral reading coach as a learning support intervention for Grade 1 to Grade 3 learners, out-of-school youth, adults with basic literacy needs, and Alternative Learning System (ALS) participants under the DepEd ARAL Program.

The system was developed to support English oral reading, pronunciation practice, automated scoring, and bounded adaptive feedback through a hybrid web and AI microservice architecture. The research output is a functional information system rather than a purely theoretical model. Therefore, the methodology emphasizes decoupled system architecture, strict API boundaries, isolated ASR integration, and validation through role-based testing and technical sandboxes.

The project uses an iterative development approach. Core assessment and reading features are implemented first, followed by isolated-letter classification, expected-centric transcript correction using an Equivalence Book, dynamic TTS integration (VoxCPM2), and role-based dashboards for educational administration.

## 3.2 Research Locale and System Context

The system is intended to support diverse beneficiaries, including Grade 1 to Grade 3 learners classified as Developing readers, out-of-school youth, adult literacy learners, and Alternative Learning System (ALS) participants requiring structured foundational reading remediation. The primary pilot implementation and testing locale for the early grade learners is Duhat Elementary School in Santa Cruz, Laguna. The system supports structured English reading activities through a fixed progression flow: Diagnostic Assessment, followed by sequential required lessons (Letters, Words, Phrases, Sentences, and Passages), culminating in a Final Assessment. Assessment scores strictly serve as evidence and do not skip or replace sequential lesson progression.

The system supports five distinct user groups:

1. **System Administrators**, who monitor full system management, manage global rules, and use technical sandboxes (IsoLetter Sandbox, True Sandbox, Page Portals) to test AI behavior safely using a portal-exclusive learner account (`KW000`).
2. **School Administrators**, who have a school-scoped operational view to manage teachers and view aggregated school reports, without access to system technical tools.
3. **Teachers**, who access class-scoped dashboards to manage assigned learners, issue credentials, and review assessment progress and read-only learner details.
4. **Learners (Grade 1 to 3, ALS, Out-of-School Youth, Adults)**, who interact with the system through guided English reading activities, record their voices, receive encouraging feedback from the AI Teacher (Ma'am Clara), and progress through structured lessons.
5. **Guests**, who use a trial learner flow without staff administration.

## 3.3 Development Tools and Technology Stack

The system is implemented using the following verified technologies:

| Layer | Technology Used | Purpose |
| --- | --- | --- |
| Frontend Framework | React, TypeScript, Vite | Single-page application UI and routing |
| Styling & Animations | Tailwind CSS, Motion for React, XState | Responsive UI and complex state machine management |
| Game boundaries | KAPLAY and PixiJS | 2D educational game module rendering |
| Character Runtime | Live2D Cubism for Web | Rendering the AI Teacher (Ma'am Clara) |
| Backend Framework | Laravel 12 (PHP) | Scoring logic, session management, access control, and API orchestration |
| Database | PostgreSQL | Relational data storage for users, responses, and assessment runs |
| Speech Services | Python 3.11, FastAPI, Uvicorn | Microservices handling audio processing, ASR, and TTS |
| Speech Engine (ASR) | Whisper large-v3-turbo (PyTorch) | Core Automatic Speech Recognition for Mu and Nu modes |
| Text-to-Speech (TTS) | VoxCPM2 (PyTorch CUDA 12.6) | Dynamic voice-line generation for unpredictable feedback |
| Hosting & Networking | Cloudflare, Caddy | SSL, CDN, DDoS protection, and staging tunnel topology |

## 3.4 System Development Methodology

The system was developed using a modular, decoupled microservice methodology. The frontend React application acts as the presentation layer, delegating all state persistence and business logic to the Laravel backend. Laravel orchestrates audio payloads to entirely separate Python FastAPI microservices for speech processing, ensuring AI workloads do not block web requests.

The development process follows strict rules:
1. **Requirements identification**: Establishing a fixed learning curriculum where learners must complete the Diagnostic Assessment before unlocking sequential lessons.
2. **Role definition**: Implementing absolute data isolation between System Admins, School Admins, and Teachers.
3. **AI Speech Pipeline Implementation**: Building a hybrid ASR architecture utilizing a shared Mu engine for general speech and a Nu isolated-letter mode.
4. **Audio Preprocessing Validation**: Implementing mandatory audio-quality gates (rejecting silence and clipping) and conditional 10dB noise reduction that defaults to off to protect child-speech consonants.
5. **Expected-Centric Correction**: Implementing the Equivalence Book to safely normalize ASR errors (e.g., mapping "aye" to A/I) based strictly on expected targets.
6. **Dynamic Feedback Generation**: Integrating a hybrid TTS delivery model that uses fixed published WAVs for known text and runtime VoxCPM2 generation for personalized feedback (e.g., "You said ei").

## 3.5 System Architecture

The system follows a microservice architecture where Laravel serves as the authoritative API gateway and state manager.

### 3.5.1 Architectural Layers

| Layer | Components | Responsibility |
| --- | --- | --- |
| Frontend Layer | React, Vite, Live2D | Renders UI, records Web Audio API payloads, displays Ma'am Clara |
| Backend API / Auth | Laravel Sanctum | Enforces role-based access control and API endpoints |
| Controller & Service Layer | Laravel Controllers | Manages lesson progression, generates dynamic TTS templates, and orchestrates scoring |
| Model Layer | `users`, `assessment_runs`, `assessment_responses` | Represents database records and progression state |
| ASR Microservice | FastAPI, Whisper, Nu/Mu Logic | Validates audio quality, runs ASR inference, applies equivalence rules |
| TTS Microservice | FastAPI, VoxCPM2 | Generates runtime dynamic speech feedback |

### 3.5.2 High-Level Architecture Diagram

```mermaid
flowchart TD
    A[Grade 1 Learner] --> B[React Frontend / Live2D Clara]
    B --> C[Audio Recording (Web Audio API)]
    C --> D[Laravel Backend API]
    
    D --> E[(PostgreSQL Database)]
    D --> F[FastAPI ASR Service]
    
    F --> G[Audio Preprocessing & Quality Check]
    G --> H{Activity Type?}
    H -- "Isolated Letter" --> I[Nu: Mu-backed Letter Resolver]
    H -- "Word/Sentence" --> J[Mu: Whisper ASR]
    
    I --> K[Equivalence Book Correction]
    J --> K
    
    K --> L[Raw Transcript & Match Evidence]
    L --> F
    F --> D
    
    D --> M[Laravel Scoring & Progression Logic]
    M --> E
    M --> N{Is Feedback Dynamic?}
    N -- "Yes" --> O[FastAPI TTS Service: VoxCPM2]
    N -- "No" --> P[Published Speech Catalog]
    O --> B
    P --> B
```

## 3.6 Core System Modules

### 3.6.1 Authentication and Role-Based Access Module
The system uses Laravel session and Sanctum authentication. Role hierarchy dictates access: System Administrators have full global access; School Administrators are restricted to their school's data; Teachers are restricted to their assigned classes. Learners interact only with the reading interface. Page Portals allow administrators to test specific system states using an isolated `KW000` account, preserving real learner data integrity.

### 3.6.2 Audio Quality Gate Module
Before any AI inference, the ASR service performs an audio-quality check. It classifies recordings as `CLEAR_CORRECT`, `CLEAR_INCORRECT`, `UNCERTAIN`, `UNUSABLE_AUDIO`, `SILENCE`, or `SKIPPED`. Only clear incorrect recordings trigger academic correction. Unusable audio triggers a technical retry without penalizing the learner's academic score.

### 3.6.3 Hybrid Speech Recognition Module (Mu and Nu)
The system uses a shared Whisper large-v3-turbo engine (Mu) to process speech. 
- **Mu Mode**: Handles unrestricted words, phrases, and sentences.
- **Nu Mode**: Acts as a strict Mu-backed isolated-letter resolver. It analyzes Mu's raw transcript and applies isolated-letter equivalences to output A-Z, `SILENCE`, or `UNKNOWN`. Nu is not a separately trained model, but a specialized operational mode of Mu.

### 3.6.4 Expected-Centric Transcript Correction Module
The system applies Expected-Centric Correction using a System Administrator-managed **Equivalence Book**. This allows the system to accept known transcript differences (e.g., homophones, letter aliases) safely. Equivalence rules can only be created by an administrator reviewing expected-correct samples in the True Sandbox or IsoLetter Sandbox.

### 3.6.5 Assessment and Sequential Progression Module
Learners follow a rigid, centrally defined path:
1. **Diagnostic Assessment**: Tasks 1A (Letters), 2A (Rhyme), 2B (Words), 3A (Passage), 3B (Comprehension) determine the Part 1 Score and Final Reading Profile.
2. **Required Lessons**: Unlocked sequentially (Lesson 1 to 5). Assessment scores do not skip or bypass lessons. Progress uses strict Laravel-owned save states.
3. **Final Assessment**: Unlocked only after completing all required lessons.

### 3.6.6 Adaptive Feedback and Character Module (Ma'am Clara)
Ma'am Clara is rendered using the Live2D Cubism for Web SDK. She is displayed in a square passport-style portrait with a transparent canvas, wearing glasses and a black hoodie (the choker accessory is non-destructively hidden). Clara provides bounded teaching using a "one targeted clue, one guided retry, one demonstration" loop.
The TTS system uses a hybrid model:
- **Published Speech**: Pre-generated WAV files for fixed greetings, instructions, and results.
- **Dynamic Speech**: Runtime VoxCPM2 synthesis for personalized transcript feedback (e.g., `You said {final_transcript}`).

## 3.7 Database Design

The database schema is defined through Laravel migrations.

### 3.7.1 Main Tables

| Table | Purpose |
| --- | --- |
| `users` | Stores authenticated users, roles (student, teacher, etc.), and school assignments |
| `assessment_runs` | Stores the active assessment snapshot, current stage, and part scores |
| `assessment_responses` | Stores the committed choices, final transcripts, and skip states |
| `lesson_saves` | Owns the persistent save state tied uniquely to the learner for resuming |
| `achievements` | Tracks unlocked badges (e.g., Ready Reader, Word Wizard) |
| `equivalence_rules` | Stores System Administrator-approved text normalization rules |

## 3.8 Reading Processing Workflow

The assessment workflow is as follows:
1. A learner selects an assigned reading task on the React frontend.
2. The learner records their voice (capped appropriately).
3. The frontend submits the audio to the Laravel backend.
4. Laravel proxies the audio to the FastAPI ASR microservice.
5. FastAPI validates audio quality through the Audio Quality Gate.
6. Usable audio is routed to Nu (isolated letters) or Mu (words/passages).
7. FastAPI applies Equivalence Book rules based on the expected target.
8. FastAPI returns the raw transcript, resolved alias, and decision to Laravel.
9. Laravel computes the final score and determines the required instructional feedback.
10. Laravel dynamically templates the feedback text and requests audio from the VoxCPM2 TTS service (if dynamic) or the published catalog.
11. The frontend renders Ma'am Clara delivering the targeted feedback via Live2D animation and audio.

## 3.9 Access Control and Privacy Design

Data privacy is strictly enforced. Private reference recordings and generated TTS WAV paths are never copied into public web folders or exposed in API responses. School Administrators and Teachers only possess read-only views of learner details. When a Teacher resets a learner's password, the plaintext password is shown once for printing and never logged. Live learner analytics completely exclude the `KW000` portal-system testing account.

## 3.10 Validation and Testing Strategy

The system includes automated tests and secure administrative sandboxes:
- **IsoLetter Sandbox**: A dedicated Nu testing page for evaluating isolated-letter audio without affecting learner data.
- **True Sandbox**: A dedicated Mu testing page for reviewing expected-aware raw transcripts and generating Equivalence Book entries.
- **Page Portals**: A safe mechanism for System Administrators to jump into specific assessment or lesson checkpoints using the isolated `KW000` account, proving the exact same API behavior learners experience without corrupting analytical data.

## 3.11 Current Implementation Boundaries

The following boundaries are established in the system's technical design:
1. The game modules (KAPLAY/PixiJS) are strictly isolated from the required reading lessons and do not alter lesson progression.
2. Assessment tasks are isolated; e.g., Task 2A (Rhyme Check) does not use ASR or audio recording.
3. Conditional Mu noise reduction is globally off by default. Nu mode never uses noise reduction.
4. Ma'am Clara's dynamic TTS strictly prohibits exclamation marks; the Vox service sanitizes them to periods to prevent unexpected runtime synthesis behavior.
5. Missing or skipped assessment items persist distinct `SKIPPED` response states with a zero score, rather than inventing false audio evidence.

## 3.12 Evaluation Criteria

The system is evaluated based on the following criteria:

| Criterion | Description |
| --- | --- |
| Functional Correctness | System records, transcribes, scores, and sequentially tracks progress accurately |
| ASR Accuracy | The hybrid Nu/Mu architecture resolves child speech within acceptable thresholds |
| Data Privacy | Private audio files and password credentials are securely handled |
| Role Isolation | Strict multi-tenant boundaries prevent teachers or admins from viewing out-of-scope data |
| Bounded Teaching | The AI Teacher correctly limits retries (one clue, one retry, one demonstration) without trapping the learner in infinite loops |

## 3.13 Evidence Checklist

The following repository files and standards were used as evidence for this methodology:

| Claim Verified | Source File |
| --- | --- |
| Overall Architecture | `READIRECT_REVAMP_PROJECT_STRUCTURE.md` |
| Tech Stack | `READIRECT_REVAMP_TECH_STACK.md` |
| User Roles & Dashboards | `READIRECT_REVAMP_USER_ROLES_AND_DASHBOARDS.md` |
| ASR and Equivalence Rules | `READIRECT_REVAMP_ASR_GUIDE.md` |
| Assessment Progression Rules| `READIRECT_REVAMP_ASSESSMENT_GUIDE.md` |
| AI Teacher Bounded Logic | `READIRECT_REVAMP_AI_TEACHER_STANDARD.md` |
| Lesson Sequential Structure | `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md` |
| Live2D Viewport & Traits | `READIRECT_REVAMP_CLARA_LIVE2D_SPECIFICATION.md` |
| VoxCPM2 TTS Specs | `READIRECT_REVAMP_CLARA_VOX_TTS_SPECIFICATION.md` |

## 3.14 Summary

This chapter documents the research methodology and system design of ReaDirect. The system leverages a highly decoupled architecture utilizing React, Laravel, and distinct Python FastAPI microservices to deliver a responsive, AI-assisted oral reading coach. By implementing an authoritative audio-quality gate, a hybrid Nu/Mu ASR architecture, a strict Equivalence Book correction model, and a VoxCPM2 TTS pipeline, the system safely processes child speech and provides bounded, targeted feedback via the Live2D AI Teacher, Ma'am Clara. The strict role-based access control, fixed sequential lesson progression, and secure administrative testing portals make the platform a robust and academically sound educational intervention tool.
