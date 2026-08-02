import type { MissionDefinition, MissionId } from "../content/missions";

type FourChoices = readonly [string, string, string, string];

type QuestionTranslation = {
  id: string;
  prompt: string;
  choices: FourChoices;
  hint: string;
  explanation: string;
  correctFeedback: string;
  incorrectFeedback: string;
};

type MissionTranslation = {
  location: string;
  situation: string;
  objective: string;
  objectiveHelp: string;
  briefing: readonly string[];
  reading: { format: string; title: string; pages: readonly string[] };
  facts: readonly string[];
  requiredInteractions: readonly string[];
  action: {
    prompt: string;
    choices: FourChoices;
    hint: string;
    correctFeedback: string;
    incorrectFeedback: string;
  };
  questions: readonly QuestionTranslation[];
  completionCondition: string;
  worldResult: string;
  reward: string;
};

export const FILIPINO_MISSION_TRANSLATIONS: Readonly<Record<MissionId, MissionTranslation>> = {
  "plaza-welcome": {
    location: "gitnang plaza",
    situation: "Naghahanda ang lahat para sa sama-samang pagbasa.",
    objective: "Kausapin si Miss Estelle sa gitnang plaza",
    objectiveHelp: "Lumapit kay Miss Estelle. Piliin ang Kausapin.",
    briefing: [
      "Magbabasa nang sama-sama ang lahat. Tulungan mo kaming maghanda.",
      "Basahin ang mensahe. Hanapin kung saan ilalagay ang karatula."
    ],
    reading: {
      format: "Mensahe",
      title: "Saan Magsisimula ang Pagbasa",
      pages: [
        "Magsisimula ngayong hapon ang pagbasa. Gagawin ito sa gitnang plaza.",
        "Nasa tabi ng daan si Miss Estelle. Ilagay doon ang karatula. Pagkatapos, pumunta sa palengke."
      ]
    },
    facts: ["Magsisimula ang pagbasa sa gitnang plaza.", "Ilalagay ang karatula sa tabi ng daan.", "Ang palengke ang susunod."],
    requiredInteractions: ["Basahin ang mensahe", "Ilagay ang karatula sa tabi ng daan", "Sagutin ang mga tanong"],
    action: {
      prompt: "Saan ilalagay ang welcome sign?",
      choices: ["Sa tabi ng daan sa plaza", "Sa lumang tulay", "Sa likod ng palengke", "Sa daan sa gubat"],
      hint: "Basahin kung saan naghihintay si Miss Estelle.",
      correctFeedback: "Tama! Nasa tabi na ng daan ang karatula.",
      incorrectFeedback: "Muntik na! Basahin muli ang ikalawang pangungusap."
    },
    questions: [
      {
        id: "plaza-start-place",
        prompt: "Saan magsisimula ang pagbasa?",
        choices: ["Gitnang plaza", "Lumang tulay", "Palengke", "Daan sa gubat"],
        hint: "Tingnan ang unang bahagi ng mensahe.",
        explanation: "Magsisimula ang pagbasa sa gitnang plaza.",
        correctFeedback: "Tama. Magkikita ang lahat sa gitnang plaza.",
        incorrectFeedback: "Muntik na! Hanapin kung saan magsisimula."
      },
      {
        id: "plaza-next-stop",
        prompt: "Saan ka susunod na pupunta?",
        choices: ["Sa palengke", "Sa tulay", "Sa gubat", "Sa silangang mga bahay"],
        hint: "Basahin ang huling bahagi ng mensahe.",
        explanation: "Pupunta sa palengke pagkatapos ilagay ang karatula.",
        correctFeedback: "Tama. Palengke ang susunod.",
        incorrectFeedback: "Muntik na! Basahin kung saan pupunta pagkatapos."
      }
    ],
    completionCondition: "Nailagay ang karatula at nasagot ang dalawang tanong.",
    worldResult: "May welcome sign na sa daan sa gitnang plaza.",
    reward: "Welcome Ribbon"
  },
  "market-supplies": {
    location: "palengke",
    situation: "Kailangan ng tamang dami at ayos ng mga gamit.",
    objective: "Puntahan ang Tindero para sa mga gamit",
    objectiveHelp: "Pumunta sa palengke. Kausapin ang Tindero.",
    briefing: [
      "Nagbigay si Miss Estelle ng listahan. Ayusin ang mga gamit.",
      "Basahin ang listahan. Piliin ang unang ilalagay."
    ],
    reading: {
      format: "Listahan ng mga Gamit",
      title: "Mga Gamit sa Reading Table",
      pages: [
        "Maghanda ng tatlong mangga. Kumuha ng dalawang pitsel at isang nakatuping tela.",
        "Ilagay muna ang tela. Isunod ang mga pitsel. Ilagay sa ibabaw ang mga mangga. Dalhin ang kahon kay Lolo Ambo."
      ]
    },
    facts: ["May tatlong mangga.", "May dalawang pitsel ng tubig.", "Unang ilalagay ang tela. Kay Lolo Ambo ang kahon."],
    requiredInteractions: ["Basahin ang listahan", "Piliin ang unang ilalagay", "Sagutin ang lahat ng tanong sa listahan"],
    action: {
      prompt: "Ano ang una mong ilalagay sa kahon?",
      choices: ["Ang nakatuping tela", "Ang tatlong mangga", "Ang dalawang pitsel", "Isang bakanteng basket"],
      hint: "Basahin kung ano ang unang ilalagay.",
      correctFeedback: "Tama! Nasa ilalim ang tela.",
      incorrectFeedback: "Muntik na! Basahin muli ang ayos."
    },
    questions: [
      {
        id: "market-mango-count",
        prompt: "Ilang mangga ang kailangan?",
        choices: ["Tatlo", "Dalawa", "Isa", "Apat"],
        hint: "Tingnan ang bilang ng mangga.",
        explanation: "Tatlong mangga ang kailangan.",
        correctFeedback: "Tama. Tatlong mangga ang ilalagay sa kahon.",
        incorrectFeedback: "Muntik na! Tingnan muli ang bilang ng mangga."
      },
      {
        id: "market-second-item",
        prompt: "Ano ang pangalawang ilalagay?",
        choices: ["Mga pitsel", "Nakatuping tela", "Mga mangga", "Welcome sign"],
        hint: "Tingnan kung ano ang kasunod ng tela.",
        explanation: "Pangalawa ang mga pitsel.",
        correctFeedback: "Tama. Pangalawang ilalagay ang mga pitsel.",
        incorrectFeedback: "Muntik na! Sundan muli ang ayos."
      },
      {
        id: "market-recipient",
        prompt: "Sino ang kukuha ng mga gamit?",
        choices: ["Lolo Ambo", "Miss Estelle", "Bridge Keeper", "Tindero sa Palengke"],
        hint: "Tingnan ang pangalan sa huling pangungusap.",
        explanation: "Dadalhin ang kahon kay Lolo Ambo.",
        correctFeedback: "Tama. Kay Lolo Ambo ang mga gamit.",
        incorrectFeedback: "Muntik na! Hanapin kung sino ang tatanggap."
      }
    ],
    completionCondition: "Naayos ang mga gamit at nasagot ang mga tanong.",
    worldResult: "Handa nang dalhin ang mga gamit.",
    reward: "Supply Token"
  },
  "village-delivery": {
    location: "silangang mga bahay",
    situation: "May note si Lolo Ambo para sa mga gamit.",
    objective: "Dalhin ang mga gamit kay Lolo Ambo",
    objectiveHelp: "Pumunta sa silangang bahay. Kausapin si Lolo Ambo.",
    briefing: [
      "Ayos ang kahon. Nasa note kung saan ilalagay ang bawat gamit.",
      "Basahin ang note. Hanapin kung saan dadalhin ang mga pitsel."
    ],
    reading: {
      format: "Delivery Note",
      title: "Saan Dadalhin ang mga Gamit",
      pages: [
        "Iwan ang mga mangga sa mesa sa palengke. Dalhin ang dalawang pitsel sa mesa sa plaza.",
        "Ibigay ang tela sa Bridge Keeper. Ilagay ito sa ligtas na waiting area."
      ]
    },
    facts: ["Sa palengke ang mga mangga.", "Sa mesa sa plaza ang mga pitsel.", "Sa Bridge Keeper ang tela."],
    requiredInteractions: ["Basahin ang note", "Piliin kung saan dadalhin ang mga pitsel", "Sagutin ang mga tanong"],
    action: {
      prompt: "Saan dadalhin ang mga pitsel?",
      choices: ["Sa reading table sa plaza", "Sa lumang tulay", "Sa mesa sa palengke", "Sa daan sa gubat"],
      hint: "Hanapin ang pangungusap tungkol sa mga pitsel.",
      correctFeedback: "Tama! Nasa mesa sa plaza ang mga pitsel.",
      incorrectFeedback: "Muntik na! Hanapin ang pangungusap tungkol sa mga pitsel."
    },
    questions: [
      {
        id: "delivery-mango-place",
        prompt: "Ano ang maiiwan sa palengke?",
        choices: ["Mga mangga", "Mga pitsel", "Nakatuping tela", "Welcome sign"],
        hint: "Basahin ang unang pangungusap.",
        explanation: "Maiiwan ang mga mangga sa mesa sa palengke.",
        correctFeedback: "Tama. Mananatili ang mga mangga sa mesa sa palengke.",
        incorrectFeedback: "May ibang pupuntahan ang bagay na iyon. Balikan ang unang pangungusap."
      },
      {
        id: "delivery-cloth-person",
        prompt: "Sino ang kukuha ng tela?",
        choices: ["Bridge Keeper", "Tindero sa Palengke", "Miss Estelle", "Lolo Ambo"],
        hint: "Basahin ang pangungusap tungkol sa tela.",
        explanation: "Dadalhin ang tela sa Bridge Keeper.",
        correctFeedback: "Tama. Sa Bridge Keeper ang tela.",
        incorrectFeedback: "Muntik na! Tingnan ang ikalawang bahagi."
      },
      {
        id: "delivery-cloth-purpose",
        prompt: "Para saan ang tela?",
        choices: ["Para sa ligtas na waiting area", "Para takpan ang mangga", "Para ayusin ang bahay", "Para balutin ang sign"],
        hint: "Basahin ang huling pangungusap.",
        explanation: "Ipinapakita ng tela ang ligtas na waiting area.",
        correctFeedback: "Tama. Makikita na ang ligtas na waiting area.",
        incorrectFeedback: "Muntik na! Basahin kung saan ilalagay ang tela."
      }
    ],
    completionCondition: "Nadala ang mga pitsel at nasagot ang mga tanong.",
    worldResult: "Nasa tamang lugar na ang mga gamit.",
    reward: "Delivery Stamp"
  },
  "bridge-safety": {
    location: "lumang tulay",
    situation: "Kailangang ligtas tumawid ang mga mambabasa sa lumang tulay.",
    objective: "Dalhin ang tela sa Bridge Keeper",
    objectiveHelp: "Pumunta sa lumang tulay. Kausapin ang Bridge Keeper.",
    briefing: [
      "Ilagay ang tela sa waiting area. Kailangan nating tumawid nang ligtas.",
      "Basahin ang mga hakbang. Piliin ang unang gagawin."
    ],
    reading: {
      format: "Mga Hakbang sa Kaligtasan",
      title: "Paano Tumawid sa Tulay",
      pages: [
        "Una, maghintay sa tela. Tumawid kapag nagtaas ng kamay ang Bridge Keeper. Pumila at humawak sa gilid.",
        "Lumayo matapos tumawid. Bigyan ng puwang ang susunod. Kapag basa ang daan, huminto at sabihin sa Bridge Keeper."
      ]
    },
    facts: ["Maghintay muna sa tela.", "Pumila at humawak sa gilid.", "Lumayo pagkatapos tumawid. Sabihin kung basa ang daan."],
    requiredInteractions: ["Basahin ang mga hakbang", "Piliin ang unang gagawin", "Sagutin ang mga tanong"],
    action: {
      prompt: "Ano ang una mong gagawin sa tulay?",
      choices: ["Maghintay sa tela", "Tumakbong mag-isa", "Pumunta sa gubat", "Lumayo agad sa tulay"],
      hint: "Basahin ang unang hakbang.",
      correctFeedback: "Tama! Dito ang waiting area.",
      incorrectFeedback: "Muntik na! Basahin muli ang unang hakbang."
    },
    questions: [
      {
        id: "bridge-cross-method",
        prompt: "Paano sila tatawid?",
        choices: ["Nakapila at hawak ang gilid", "Magkapares at tumatakbo", "Mag-isa at walang hawak", "Sa damuhan"],
        hint: "Basahin kung paano pipila.",
        explanation: "Dapat pumila at humawak sa gilid.",
        correctFeedback: "Tama. Pumila at humawak sa gilid.",
        incorrectFeedback: "Muntik na! Basahin kung paano tatawid."
      },
      {
        id: "bridge-after-crossing",
        prompt: "Ano ang gagawin pagkatapos tumawid?",
        choices: ["Lumayo sa tulay", "Maghintay sa gitna", "Bumalik sa tela", "Maglagay ng mangga"],
        hint: "Basahin ang unang linya sa pangalawang bahagi.",
        explanation: "Lalayo sila para may lugar ang susunod.",
        correctFeedback: "Tama. May lugar na ang susunod.",
        incorrectFeedback: "Muntik na! Basahin ang gagawin matapos tumawid."
      },
      {
        id: "bridge-wet-path",
        prompt: "Bakit hihinto sa basang daan?",
        choices: ["Para sabihing delikado ito", "Para baguhin ang listahan", "Para ilipat ang sign", "Para dagdagan ang tubig"],
        hint: "Basahin ang huling hakbang.",
        explanation: "Delikado ang basang daan. Dapat sabihin ito sa Bridge Keeper.",
        correctFeedback: "Tama. Mas ligtas kapag nagsabi ka.",
        incorrectFeedback: "Muntik na! Hanapin kung sino ang dapat sabihan."
      }
    ],
    completionCondition: "Handa ang waiting area at nasagot ang mga tanong.",
    worldResult: "Handa na ang ligtas na tawiran sa lumang tulay.",
    reward: "Bridge Pass"
  },
  "forest-route": {
    location: "daan sa tabi ng ilog",
    situation: "Nasa kabila ng tulay ang susunod na reading area.",
    objective: "Tanungin ang Bridge Keeper tungkol sa daan sa gubat",
    objectiveHelp: "Kausapin muli ang Bridge Keeper. Kunin ang gabay.",
    briefing: [
      "Handa na ang tulay. Gamitin ang guide papunta sa reading area.",
      "Tingnan ang mga tanda. Pagkatapos, pumili ng daan."
    ],
    reading: {
      format: "Guide sa Daan",
      title: "Daan Papunta sa Reading Area",
      pages: [
        "Tumawid sa lumang tulay. Dumaan sa bukas na gate ni Mang Yato. Lampasan ang isang sunflower at pumunta sa mga puno.",
        "Inayos ni Mang Panda ang sign sa mga puno. Kumanan para sa reading area. Ang kaliwang daan ay papunta sa mga bahay.",
        "May dalang libro si Miss Yuuri sa reading area. Para ito sa mga mambabasang darating doon."
      ]
    },
    facts: ["May sunflower sa lampas ng bukas na gate ni Mang Yato.", "Sabi ng sign ni Mang Panda, kumanan sa mga puno.", "May dalang libro si Miss Yuuri para sa mga mambabasa sa reading area."],
    requiredInteractions: ["Basahin ang gabay", "Piliin ang daan sa mga puno", "Sagutin ang lahat ng tanong sa daan"],
    action: {
      prompt: "Saan ka liliko sa mga puno?",
      choices: ["Kumanan sa mga puno", "Kumaliwa sa mga bahay", "Bumalik sa tulay", "Lumabas sa sunflower"],
      hint: "Basahin kung saan papunta ang kanan at kaliwa.",
      correctFeedback: "Tama! Nasa reading area ka na.",
      incorrectFeedback: "Muntik na! Ihambing muli ang kanan at kaliwa."
    },
    questions: [
      {
        id: "forest-first-landmark",
        prompt: "Ano ang lampas sa gate?",
        choices: ["Isang sunflower", "Mesa sa palengke", "Welcome sign", "Mga bahay"],
        hint: "Basahin ang unang bahagi pagkatapos ng gate ni Mang Yato.",
        explanation: "May isang sunflower sa lampas ng bukas na gate.",
        correctFeedback: "Tama. May sunflower sa daan ni Mang Yato.",
        incorrectFeedback: "Muntik na! Tingnan kung ano ang lampas ng bukas na gate."
      },
      {
        id: "forest-left-route",
        prompt: "Saan ang turo ng sign ni Panda?",
        choices: ["Kanan sa mga puno", "Kaliwa sa mga bahay", "Balik sa tulay", "Papunta sa palengke"],
        hint: "Basahin ang sign ni Mang Panda sa ikalawang bahagi.",
        explanation: "Kanan sa mga puno ang turo ng sign ni Mang Panda.",
        correctFeedback: "Tama. Kanan ang turo ng sign ni Mang Panda.",
        incorrectFeedback: "Muntik na! Tingnan kung saan ang turo ng sign."
      },
      {
        id: "forest-route-evidence",
        prompt: "Bakit may libro si Yuuri?",
        choices: ["Para sa mga mambabasa", "Para sa kahon sa palengke", "Para sa gilid ng tulay", "Para sa mga bahay"],
        hint: "Isipin kung sino ang pupunta sa reading area.",
        explanation: "Para sa mga mambabasa ang dalang libro ni Miss Yuuri.",
        correctFeedback: "Tama. May libro si Miss Yuuri para sa mga mambabasa.",
        incorrectFeedback: "Muntik na! Isipin kung sino ang kailangan ng libro sa reading area."
      }
    ],
    completionCondition: "Napili ang tamang daan at nasagot ang mga tanong.",
    worldResult: "Alam na natin ang ligtas na daan sa reading area.",
    reward: "Trail Marker"
  },
  "community-finale": {
    location: "gitnang plaza",
    situation: "Handa na si Miss Estelle na simulan ang pagbasa.",
    objective: "Bumalik kay Miss Estelle para sa huling mensahe",
    objectiveHelp: "Bumalik sa plaza. Kausapin si Miss Estelle.",
    briefing: [
      "Inihanda mo ang bawat lugar. Ginawa mo ring ligtas ang tulay.",
      "Basahin ang huling mensahe. Tingnan ang buong reading trip."
    ],
    reading: {
      format: "Mensahe ng Programa",
      title: "Ang Reading Trip",
      pages: [
        "Magsisimula ang mga mambabasa sa sign sa plaza. Sunod ang palengke. Gagamitin nila ang mga pitsel sa plaza.",
        "Maghihintay sila sa tela sa tulay. Pipila sila at hahawak sa gilid. Lalampas sila sa sunflower at kakanan sa mga puno.",
        "Dala ni Miss Yuuri ang mga libro. Tinitingnan ni Mang Panda ang mga sign sa daan. Ikinukuwento ni Mr. Kikushibu ang Lost Kingdom.",
        "Handa na ang plaza, palengke, tulay, at daan sa gubat. Sisimulan ni Miss Estelle ang programa sa sign."
      ]
    },
    facts: [
      "Magsisimula sa sign sa plaza.",
      "Sunod ang palengke, tulay, at daan sa gubat.",
      "Tumutulong sina Miss Yuuri, Mang Panda, at Mr. Kikushibu sa reading trip.",
      "Sisimulan ni Miss Estelle ang programa kapag handa na ang lahat."
    ],
    requiredInteractions: ["Basahin ang mensahe", "Piliin ang simula", "Sagutin ang mga tanong"],
    action: {
      prompt: "Saan magsisimula ang reading trip?",
      choices: ["Sa sign sa gitnang plaza", "Sa mga puno", "Sa kabila ng tulay", "Sa mga bahay"],
      hint: "Basahin kung saan ang simula.",
      correctFeedback: "Tama! Magkikita ang lahat sa sign.",
      incorrectFeedback: "Muntik na! Hanapin kung saan magsisimula."
    },
    questions: [
      {
        id: "final-journey-order",
        prompt: "Ano ang tamang ayos?",
        choices: ["Plaza, palengke, tulay, gubat", "Palengke, gubat, plaza, tulay", "Tulay, mga bahay, palengke, plaza", "Gubat, tulay, palengke, mga bahay"],
        hint: "Sundan ang mga lugar mula sa simula.",
        explanation: "Plaza muna, palengke, tulay, at gubat.",
        correctFeedback: "Tama. Iyan ang ayos ng apat na lugar.",
        incorrectFeedback: "Muntik na! Sundan ang mga lugar mula sa sign."
      },
      {
        id: "final-kingdom-story",
        prompt: "Sino ang may kuwento ng kingdom?",
        choices: ["Si Mr. Kikushibu", "Si Miss Yuuri", "Si Mang Panda", "Si Mang Yato"],
        hint: "Basahin ang bahagi tungkol sa Lost Kingdom.",
        explanation: "Si Mr. Kikushibu ang nagkukuwento tungkol sa Lost Kingdom.",
        correctFeedback: "Tama. Si Mr. Kikushibu ang may kuwento ng kingdom.",
        incorrectFeedback: "Muntik na! Hanapin kung sino ang may kuwento ng Lost Kingdom."
      },
      {
        id: "final-ready-condition",
        prompt: "Kailan puwedeng magsimula ang pagbasa?",
        choices: ["Kapag handa ang apat na lugar", "Kapag handa ang mga mangga", "Kapag pinili ang kaliwa", "Kapag nasa tulay ang pitsel"],
        hint: "Basahin kung ano ang dapat handa.",
        explanation: "Magsisimula kapag handa ang apat na lugar.",
        correctFeedback: "Tama. Handa na ang lahat.",
        incorrectFeedback: "Muntik na! Hanapin kung ano ang dapat maging handa."
      },
      {
        id: "final-main-idea",
        prompt: "Tungkol saan ang mensahe?",
        choices: ["Sa reading trip ng mga lugar", "Sa pagsara ng palengke", "Sa paggawa ng tulay", "Sa pananatili sa mga bahay"],
        hint: "Isipin ang sinasabi ng buong mensahe.",
        explanation: "Tungkol ito sa reading trip sa lahat ng lugar.",
        correctFeedback: "Tama. Pinagdugtong mo ang lahat ng lugar.",
        incorrectFeedback: "Muntik na! Isipin ang lahat ng lugar."
      }
    ],
    completionCondition: "Napili ang tamang simula at nasagot ang mga tanong.",
    worldResult: "Bukas na ang reading activity. Handa ang bawat lugar.",
    reward: "Community Reader Badge"
  }
};

export function applyFilipinoMissionTranslation(mission: MissionDefinition): MissionDefinition {
  const translation = FILIPINO_MISSION_TRANSLATIONS[mission.id];
  const questionsById = new Map(translation.questions.map((question) => [question.id, question]));
  return {
    ...mission,
    ...translation,
    reading: { ...mission.reading, ...translation.reading },
    action: {
      ...mission.action,
      ...translation.action,
      choices: mission.action.choices.map((choice, index) => ({ ...choice, text: translation.action.choices[index] }))
    },
    questions: mission.questions.map((question) => {
      const translated = questionsById.get(question.id);
      if (!translated) throw new Error(`Missing Filipino translation for question ${question.id}.`);
      return {
        ...question,
        ...translated,
        choices: question.choices.map((choice, index) => ({ ...choice, text: translated.choices[index] }))
      };
    })
  };
}
