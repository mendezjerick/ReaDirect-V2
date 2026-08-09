# Filipino Clara General Reference

## Recording

| Field | Value |
| --- | --- |
| Original source | `general.m4a` |
| Normalized authored WAV | `general.wav` |
| Intended roles | `introduce`, `instruction`, `question`, and `result` |
| Language | Filipino (`fil-PH`; VoxCPM2 model language Tagalog/`tl`) |
| Transcript | `Makinig nang mabuti, sundan ang bawat salita, at huwag magmadali.` |
| English meaning | Listen carefully, follow each word, and do not rush. |
| Duration | 7.424 seconds |
| Authored WAV format | 48 kHz, stereo, PCM 16-bit |
| Authored WAV peak | 0 dBFS |
| Authored WAV SHA-256 | `80030cd040008419494b538b2c6c80b8b01001ed2c96c1209fbaddc83fe4fa0b` |
| Review status | Approved for all Filipino delivery roles by the product owner on 2026-08-08 |

## Normalization history

`general.wav` was decoded from the mono 48 kHz AAC source, peak-normalized by
`+0.4 dB`, duplicated into two identical channels, and encoded as PCM 16-bit at
48 kHz. The original `general.m4a` remains unchanged.

This is the authored reference format used by the current English semantic
references. At runtime, ReaDirect must still create a private conditioned copy:
downmix to mono, attenuate only when its peak exceeds `-6 dBFS`, never boost,
and write PCM 16-bit WAV under the reference cache.

## Role coverage

The product owner explicitly approved this recording as the shared general
reference for `introduce`, `instruction`, `question`, and `result`. All four
Filipino runtime profile keys intentionally resolve to this same authored WAV.
The role keys remain distinct in requests, cache identities, readiness state,
and diagnostics even though their underlying reference recording is shared.
