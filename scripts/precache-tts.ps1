$phrases = @(
    @{ text = 'Hi! I am happy you are here. Let us get ready to read together!'; reference = 'introduce' }
    @{ text = 'Let us check your microphone. Say ready, then listen to your recording.'; reference = 'instruction' }
    @{ text = 'Say the letter you see. Listen to your voice before you submit.'; reference = 'instruction' }
    @{ text = 'Look at both words. Choose yes if they rhyme, or no if they do not.'; reference = 'question' }
    @{ text = 'Read the word you see. Listen to your voice before you submit.'; reference = 'instruction' }
    @{ text = 'Part one is complete. You worked hard, and I am proud of you!'; reference = 'result' }
)

Write-Host "Starting to pre-generate Clara's audio on CPU... This will take a while!"

foreach ($phrase in $phrases) {
    Write-Host "Generating: $($phrase.text)"
    $body = @{
        text = $phrase.text
        reference = $phrase.reference
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "http://localhost:8002/synthesize" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 600 -OutFile "NUL" | Out-Null
        Write-Host "[OK] Finished generating: $($phrase.text)"
    } catch {
        Write-Host "[ERROR] Failed to generate: $($phrase.text) - $_"
    }
}

Write-Host "All audio files have been generated and cached!"
