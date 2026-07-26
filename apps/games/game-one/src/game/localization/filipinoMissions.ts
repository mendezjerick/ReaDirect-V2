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
    location: "gitnang liwasan",
    situation: "Naghahanda ang nayon para sa sabayang pagbasa.",
    objective: "Kausapin si Miss Estelle sa gitnang liwasan",
    objectiveHelp: "Lumapit kay Miss Estelle. Piliin ang Kausapin.",
    briefing: [
      "Magbabasa nang sama-sama ang nayon. Tulungan mo kaming maghanda.",
      "Basahin ang paunawa. Hanapin kung saan ilalagay ang karatula."
    ],
    reading: {
      format: "Paunawa sa Komunidad",
      title: "Kung Saan Magsisimula ang Paglalakbay sa Pagbasa",
      pages: [
        "Magsisimula ngayong hapon ang pagbasa. Gaganapin ito sa gitnang liwasan.",
        "Maghihintay si Miss Estelle sa tabi ng daan. Ilagay roon ang karatula. Pagkatapos, pumunta sa palengke."
      ]
    },
    facts: ["Magsisimula ang gawain sa gitnang liwasan.", "Ilalagay ang karatula sa tabi ng daan sa liwasan.", "Ang palengke ang susunod."],
    requiredInteractions: ["Basahin ang paunawa", "Ilagay ang karatula sa tabi ng daan sa liwasan", "Sagutin ang lahat ng tanong sa paunawa"],
    action: {
      prompt: "Saan mo ilalagay ang karatula ng pagsalubong?",
      choices: ["Sa tabi ng daan sa gitnang liwasan", "Sa lumang tulay", "Sa likod ng palengke", "Sa daan sa gubat"],
      hint: "Binanggit sa paunawa ang panimulang lugar at ang eksaktong puwesto sa tabi nito.",
      correctFeedback: "Tama! Nasa tabi na ng daan ang karatula.",
      incorrectFeedback: "Muntik na! Basahin muli ang ikalawang pangungusap."
    },
    questions: [
      {
        id: "plaza-start-place",
        prompt: "Saan magsisimula ang gawaing pagbasa para sa komunidad?",
        choices: ["Gitnang liwasan", "Lumang tulay", "Palengke", "Daan sa gubat"],
        hint: "Tingnan ang unang pangungusap ng paunawa.",
        explanation: "Sinasabi sa paunawa na magsisimula ang gawain sa gitnang liwasan.",
        correctFeedback: "Tama. Magtitipon ang mga mambabasa sa gitnang liwasan.",
        incorrectFeedback: "Muntik na! Hanapin kung saan magsisimula ang gawain."
      },
      {
        id: "plaza-next-stop",
        prompt: "Saan ka pupunta pagkatapos ilagay ang karatula?",
        choices: ["Sa palengke", "Sa tulay", "Sa gubat", "Sa silangang mga bahay"],
        hint: "Basahin ang huling bahagi ng paunawa.",
        explanation: "Sinasabi sa paunawa na ilagay ang karatula bago pumunta sa palengke.",
        correctFeedback: "Tama. Ang palengke ang susunod na hintuan.",
        incorrectFeedback: "Muntik na! Basahin kung saan pupunta pagkatapos."
      }
    ],
    completionCondition: "Nailagay nang tama ang karatula at nasagot ang dalawang tanong sa paunawa.",
    worldResult: "May karatula na ng pagsalubong sa daan sa gitnang liwasan.",
    reward: "Lasong Pagsalubong"
  },
  "market-supplies": {
    location: "palengke",
    situation: "Kailangan ng mga mesa sa gawain ang tamang dami ng kagamitan na nakaayos ayon sa nakasulat.",
    objective: "Puntahan ang Tindero sa Palengke para sa mga kagamitan",
    objectiveHelp: "Pumunta sa palengke. Kausapin ang Tindero.",
    briefing: [
      "Nagpadala si Miss Estelle ng listahan. Ilagay sa tamang ayos ang mga gamit.",
      "Basahin ang listahan. Piliin ang unang ilalagay."
    ],
    reading: {
      format: "Listahan ng mga Kagamitan",
      title: "Mga Kagamitan para sa Mesa ng Pagbasa",
      pages: [
        "Maghanda ng tatlong mangga. Kumuha ng dalawang pitsel at isang nakatiklop na mantel.",
        "Ilagay muna ang mantel. Isunod ang mga pitsel. Ilagay sa ibabaw ang mga mangga. Dalhin ang kahon kay Lolo Ambo."
      ]
    },
    facts: ["May tatlong mangga.", "May dalawang pitsel ng tubig.", "Unang ilalagay ang mantel at dadalhin ang mga kagamitan kay Lolo Ambo."],
    requiredInteractions: ["Basahin ang listahan", "Piliin ang unang ilalagay", "Sagutin ang lahat ng tanong sa listahan"],
    action: {
      prompt: "Ano ang una mong ilalagay sa kahon?",
      choices: ["Ang nakatiklop na mantel", "Ang tatlong mangga", "Ang dalawang pitsel ng tubig", "Isang bakanteng basket"],
      hint: "Ipinaliliwanag sa ikalawang bahagi kung ano ang dapat nakalatag sa ilalim.",
      correctFeedback: "Tama! Patag ang mantel sa ilalim.",
      incorrectFeedback: "Muntik na! Basahin muli ang ayos."
    },
    questions: [
      {
        id: "market-mango-count",
        prompt: "Ilang mangga ang hinihingi sa listahan?",
        choices: ["Tatlo", "Dalawa", "Isa", "Apat"],
        hint: "May bilang bago ang salitang mangga sa unang pangungusap.",
        explanation: "Tatlong mangga ang hinihingi sa listahan.",
        correctFeedback: "Tama. Tatlong mangga ang ilalagay sa kahon.",
        incorrectFeedback: "Muntik na! Tingnan muli ang bilang ng mangga."
      },
      {
        id: "market-second-item",
        prompt: "Ano ang pangalawang ilalagay?",
        choices: ["Mga pitsel ng tubig", "Nakatiklop na mantel", "Mga mangga", "Karatula ng pagsalubong"],
        hint: "Sundan ang mga salitang una, isunod, at saka.",
        explanation: "Isusunod ang mga pitsel pagkatapos ng mantel at bago ang mga mangga.",
        correctFeedback: "Tama. Pangalawang ilalagay ang mga pitsel.",
        incorrectFeedback: "Muntik na! Sundan muli ang ayos."
      },
      {
        id: "market-recipient",
        prompt: "Sino ang tatanggap ng mga kagamitan?",
        choices: ["Lolo Ambo", "Miss Estelle", "Bridge Keeper", "Tindero sa Palengke"],
        hint: "Binanggit sa huling pangungusap ang taong malapit sa silangang mga bahay.",
        explanation: "Sinasabi sa listahan na ipadala ang lahat kay Lolo Ambo.",
        correctFeedback: "Tama. Naghihintay si Lolo Ambo sa mga kagamitan.",
        incorrectFeedback: "Muntik na! Hanapin kung sino ang tatanggap."
      }
    ],
    completionCondition: "Nailagay sa tamang ayos ang mga kagamitan at nasagot ang lahat ng tanong.",
    worldResult: "Ligtas nang nakahanda ang mga kagamitan para ihatid.",
    reward: "Tanda ng Kagamitan"
  },
  "village-delivery": {
    location: "silangang mga bahay",
    situation: "May tala si Lolo Ambo para sa mga kagamitan.",
    objective: "Ihatid ang mga kagamitan kay Lolo Ambo malapit sa silangang mga bahay",
    objectiveHelp: "Pumunta sa silangang bahay. Kausapin si Lolo Ambo.",
    briefing: [
      "Ligtas ang kahon. Sinasabi ng tala kung saan ilalagay ang bawat gamit.",
      "Basahin ang tala. Hanapin kung saan dadalhin ang mga pitsel."
    ],
    reading: {
      format: "Tala sa Paghahatid",
      title: "Tala para sa mga Hintuan ng Gawain",
      pages: [
        "Iwan ang mga mangga sa mesa sa palengke. Dalhin ang dalawang pitsel sa mesa sa liwasan.",
        "Ibigay ang mantel sa Bridge Keeper. Mamarkahan nito ang ligtas na hintayan."
      ]
    },
    facts: ["Mananatili ang mga mangga sa mesa sa palengke.", "Pupunta ang mga pitsel sa mesa ng pagbasa sa liwasan.", "Pupunta ang mantel sa Bridge Keeper."],
    requiredInteractions: ["Basahin ang tala", "Piliin ang pupuntahan ng mga pitsel", "Sagutin ang lahat ng tanong sa tala"],
    action: {
      prompt: "Saan mo dadalhin ang dalawang pitsel ng tubig?",
      choices: ["Sa mesa ng pagbasa sa gitnang liwasan", "Sa hintayan sa lumang tulay", "Sa mesa ng meryenda sa palengke", "Sa daan sa gubat"],
      hint: "Itugma ang bagay sa unang talata sa lugar na pupuntahan nito.",
      correctFeedback: "Tama! Nasa mesa sa liwasan ang mga pitsel.",
      incorrectFeedback: "Muntik na! Hanapin ang pangungusap tungkol sa mga pitsel."
    },
    questions: [
      {
        id: "delivery-mango-place",
        prompt: "Aling bagay ang mananatili sa mesa sa palengke?",
        choices: ["Mga mangga", "Mga pitsel ng tubig", "Nakatiklop na mantel", "Karatula ng pagsalubong"],
        hint: "Itinambal sa unang pangungusap ang isang bagay sa meryenda.",
        explanation: "Mananatili ang mga mangga sa mesa sa palengke para sa meryenda.",
        correctFeedback: "Tama. Mananatili ang mga mangga sa mesa sa palengke.",
        incorrectFeedback: "May ibang pupuntahan ang bagay na iyon. Balikan ang unang pangungusap."
      },
      {
        id: "delivery-cloth-person",
        prompt: "Sino ang tatanggap ng nakatiklop na mantel?",
        choices: ["Bridge Keeper", "Tindero sa Palengke", "Miss Estelle", "Lolo Ambo"],
        hint: "Binanggit sa ikalawang talata ang taong nangangailangan ng mantel.",
        explanation: "Sinasabi sa tala na dalhin ang mantel sa Bridge Keeper.",
        correctFeedback: "Tama. Kailangan ng Bridge Keeper ang mantel.",
        incorrectFeedback: "Muntik na! Tingnan ang ikalawang bahagi."
      },
      {
        id: "delivery-cloth-purpose",
        prompt: "Bakit kailangan ng Bridge Keeper ang mantel?",
        choices: ["Upang markahan ang ligtas na hintayan", "Upang takpan ang mga mangga", "Upang ayusin ang isang bahay", "Upang balutin ang karatula"],
        hint: "Sinasabi sa huling pangungusap kung ano ang mamarkahan ng mantel.",
        explanation: "Mamarkahan ng mantel ang ligtas na hintayan sa tabi ng lumang tulay.",
        correctFeedback: "Tama. Magiging malinaw ang ligtas na hintayan dahil sa mantel.",
        incorrectFeedback: "Muntik na! Basahin kung ano ang mamarkahan ng mantel."
      }
    ],
    completionCondition: "Naihatid nang tama ang mga pitsel at nasagot ang lahat ng tanong sa tala.",
    worldResult: "Nasa tamang hintuan na ang mga kagamitan.",
    reward: "Tatak ng Paghahatid"
  },
  "bridge-safety": {
    location: "lumang tulay",
    situation: "Kailangang ligtas na makatawid ang mga mambabasa sa lumang tulay papunta sa panlabas na hintuan ng pagbasa.",
    objective: "Dalhin ang mantel sa Bridge Keeper sa lumang tulay",
    objectiveHelp: "Pumunta sa lumang tulay. Kausapin ang Bridge Keeper.",
    briefing: [
      "Mamarkahan ng mantel ang hintayan. Kailangan nating tumawid nang ligtas.",
      "Basahin ang mga hakbang. Piliin ang unang gagawin."
    ],
    reading: {
      format: "Mga Tagubilin sa Kaligtasan",
      title: "Pagtawid sa Lumang Tulay",
      pages: [
        "Una, maghintay sa mantel. Tumawid kapag nagtaas ng kamay ang Bridge Keeper. Pumila at humawak sa rehas.",
        "Lumayo matapos tumawid. Bigyan ng puwang ang susunod. Kapag basa ang daan, huminto at sabihin sa Bridge Keeper."
      ]
    },
    facts: ["Maghintay muna sa mantel.", "Tumawid nang isang hanay habang hawak ang rehas.", "Lumayo sa pasukan pagkatapos tumawid at ipaalam kung basa ang daan."],
    requiredInteractions: ["Basahin ang mga tagubilin", "Piliin ang unang gagawin sa tulay", "Sagutin ang lahat ng tanong sa kaligtasan"],
    action: {
      prompt: "Ano ang una mong gagawin sa tulay?",
      choices: ["Maghintay sa mantel", "Tumakbong mag-isa patawid", "Pumunta sa gubat", "Lumayo agad sa kabilang pasukan"],
      hint: "Nagsisimula sa salitang Una ang mga tagubilin.",
      correctFeedback: "Tama! Minarkahan ng mantel ang hintayan.",
      incorrectFeedback: "Muntik na! Basahin muli ang unang hakbang."
    },
    questions: [
      {
        id: "bridge-cross-method",
        prompt: "Paano tatawid ang mga mambabasa pagkatapos ng hudyat?",
        choices: ["Isang hanay habang hawak ang rehas", "Magkapares habang tumatakbo", "Isa-isa nang hindi humahawak sa rehas", "Sa damuhan sa tabi ng tulay"],
        hint: "Basahin ang tagubiling nagsisimula sa Sunod.",
        explanation: "Dapat tumawid ang mga mambabasa nang isang hanay at humawak sa rehas.",
        correctFeedback: "Tama. Nagiging maayos ang pagtawid kapag isang hanay at hawak ang rehas.",
        incorrectFeedback: "Muntik na! Basahin kung paano tatawid."
      },
      {
        id: "bridge-after-crossing",
        prompt: "Ano ang gagawin pagkatapos makarating sa kabilang panig?",
        choices: ["Lumayo sa pasukan ng tulay", "Maghintay sa gitna ng tulay", "Bumalik sa mantel", "Maglagay ng mangga sa rehas"],
        hint: "Nasa simula ng ikalawang talata ang gagawin pagkatapos tumawid.",
        explanation: "Lalayo ang mga mambabasa sa pasukan upang may puwang ang susunod.",
        correctFeedback: "Tama. Ang paglayo sa pasukan ay nagbibigay-daan sa susunod na mambabasa.",
        incorrectFeedback: "Muntik na! Basahin ang gagawin matapos tumawid."
      },
      {
        id: "bridge-wet-path",
        prompt: "Bakit kailangang huminto kapag basa ang daan?",
        choices: ["Kailangang malaman ng Bridge Keeper ang panganib", "Kailangang baguhin ang listahan sa palengke", "Kailangang ilipat ang karatula", "Kailangan pa ng tubig sa mga pitsel"],
        hint: "Gamitin ang huling tagubilin at isipin kung bakit mapanganib ang basang lupa.",
        explanation: "Maaaring delikado ang basang daan kaya dapat itong sabihin sa Bridge Keeper.",
        correctFeedback: "Tama. Nakakatulong sa kaligtasan ang pagsabi tungkol sa basang daan.",
        incorrectFeedback: "Muntik na! Hanapin kung sino ang dapat sabihan."
      }
    ],
    completionCondition: "Namarkahan ang hintayan, napili ang ligtas na unang hakbang, at nasagot ang lahat ng tanong.",
    worldResult: "May malinaw nang hintayan at maayos na paraan ng pagtawid sa lumang tulay.",
    reward: "Pahintulot sa Tulay"
  },
  "forest-route": {
    location: "daan sa tabi ng ilog",
    situation: "Nasa kabila ng tulay ang susunod na hintuan.",
    objective: "Tanungin ang Bridge Keeper tungkol sa daan sa gubat",
    objectiveHelp: "Kausapin muli ang Bridge Keeper. Kunin ang gabay.",
    briefing: [
      "Handa na ang tulay. Gamitin ang gabay papunta sa panlabas na hintuan.",
      "Tingnan ang mga palatandaan. Pagkatapos, pumili ng daan."
    ],
    reading: {
      format: "Gabay sa Daan",
      title: "Daan Patungo sa Panlabas na Hintuan ng Pagbasa",
      pages: [
        "Tumawid sa lumang tulay. Sundan ang makitid na daan. Lampasan ang isang sunflower. Maglakad patungo sa mga puno.",
        "Kumanan sa mga puno. Ang kaliwang daan ay papunta sa mga bahay. Nasa kabila ng mga puno ang hintuan."
      ]
    },
    facts: ["Sundan ang ilog pagkatapos ng tulay.", "Lampasan ang isang sunflower bago ang hanay ng mga puno.", "Kumanan sa mga puno; ang kaliwa ay papunta sa silangang mga bahay."],
    requiredInteractions: ["Basahin ang gabay", "Piliin ang daan sa mga puno", "Sagutin ang lahat ng tanong sa daan"],
    action: {
      prompt: "Aling daan ang pipiliin mo sa hanay ng mga puno?",
      choices: ["Kumanan sa kabila ng mga puno", "Kumaliwa patungo sa silangang mga bahay", "Bumalik sa lumang tulay", "Lumabas sa daan sa sunflower"],
      hint: "Ipinaghahambing sa ikalawang talata ang tamang liko at ang daan patungo sa silangang mga bahay.",
      correctFeedback: "Tama! Narating mo ang panlabas na hintuan.",
      incorrectFeedback: "Muntik na! Ihambing muli ang kanan at kaliwa."
    },
    questions: [
      {
        id: "forest-first-landmark",
        prompt: "Aling palatandaan ang mauuna bago ang hanay ng mga puno?",
        choices: ["Nag-iisang sunflower", "Mesa sa palengke", "Karatula ng pagsalubong", "Silangang mga bahay"],
        hint: "Sundan ang daan mula sa tulay sa unang talata.",
        explanation: "Daraanan ang nag-iisang sunflower bago makarating sa hanay ng mga puno.",
        correctFeedback: "Tama. Ipinapakita ng sunflower na nasa tamang daan ka pa.",
        incorrectFeedback: "Muntik na! Hanapin ang palatandaan bago ang mga puno."
      },
      {
        id: "forest-left-route",
        prompt: "Saan patungo ang kaliwang daan?",
        choices: ["Sa silangang mga bahay", "Sa panlabas na hintuan", "Sa palengke", "Sa gitnang liwasan"],
        hint: "Nagbabala ang gabay tungkol sa kaliwang daan at binanggit ang pupuntahan nito.",
        explanation: "Patungo sa silangang mga bahay ang kaliwang daan.",
        correctFeedback: "Tama. Pabalik sa silangang mga bahay ang kaliwang daan.",
        incorrectFeedback: "Muntik na! Basahin kung saan papunta ang kaliwa."
      },
      {
        id: "forest-route-evidence",
        prompt: "Aling detalye ang nagpapatunay na tama ang napili mong daan?",
        choices: ["Makikita ang panlabas na hintuan sa kabila ng mga puno", "Nasa likod ng palengke ang tulay", "Nasa tabi ng sunflower ang mga pitsel", "Nasa silangang mga bahay ang karatula"],
        hint: "Gamitin ang huling pangungusap upang malaman kung ano ang makikita pagkatapos ng tamang liko.",
        explanation: "Ang pagkakita sa hintuan sa kabila ng mga puno ang patunay na tama ang pagliko.",
        correctFeedback: "Tama. Pinatutunayan ng hintuan sa kabila ng mga puno na tama ang daan.",
        incorrectFeedback: "Muntik na! Hanapin ang makikita matapos kumanan."
      }
    ],
    completionCondition: "Napili ang tamang daan at nasagot ang lahat ng tanong tungkol sa ruta.",
    worldResult: "Kumpirmado na ang ligtas na daan patungo sa panlabas na hintuan.",
    reward: "Tanda sa Daan"
  },
  "community-finale": {
    location: "gitnang liwasan",
    situation: "Handa na si Miss Estelle na simulan ang pagbasa.",
    objective: "Bumalik kay Miss Estelle para sa huling mensahe ng gawain",
    objectiveHelp: "Bumalik sa liwasan. Kausapin si Miss Estelle.",
    briefing: [
      "Inihanda mo ang bawat hintuan. Ginawa mo ring ligtas ang tulay.",
      "Basahin ang huling mensahe. Pag-ugnayin ang buong paglalakbay."
    ],
    reading: {
      format: "Mensahe ng Programa",
      title: "Ang Paglalakbay sa Pagbasa ng Komunidad",
      pages: [
        "Magsisimula ang mga mambabasa sa karatula sa liwasan. Sunod ang palengke. Gagamitin nila ang mga pitsel sa liwasan.",
        "Maghihintay sila sa mantel sa tulay. Tatawid sila nang isang hanay at hahawak sa rehas. Lalampas sila sa sunflower at kakanan sa mga puno.",
        "Handa na ang liwasan, palengke, tulay, at daan sa gubat. Bubuksan ni Miss Estelle ang programa sa karatula."
      ]
    },
    facts: ["Magsisimula ang paglalakbay sa karatula sa liwasan.", "Magkakasunod ang palengke, tulay, at daan sa gubat.", "Bubuksan ni Miss Estelle ang programa kapag handa na ang lahat."],
    requiredInteractions: ["Basahin ang mensahe ng programa", "Piliin ang pagsisimulan", "Sagutin ang lahat ng huling tanong"],
    action: {
      prompt: "Saan mo gagabayan ang mga mambabasa upang simulan ang buong paglalakbay?",
      choices: ["Sa karatula sa gitnang liwasan", "Sa hanay ng mga puno", "Sa kabilang panig ng lumang tulay", "Sa silangang mga bahay"],
      hint: "Parehong binanggit sa una at huling talata ang pagsisimulan.",
      correctFeedback: "Tama! Magtitipon ang mga mambabasa sa karatula.",
      incorrectFeedback: "Muntik na! Hanapin kung saan magsisimula."
    },
    questions: [
      {
        id: "final-journey-order",
        prompt: "Aling ayos ang kapareho ng nasa mensahe ng programa?",
        choices: ["Liwasan, palengke, tulay, daan sa gubat", "Palengke, daan sa gubat, liwasan, tulay", "Tulay, silangang mga bahay, palengke, liwasan", "Daan sa gubat, tulay, palengke, silangang mga bahay"],
        hint: "Sundan ang paglalakbay mula sa unang talata hanggang sa ikalawa.",
        explanation: "Magsisimula sa liwasan, pupunta sa palengke, tatawid sa tulay, at susundan ang daan sa gubat.",
        correctFeedback: "Tama. Pinag-uugnay ng ayos na iyon ang apat na inihandang lugar.",
        incorrectFeedback: "Muntik na! Sundan ang biyahe mula sa karatula."
      },
      {
        id: "final-bridge-rule",
        prompt: "Aling tuntunin sa kaligtasan ang mahalaga pa rin sa buong paglalakbay?",
        choices: ["Tumawid nang isang hanay habang hawak ang rehas", "Tumakbo pagkatapos lampasan ang sunflower", "Maghintay sa mesa sa palengke", "Kumaliwa sa hanay ng mga puno"],
        hint: "Hanapin ang gagawin ng mga mambabasa sa lumang tulay.",
        explanation: "Inuulit sa huling mensahe ang pagtawid nang isang hanay habang hawak ang rehas.",
        correctFeedback: "Tama. Bahagi ng buong paglalakbay ang tuntunin sa tulay.",
        incorrectFeedback: "Hindi iyan ang tuntunin sa tulay na inulit sa mensahe."
      },
      {
        id: "final-ready-condition",
        prompt: "Kailan maaaring magsimula ang gawain ng komunidad?",
        choices: ["Kapag handa ang liwasan, palengke, tulay, at daan", "Kapag mga mangga lamang ang nakahanda", "Kapag pinili ang kaliwang daan", "Kapag dinala ang mga pitsel sa tulay"],
        hint: "Nakalista sa huling talata ang kailangang maging handa bago magsimula.",
        explanation: "Magsisimula ang gawain kapag handa na ang apat na bahagi ng paglalakbay.",
        correctFeedback: "Tama. Sinusuportahan na ng bawat handang bahagi ang gawain ng komunidad.",
        incorrectFeedback: "Muntik na! Hanapin kung ano ang dapat maging handa."
      },
      {
        id: "final-main-idea",
        prompt: "Tungkol saan higit sa lahat ang mensahe ng programa?",
        choices: ["Kung paano nag-uugnay ang mga inihandang lugar sa isang paglalakbay sa pagbasa", "Kung bakit dapat magsara nang maaga ang palengke", "Kung paano gumawa ng bagong tulay", "Kung bakit dapat manatili ang mga mambabasa sa silangang mga bahay"],
        hint: "Isipin kung ano ang ipinapaliwanag ng tatlong talata kapag pinagsama.",
        explanation: "Pinag-uugnay ng mensahe ang mga inihandang lugar at tagubilin sa isang paglalakbay sa pagbasa.",
        correctFeedback: "Tama. Pinag-ugnay ng iyong ginawa ang bawat binasa at lugar sa isang paglalakbay.",
        incorrectFeedback: "Muntik na! Isipin kung paano nag-uugnay ang mga lugar."
      }
    ],
    completionCondition: "Napili ang tamang pagsisimulan at nasagot ang lahat ng huling tanong.",
    worldResult: "Bukas na ang gawaing pagbasa ng komunidad at handa ang bawat hintuan at daan.",
    reward: "Badge ng Mambabasa ng Komunidad"
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
