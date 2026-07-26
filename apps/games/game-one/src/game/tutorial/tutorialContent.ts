import type { TutorialState } from "./tutorialState";
import type { GameLanguage } from "../localization/language";

export function tutorialInstruction(step: TutorialState["step"], interactionAvailable: boolean, language: GameLanguage = "en") {
  if (language === "fil") {
    switch (step) {
      case "missionPanel": return "Ito ang iyong misyon. Sinasabi nito kung ano ang gagawin mo.";
      case "directionArrow": return "Sundan ang palaso. Iyon ang iyong pupuntahan.";
      case "navigationTrail": return "Kapag malapit ka na, sundan ang mga tuldok patungo sa tauhan.";
      case "minimap": return "Makikita sa mapa kung nasaan ka at ang iyong pupuntahan.";
      case "movement": return "Maglakad sa daan o damuhan. Sundan ang palaso.";
      case "interaction": return interactionAvailable
        ? "Malapit ka na. Pindutin ang Kausapin."
        : "Lumapit kay Miss Estelle. Lalabas ang Kausapin kapag malapit ka.";
      case "reading": return "Basahin ang maikling kuwento. Tandaan ang mga detalye.";
      case "readAgain": return "Gamitin ang Basahin Muli para balikan ang kuwento. Pagkatapos, bumalik sa gawain.";
      case "choice": return "Pindutin ang sagot na sa tingin mo ay tama.";
      case "answerLater": return "Hindi pa handa? Pindutin ang Sagutin Mamaya. Balikan ito mamaya.";
      case "ready": return "Magaling! Handa ka nang magsimula.";
    }
  }
  switch (step) {
    case "missionPanel": return "This is your mission. It tells you what to do.";
    case "directionArrow": return "Follow the arrow. It points to your goal.";
    case "navigationTrail": return "When you get close, follow the dots to the character.";
    case "minimap": return "The map shows you and your goal.";
    case "movement": return "Walk on the path or grass. Follow the arrow.";
    case "interaction": return interactionAvailable
      ? "You are close enough. Tap Interact."
      : "Move close to Miss Estelle. Interact will appear nearby.";
    case "reading": return "Read the short story. Remember the details.";
    case "readAgain": return "Use Read Again to review the story. Then return to the activity.";
    case "choice": return "Tap the answer you think is correct.";
    case "answerLater": return "Not ready? Tap Answer Later. Return when you are ready.";
    case "ready": return "Great job! You are ready to begin.";
  }
}

export function tutorialTarget(step: TutorialState["step"], interactionAvailable: boolean) {
  switch (step) {
    case "missionPanel": return '[data-tutorial="mission-panel"]';
    case "directionArrow": return '[data-tutorial="direction-arrow"]';
    case "navigationTrail": return '[data-tutorial="navigation-trail"]';
    case "minimap": return '[data-tutorial="minimap"]';
    case "movement": return ".movement-controls";
    case "interaction": return interactionAvailable ? ".mission-interact-button" : ".movement-controls";
    case "reading": return ".story-panel";
    case "readAgain": return '[data-tutorial="read-again"], .story-panel';
    case "choice": return ".answer-choice";
    case "answerLater": return '[data-tutorial="answer-later"], .activity-intro-panel';
    case "ready": return '[data-tutorial="finish"]';
  }
}
