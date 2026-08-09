<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;

$repositoryRoot = dirname(__DIR__);
$apiRoot = $repositoryRoot.'/apps/api';

require $apiRoot.'/vendor/autoload.php';
$app = require $apiRoot.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$speech = config('speech');
$definitions = $speech['clara_lines'];

foreach ($speech['assessment_item_cues']['tasks'] as $task => $definition) {
    foreach ($speech['assessment_item_cues']['ordinals'] as $position => $ordinal) {
        $definitions["assessment-{$task}-item-{$position}"] = [
            'text' => sprintf($definition['text'], $ordinal),
            'reference' => $definition['reference'],
            'path' => "{$definition['path']}/assessment-{$task}-item-{$position}.wav",
        ];
    }
}

if (count($definitions) !== 300) {
    throw new RuntimeException('Expected exactly 300 fixed English speech definitions.');
}

$fixedRows = [];
foreach ($definitions as $speechKey => $definition) {
    $policy = fixedPolicy($speechKey);
    $fixedRows[] = [
        $speechKey,
        fixedArea($speechKey),
        $definition['reference'],
        $definition['path'],
        $definition['text'],
        fixedTranslation($speechKey, $definition['text']),
        $policy,
        'approved',
        fixedReviewNotes($policy),
    ];
}

$runtimeRows = runtimeTemplateRows();
if (count($runtimeRows) !== 23) {
    throw new RuntimeException('Expected exactly 23 runtime template definitions.');
}

validateRows($definitions, $fixedRows, $runtimeRows);

$outputDirectory = $repositoryRoot.'/content/tts/v1/fil-PH';
if (! is_dir($outputDirectory) && ! mkdir($outputDirectory, 0777, true) && ! is_dir($outputDirectory)) {
    throw new RuntimeException("Unable to create {$outputDirectory}.");
}

writeCsv(
    $outputDirectory.'/published-lines.csv',
    [
        'speech_key',
        'area',
        'reference_role',
        'audio_path',
        'english_text',
        'filipino_text',
        'translation_policy',
        'review_status',
        'review_notes',
    ],
    $fixedRows,
);

writeCsv(
    $outputDirectory.'/runtime-templates.csv',
    [
        'template_key',
        'reference_role',
        'english_template',
        'filipino_template',
        'required_placeholders',
        'translation_policy',
        'review_status',
        'review_notes',
    ],
    $runtimeRows,
);

echo "Wrote 300 fixed translations and 23 runtime templates.\n";

/** @param list<string> $header
 * @param  list<list<string>>  $rows
 */
function writeCsv(string $path, array $header, array $rows): void
{
    $handle = fopen($path, 'wb');
    if ($handle === false) {
        throw new RuntimeException("Unable to write {$path}.");
    }

    try {
        fputcsv($handle, $header, ',', '"', '\\', "\n");
        foreach ($rows as $row) {
            fputcsv($handle, $row, ',', '"', '\\', "\n");
        }
    } finally {
        fclose($handle);
    }
}

/** @param array<string, array{text: string, reference: string, path: string}> $definitions
 * @param  list<list<string>>  $fixedRows
 * @param  list<list<string>>  $runtimeRows
 */
function validateRows(array $definitions, array $fixedRows, array $runtimeRows): void
{
    $fixedKeys = array_column($fixedRows, 0);
    if (count($fixedKeys) !== count(array_unique($fixedKeys))) {
        throw new RuntimeException('Fixed Filipino speech keys must be unique.');
    }
    if ($fixedKeys !== array_keys($definitions)) {
        throw new RuntimeException('Fixed Filipino speech keys do not match English catalog order.');
    }

    $allowedPolicies = ['translate', 'code_switch_target', 'preserve_english', 'academic_review'];
    foreach ($fixedRows as $row) {
        if ($row[5] === '' || ! in_array($row[6], $allowedPolicies, true)) {
            throw new RuntimeException("Invalid fixed Filipino row {$row[0]}.");
        }
        if (str_contains($row[5], '!')) {
            throw new RuntimeException("Filipino published text cannot contain !: {$row[0]}.");
        }
    }

    $runtimeKeys = array_column($runtimeRows, 0);
    if (count($runtimeKeys) !== count(array_unique($runtimeKeys))) {
        throw new RuntimeException('Runtime Filipino template keys must be unique.');
    }

    foreach ($runtimeRows as $row) {
        preg_match_all('/\{[a-z_]+\}/', $row[2], $englishMatches);
        preg_match_all('/\{[a-z_]+\}/', $row[3], $filipinoMatches);
        $required = $row[4] === '' ? [] : explode('|', $row[4]);
        $english = array_values(array_unique($englishMatches[0]));
        $filipino = array_values(array_unique($filipinoMatches[0]));
        sort($required);
        sort($english);
        sort($filipino);
        if ($required !== $english || $required !== $filipino) {
            throw new RuntimeException("Runtime placeholders do not match for {$row[0]}.");
        }
    }
}

function fixedArea(string $speechKey): string
{
    return match (true) {
        $speechKey === 'lesson-intro' => 'lesson-intro',
        str_starts_with($speechKey, 'learn-with-clara-') => 'learn-with-clara',
        str_starts_with($speechKey, 'assessment-') => 'assessments',
        preg_match('/^lesson-[1-6]-/', $speechKey) === 1 => substr($speechKey, 0, 8),
        default => throw new RuntimeException("Unknown fixed speech area for {$speechKey}."),
    };
}

function fixedPolicy(string $speechKey): string
{
    if (str_starts_with($speechKey, 'assessment-comprehension-')) {
        return 'academic_review';
    }

    if (
        str_contains($speechKey, '-letter-demo-')
        || str_contains($speechKey, '-word-demo-')
        || str_starts_with($speechKey, 'lesson-3-demo-')
        || str_starts_with($speechKey, 'lesson-4-demo-')
        || str_starts_with($speechKey, 'learn-with-clara-')
        || preg_match('/^lesson-[1-5]-complete$/', $speechKey) === 1
        || $speechKey === 'assessment-story-choice'
    ) {
        return 'code_switch_target';
    }

    return 'translate';
}

function fixedReviewNotes(string $policy): string
{
    return match ($policy) {
        'academic_review' => 'Approved by the product owner on 2026-08-08, including academic-content review.',
        'code_switch_target' => 'Approved by the product owner on 2026-08-08. Preserve the English literacy target.',
        default => 'Approved by the product owner on 2026-08-08 for natural child-directed Filipino.',
    };
}

function fixedTranslation(string $speechKey, string $english): string
{
    $ordinal = [
        2 => 'ikalawang',
        3 => 'ikatlong',
        4 => 'ikaapat',
        5 => 'ikalimang',
        6 => 'ikaanim na',
        7 => 'ikapitong',
        8 => 'ikawalong',
        9 => 'ikasiyam na',
        10 => 'ikasampung',
    ];

    if (preg_match('/^assessment-(letters|rhymes|words)-item-(\d+)$/', $speechKey, $match)) {
        $position = (int) $match[2];
        $unit = $ordinal[$position];

        return match ($match[1]) {
            'letters' => "Ngayon, subukan ang {$unit} letra.",
            'rhymes' => "Ngayon, suriin ang {$unit} pares.",
            'words' => "Ngayon, basahin ang {$unit} salita.",
        };
    }

    if (preg_match('/^lesson-1-mission-([1-3])-item-(\d+)$/', $speechKey, $match)) {
        $unit = $ordinal[(int) $match[2]];

        return match ($match[1]) {
            '1' => "Ngayon, subukan ang {$unit} letra.",
            '2' => "Ngayon, hanapin ang unang letra sa {$unit} salita.",
            '3' => "Ngayon, kumpletuhin ang {$unit} salita.",
        };
    }

    if (preg_match('/^lesson-2-mission-([12])-item-(\d+)$/', $speechKey, $match)) {
        $unit = $ordinal[(int) $match[2]];

        return $match[1] === '1'
            ? "Ngayon, basahin ang {$unit} salita."
            : "Ngayon, hanapin at basahin ang {$unit} salitang naka-highlight.";
    }

    if (preg_match('/^lesson-3-mission-1-item-(\d+)$/', $speechKey, $match)) {
        return 'Ngayon, basahin ang '.$ordinal[(int) $match[1]].' parirala.';
    }

    if (preg_match('/^lesson-4-mission-1-item-(\d+)$/', $speechKey, $match)) {
        return 'Ngayon, basahin ang '.$ordinal[(int) $match[1]].' pangungusap.';
    }

    if (str_contains($speechKey, '-letter-demo-')) {
        if (! preg_match('/^The letter name is (.+)\. Listen: (.+)\. Now you try\.$/', $english, $match)) {
            throw new RuntimeException("Cannot resolve isolated-letter target for {$speechKey}.");
        }

        return "Ang pangalan ng letra ay {$match[1]}. Makinig: {$match[2]}. Ngayon, ikaw naman.";
    }

    if (str_contains($speechKey, '-word-demo-')) {
        if (! preg_match('/^The word is (.+)\. Listen: (.+)\. Now you try\.$/', $english, $match)) {
            throw new RuntimeException("Cannot resolve word target for {$speechKey}.");
        }

        return "Ang salita ay {$match[1]}. Makinig: {$match[2]}. Ngayon, ikaw naman.";
    }

    if (str_starts_with($speechKey, 'lesson-3-demo-')) {
        if (! preg_match('/^Listen: (.+)\. Now say the whole phrase\.$/', $english, $match)) {
            throw new RuntimeException("Cannot resolve phrase target for {$speechKey}.");
        }

        return "Makinig: {$match[1]}. Ngayon, sabihin ang buong parirala.";
    }

    if (str_starts_with($speechKey, 'lesson-4-demo-')) {
        if (! preg_match('/^Listen: (.+)\. Now say the whole sentence\.$/', $english, $match)) {
            throw new RuntimeException("Cannot resolve sentence target for {$speechKey}.");
        }

        return "Makinig: {$match[1]}. Ngayon, sabihin ang buong pangungusap.";
    }

    $translations = explicitFixedTranslations();
    if (! isset($translations[$speechKey])) {
        throw new RuntimeException("Missing Filipino translation for {$speechKey}: {$english}");
    }

    return $translations[$speechKey];
}

/** @return array<string, string> */
function explicitFixedTranslations(): array
{
    return [
        'lesson-intro' => 'Kumusta. Masaya akong narito ka. Maghanda tayong magbasa nang magkasama.',

        'lesson-1-mission-1' => 'Tingnan ang malaking letra at maliit na letra. Sabihin ang pangalan ng letra.',
        'lesson-1-mission-2' => 'Hanapin ang unang letra ng salita. Sabihin ang pangalan nito.',
        'lesson-1-mission-3' => 'Hanapin ang nawawalang unang letra. Sabihin ang letrang kukumpleto sa salita.',
        'lesson-1-complete' => 'Tapos na ang unang aralin. Isa ka nang Letter Leader.',
        'lesson-1-technical-retry' => 'Hindi ko iyon narinig nang malinaw. Subukan natin muli.',
        'lesson-1-clue-mission-1' => 'Tingnan ang malaking letra at maliit na letra. Iisa ang pangalan ng mga ito.',
        'lesson-1-clue-mission-2' => 'Tingnan ang pinakaunang letra ng salita. Pangalan lamang ng letrang iyon ang sabihin.',
        'lesson-1-clue-mission-3' => 'Tingnan ang patlang sa unahan. Sabihin ang letrang kukumpleto sa salita.',
        'lesson-1-feedback-independent' => 'Tama. Nahanap mo ito nang mag-isa.',
        'lesson-1-feedback-supported' => 'Tama. Nakatulong ang clue para mahanap mo ito.',
        'lesson-1-feedback-demonstrated' => 'Tama. Nasabi mo nang tama ang letra kasabay ko.',
        'lesson-1-feedback-not-yet' => 'Hindi pa, at ayos lang iyon. Magsanay tayong muli sa letrang ito.',
        'lesson-1-feedback-unscorable' => 'Hindi pa rin ako nakarinig ng malinaw na sagot. Maaari nating balikan ang letrang ito mamaya.',
        'lesson-1-feedback-incorrect-first' => 'Hindi pa gaanong tama ang letrang iyon. Subukan natin muli.',

        'lesson-2-mission-1' => 'Basahin ang salitang nakikita mo. Sabihin ang buong salita.',
        'lesson-2-mission-2' => 'Tingnan ang pangungusap. Hanapin ang salitang naka-highlight, saka sabihin ang salitang iyon.',
        'lesson-2-complete' => 'Tapos na ang ikalawang aralin. Isa ka nang Word Wizard.',
        'lesson-2-technical-retry' => 'Hindi ko iyon narinig nang malinaw. Subukan nating muli ang salita.',
        'lesson-2-clue-mission-1' => 'Tingnan ang bawat letra mula kaliwa pakanan. Pagsamahin ang mga tunog, saka sabihin ang buong salita.',
        'lesson-2-clue-mission-2' => 'Tingnan ang salitang naka-highlight sa pangungusap. Ang salitang iyon lamang ang sabihin.',
        'lesson-2-feedback-independent' => 'Tama. Nabasa mo ang salita nang mag-isa.',
        'lesson-2-feedback-supported' => 'Tama. Nakatulong ang clue para mabasa mo ang salita.',
        'lesson-2-feedback-demonstrated' => 'Tama. Nabasa mo nang tama ang salita kasabay ko.',
        'lesson-2-feedback-not-yet' => 'Hindi pa, at ayos lang iyon. Magsanay tayong muli sa salitang ito.',
        'lesson-2-feedback-unscorable' => 'Hindi pa rin ako nakarinig ng malinaw na sagot. Maaari nating balikan ang salitang ito mamaya.',
        'lesson-2-feedback-incorrect-first' => 'Hindi pa gaanong tama ang salitang iyon. Subukan natin muli.',

        'lesson-3-mission-1' => 'Basahin ang pariralang nakikita mo. Sabihin nang magkakasama ang lahat ng salita.',
        'lesson-3-complete' => 'Tapos na ang ikatlong aralin. Isa ka nang Phrase Pro.',
        'lesson-3-technical-retry' => 'Hindi ko iyon narinig nang malinaw. Subukan nating muli ang parirala.',
        'lesson-3-clue-mission-1' => 'Basahin ang bawat salita mula kaliwa pakanan. Pagkatapos, sabihin ang buong parirala.',
        'lesson-3-feedback-independent' => 'Tama. Nabasa mo ang parirala nang mag-isa.',
        'lesson-3-feedback-supported' => 'Tama. Nakatulong ang clue para mabasa mo ang parirala.',
        'lesson-3-feedback-demonstrated' => 'Tama. Nabasa mo ang buong parirala kasabay ko.',
        'lesson-3-feedback-not-yet' => 'Hindi pa, at ayos lang iyon. Magsanay tayong muli sa pariralang ito.',
        'lesson-3-feedback-unscorable' => 'Hindi pa rin ako nakarinig ng malinaw na sagot. Maaari nating balikan ang pariralang ito mamaya.',
        'lesson-3-feedback-incorrect-first' => 'Hindi pa gaanong tama ang pariralang iyon. Subukan natin muli.',

        'lesson-4-mission-1' => 'Basahin ang pangungusap na nakikita mo. Sabihin ang lahat ng salita mula simula hanggang wakas.',
        'lesson-4-complete' => 'Tapos na ang ikaapat na aralin. Isa ka nang Sentence Star.',
        'lesson-4-technical-retry' => 'Hindi ko iyon narinig nang malinaw. Subukan nating muli ang pangungusap.',
        'lesson-4-clue-mission-1' => 'Basahin ang bawat salita mula kaliwa pakanan. Pagkatapos, sabihin ang buong pangungusap.',
        'lesson-4-feedback-independent' => 'Tama. Nabasa mo ang pangungusap nang mag-isa.',
        'lesson-4-feedback-supported' => 'Tama. Nakatulong ang clue para mabasa mo ang pangungusap.',
        'lesson-4-feedback-demonstrated' => 'Tama. Nabasa mo ang buong pangungusap kasabay ko.',
        'lesson-4-feedback-not-yet' => 'Hindi pa, at ayos lang iyon. Magsanay tayong muli sa pangungusap na ito.',
        'lesson-4-feedback-unscorable' => 'Hindi pa rin ako nakarinig ng malinaw na sagot. Maaari nating balikan ang pangungusap na ito mamaya.',
        'lesson-4-feedback-incorrect-first' => 'Hindi pa gaanong tama ang pangungusap na iyon. Subukan natin muli.',

        'lesson-5-mission-1' => 'Basahin ang teksto mula simula hanggang wakas. Huwag magmadali at sabihin ang bawat salita.',
        'lesson-5-complete' => 'Tapos na ang ikalimang aralin. Isa ka nang Passage Explorer.',
        'lesson-5-technical-retry' => 'Hindi ko narinig nang malinaw ang teksto. Subukan natin itong muli.',
        'lesson-5-performance-excellent' => 'Napakalinaw ng pagbasa mo sa teksto. Napagsama-sama mo ang mga salita mula simula hanggang wakas.',
        'lesson-5-performance-strong' => 'Mahusay ang pagbasa mo sa tekstong iyon. May ilang salitang kailangan pang sanayin.',
        'lesson-5-performance-growing' => 'Ipinagpatuloy mo ang pagbasa sa teksto. Sanayin natin ang mga salitang nahirapan kang basahin.',
        'lesson-5-performance-beginning' => 'Salamat sa pagtatapos ng teksto. Kailangan ng tapang upang basahin ang isang buong kuwento, at maaari natin itong sanayin muli.',
        'lesson-5-performance-skipped' => 'Ayos lang iyon. Maaari nating balikan ang tekstong ito sa ibang pagkakataon.',
        'lesson-5-performance-unavailable' => 'Hindi sapat ang narinig ko sa teksto upang maipakita ang resulta ng pagbasa. Maaari natin itong subukan muli sa ibang pagkakataon.',

        'lesson-6-mission-1' => 'Basahin ang pangungusap, pakinggan ang tanong ko, saka piliin ang pinakamahusay na sagot.',
        'lesson-6-clue-who' => 'Ang Who ay nagtatanong tungkol sa tao. Hanapin ang pangalan ng tao sa pangungusap.',
        'lesson-6-clue-what' => 'Ang What ay nagtatanong tungkol sa bagay o kilos. Hanapin ang sinasabi ng pangungusap.',
        'lesson-6-clue-where' => 'Ang Where ay nagtatanong tungkol sa lugar. Hanapin ang lugar sa pangungusap.',
        'lesson-6-clue-when' => 'Ang When ay nagtatanong tungkol sa oras. Hanapin ang oras sa pangungusap.',
        'lesson-6-clue-why' => 'Ang Why ay nagtatanong tungkol sa dahilan. Hanapin ang mga salitang nagsasabi kung bakit ito nangyari.',
        'lesson-6-complete' => 'Natapos mo ang lahat ng anim na aralin sa pagbasa. Isa ka nang Question Detective. Handa na ang iyong Final Assessment.',

        'lesson-6-question-who-lena' => 'Sino ang may pulang bag?',
        'lesson-6-guided-who-lena' => 'Tingnan ang pangalang naka-highlight. Sino ang may pulang bag?',
        'lesson-6-demo-who-lena' => 'Lena ang sinasabi ng pangungusap. Piliin si Lena.',
        'lesson-6-correct-who-lena' => 'Tama. Si Lena ang may pulang bag.',
        'lesson-6-question-who-rosa' => 'Sino ang may alagang pusa?',
        'lesson-6-guided-who-rosa' => 'Tingnan ang pangalang naka-highlight. Sino ang may alagang pusa?',
        'lesson-6-demo-who-rosa' => 'Rosa ang sinasabi ng pangungusap. Piliin si Rosa.',
        'lesson-6-correct-who-rosa' => 'Tama. Si Rosa ang may alagang pusa.',
        'lesson-6-question-what-mia' => 'Ano ang mayroon si Mia?',
        'lesson-6-guided-what-mia' => 'Tingnan ang bagay na naka-highlight. Ano ang mayroon si Mia?',
        'lesson-6-demo-what-mia' => 'Pulang bolpen ang sinasabi ng pangungusap. Piliin ang pulang bolpen.',
        'lesson-6-correct-what-mia' => 'Tama. May pulang bolpen si Mia.',
        'lesson-6-question-what-ben' => 'Ano ang mayroon si Ben?',
        'lesson-6-guided-what-ben' => 'Tingnan ang bagay na naka-highlight. Ano ang mayroon si Ben?',
        'lesson-6-demo-what-ben' => 'Alagang aso ang sinasabi ng pangungusap. Piliin ang alagang aso.',
        'lesson-6-correct-what-ben' => 'Tama. May alagang aso si Ben.',
        'lesson-6-question-where-cat' => 'Nasaan ang pusa?',
        'lesson-6-guided-where-cat' => 'Tingnan ang lugar na naka-highlight. Nasaan ang pusa?',
        'lesson-6-demo-where-cat' => 'Nasa ibabaw ng kama ang sinasabi ng pangungusap. Piliin ang nasa ibabaw ng kama.',
        'lesson-6-correct-where-cat' => 'Tama. Nasa ibabaw ng kama ang pusa.',
        'lesson-6-question-where-hen' => 'Nasaan ang inahin?',
        'lesson-6-guided-where-hen' => 'Tingnan ang lugar na naka-highlight. Nasaan ang inahin?',
        'lesson-6-demo-where-hen' => 'Nasa loob ng kubo ang sinasabi ng pangungusap. Piliin ang nasa loob ng kubo.',
        'lesson-6-correct-where-hen' => 'Tama. Nasa loob ng kubo ang inahin.',
        'lesson-6-question-when-lito' => 'Kailan maaaring tumakbo si Lito?',
        'lesson-6-guided-when-lito' => 'Tingnan ang oras na naka-highlight. Kailan maaaring tumakbo si Lito?',
        'lesson-6-demo-when-lito' => 'Sa tanghali ang sinasabi ng pangungusap. Piliin ang sa tanghali.',
        'lesson-6-correct-when-lito' => 'Tama. Maaaring tumakbo si Lito sa tanghali.',
        'lesson-6-question-when-nena' => 'Kailan maaaring umidlip si Nena?',
        'lesson-6-guided-when-nena' => 'Tingnan ang oras na naka-highlight. Kailan maaaring umidlip si Nena?',
        'lesson-6-demo-when-nena' => 'Sa alas-diyes ang sinasabi ng pangungusap. Piliin ang sa alas-diyes.',
        'lesson-6-correct-when-nena' => 'Tama. Maaaring umidlip si Nena sa alas-diyes.',
        'lesson-6-question-why-mila' => 'Bakit basa si Mila?',
        'lesson-6-guided-why-mila' => 'Tingnan ang dahilan na naka-highlight. Bakit basa si Mila?',
        'lesson-6-demo-why-mila' => 'Nabasa si Mila dahil sa ulan. Piliin ang ulan.',
        'lesson-6-correct-why-mila' => 'Tama. Nabasa si Mila dahil sa ulan.',
        'lesson-6-question-why-tino' => 'Bakit malungkot si Tino?',
        'lesson-6-guided-why-tino' => 'Tingnan ang dahilan na naka-highlight. Bakit malungkot si Tino?',
        'lesson-6-demo-why-tino' => 'Nalungkot si Tino dahil sa sugat. Piliin ang sugat.',
        'lesson-6-correct-why-tino' => 'Tama. Nalungkot si Tino dahil sa sugat.',

        'learn-with-clara-letters-parade-opening' => 'Naku. Ikinalat ng mapaglarong hangin ang maliliit na letra bago ang parada. Tutulungan mo ba akong ibalik ang bawat isa sa kapareha nitong malaking letra?',
        'learn-with-clara-letters-find-a' => 'Naghihintay ang malaking A sa ilalim ng arkong may mansanas. Mahahanap mo ba ang maliit na a?',
        'learn-with-clara-letters-find-b' => 'Umaindayog na ang float na may lobo. Hanapin ang maliit na b upang magkaroon ng kapareha ang malaking B.',
        'learn-with-clara-letters-find-c' => 'Gumugulong sa daan ang pakurbang banderitas. Makikita mo ba ang maliit na c?',
        'learn-with-clara-letters-find-d' => 'Pakinggan ang karitong may tambol. Hanapin ang maliit na d sa tabi ng malaking D.',
        'learn-with-clara-letters-find-e' => 'Paparating na ang huling karosa. Hanapin ang maliit na e upang magkasamang makapagparada ang bawat pares.',
        'learn-with-clara-letters-parade-finale' => 'Nahanap natin ang lahat ng maliliit na letra. Magkakasama na ang A, B, C, D, at E. Maaari nang magsimula ang Letter Parade.',

        'assessment-orientation' => 'Suriin natin ang iyong mikropono. Sabihin ang ready, saka pakinggan ang iyong recording.',
        'assessment-letters' => 'Sabihin ang letrang nakikita mo. Pakinggan ang iyong boses bago isumite.',
        'assessment-rhymes' => 'Tingnan ang dalawang salita. Piliin ang yes kung magkatugma ang tunog, o no kung hindi.',
        'assessment-words' => 'Basahin ang salitang nakikita mo. Pakinggan ang iyong boses bago isumite.',
        'assessment-part-one-result' => 'Tapos na ang unang bahagi. Nagsikap ka, at ipinagmamalaki kita.',
        'assessment-story-choice' => 'Piliin ang kuwentong gusto mong basahin. Maaari mong piliin ang Lena at the Park o Rosa in the Garden.',
        'assessment-passage' => 'Basahin nang malakas ang kuwento. Mayroon kang isang minuto. Maaari mo itong isumite kapag tapos ka na.',
        'assessment-comprehension-lena-item-1' => 'Piliin ang pinakamahusay na sagot. Sino ang pumupunta sa parke?',
        'assessment-comprehension-lena-item-2' => 'Ano ang dinadala ni Lena?',
        'assessment-comprehension-lena-item-3' => 'Saan pumupunta si Lena?',
        'assessment-comprehension-lena-item-4' => 'Kailan pumupunta si Lena sa parke?',
        'assessment-comprehension-lena-item-5' => 'Bakit pumupunta si Lena sa parke?',
        'assessment-comprehension-rosa-item-1' => 'Piliin ang pinakamahusay na sagot. Sino ang pumupunta sa hardin?',
        'assessment-comprehension-rosa-item-2' => 'Ano ang pinipitas ni Rosa?',
        'assessment-comprehension-rosa-item-3' => 'Saan pumupunta si Rosa?',
        'assessment-comprehension-rosa-item-4' => 'Kailan pumupunta si Rosa sa hardin?',
        'assessment-comprehension-rosa-item-5' => 'Bakit pumupunta si Rosa sa hardin?',
        'assessment-part-two-result' => 'Tapos na ang ikalawang bahagi. Natapos mong basahin at unawain ang kuwento.',
        'assessment-complete' => 'Tapos na ang assessment. Handa na ang una mong aralin.',
        'assessment-final-complete' => 'Natapos mo ang iyong Reading Journey. Ipinagmamalaki ko ang lahat ng natutuhan mo.',
    ];
}

/** @return list<list<string>> */
function runtimeTemplateRows(): array
{
    $approved = 'approved';
    $approval = 'Approved by the product owner on 2026-08-08.';
    $notes = 'Preserve all required placeholders. English learner and curriculum tokens remain unchanged.';

    $rows = [
        ['feedback.you_said_letter', 'result', 'You said {spoken}.', 'Ang sinabi mo ay {spoken}.', '{spoken}', 'code_switch_target', $approved, $notes],
        ['feedback.you_said_transcript', 'result', 'You said {final}.', 'Ang sinabi mo ay {final}.', '{final}', 'code_switch_target', $approved, $notes],
        ['feedback.unclear_letter', 'result', 'I did not hear a clear letter. You can try the next one.', 'Hindi ako nakarinig ng malinaw na letra. Maaari mong subukan ang susunod.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['feedback.unclear_phrase', 'result', 'I did not hear a clear phrase. You can try the next one.', 'Hindi ako nakarinig ng malinaw na parirala. Maaari mong subukan ang susunod.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['feedback.unclear_sentence', 'result', 'I did not hear a clear sentence. You can try the next one.', 'Hindi ako nakarinig ng malinaw na pangungusap. Maaari mong subukan ang susunod.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['feedback.unclear_word', 'result', 'I did not hear a clear word. You can try the next one.', 'Hindi ako nakarinig ng malinaw na salita. Maaari mong subukan ang susunod.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['alignment.missing_word', 'result', 'You missed the word {expected}.', 'Hindi mo nasabi ang salitang {expected}.', '{expected}', 'code_switch_target', $approved, $notes],
        ['alignment.missing_word_fallback', 'result', 'You missed one word. Let us try the {unit} again.', 'May isang salitang hindi mo nasabi. Subukan nating muli ang {unit}.', '{unit}', 'translate', $approved, 'The controlled unit must resolve to parirala or pangungusap.'],
        ['alignment.extra_word', 'result', 'I heard an extra word, {actual}.', 'May narinig akong sobrang salita, {actual}.', '{actual}', 'code_switch_target', $approved, $notes],
        ['alignment.extra_word_fallback', 'result', 'I heard one extra word. Let us try the {unit} again.', 'May narinig akong isang sobrang salita. Subukan nating muli ang {unit}.', '{unit}', 'translate', $approved, 'The controlled unit must resolve to parirala or pangungusap.'],
        ['alignment.replaced_word', 'result', 'I heard {actual} instead of {expected}.', 'Narinig ko ang {actual} sa halip na {expected}.', '{actual}|{expected}', 'code_switch_target', $approved, $notes],
        ['alignment.replaced_word_fallback', 'result', 'One word was different. Let us try the {unit} again.', 'May isang salitang naiiba. Subukan nating muli ang {unit}.', '{unit}', 'translate', $approved, 'The controlled unit must resolve to parirala or pangungusap.'],
        ['alignment.words_out_of_order', 'result', 'The words {first} and {second} changed places.', 'Nagpalit ng puwesto ang mga salitang {first} at {second}.', '{first}|{second}', 'code_switch_target', $approved, $notes],
        ['alignment.words_out_of_order_fallback', 'result', 'Two words changed places. Let us try the phrase again.', 'Nagpalit ng puwesto ang dalawang salita. Subukan nating muli ang parirala.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['alignment.multiple_missing_word', 'result', 'Let us fix one part. You missed the word {expected}.', 'Ayusin natin ang isang bahagi. Hindi mo nasabi ang salitang {expected}.', '{expected}', 'code_switch_target', $approved, $notes],
        ['alignment.multiple_missing_word_fallback', 'result', 'Let us fix one part. One word was missing.', 'Ayusin natin ang isang bahagi. May isang salitang nawawala.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['alignment.multiple_extra_word', 'result', 'Let us fix one part. I heard an extra word, {actual}.', 'Ayusin natin ang isang bahagi. May narinig akong sobrang salita, {actual}.', '{actual}', 'code_switch_target', $approved, $notes],
        ['alignment.multiple_extra_word_fallback', 'result', 'Let us fix one part. I heard an extra word.', 'Ayusin natin ang isang bahagi. May narinig akong sobrang salita.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['alignment.multiple_replaced_word', 'result', 'Let us fix one part. I heard {actual} instead of {expected}.', 'Ayusin natin ang isang bahagi. Narinig ko ang {actual} sa halip na {expected}.', '{actual}|{expected}', 'code_switch_target', $approved, $notes],
        ['alignment.multiple_replaced_word_fallback', 'result', 'Let us fix one part. One word was different.', 'Ayusin natin ang isang bahagi. May isang salitang naiiba.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['alignment.multiple_default', 'result', 'Some words were different. Let us read the phrase one word at a time.', 'May ilang salitang naiiba. Basahin natin ang parirala nang paisa-isang salita.', '', 'translate', $approved, 'Review for natural child-directed Filipino.'],
        ['alignment.default', 'result', 'Some words were different. Let us read the {unit} one word at a time.', 'May ilang salitang naiiba. Basahin natin ang {unit} nang paisa-isang salita.', '{unit}', 'translate', $approved, 'The controlled unit must resolve to parirala or pangungusap.'],
        ['demonstration.lesson_2_word', 'instruction', 'The word is {word}. Listen: {word}. Now you try.', 'Ang salita ay {word}. Makinig: {word}. Ngayon, ikaw naman.', '{word}', 'code_switch_target', $approved, $notes],
    ];

    return array_map(static function (array $row) use ($approval): array {
        $row[7] = "{$approval} {$row[7]}";

        return $row;
    }, $rows);
}
