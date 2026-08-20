# ReaDirect Asset Provenance Register

This register records the project owner's asserted source, licence, or
ownership information for distributable non-code assets. Receipts, seller
licences, paid-plan records, and signed consents are retained privately by the
project owner and must not be committed to this repository.

## Learning backgrounds

The `T1` through `T8` desktop and mobile backgrounds under
`assets/backgrounds/source/` and `apps/web/public/assets/backgrounds/` were
generated for ReaDirect with the project's paid NijiJourney plan.

## Clara and Live2D

The `CherryGoth` Clara model and derived static Clara renders were purchased by
Zuki directly from the seller through Etsy for USD 1. Keep the purchase receipt
and the seller's redistribution terms with the private deployment records.

The Live2D Cubism Core and Framework remain separately licensed third-party
runtime software. Preserve their official accompanying notices when preparing a
release package; this register does not replace those terms.

## Achievement icons

The CraftPix achievement-icon assets were purchased from the premium version of
the itch.io seller page **Free Game Assets (GUI, Sprite, Tilesets)** for USD 1.
Keep the purchase receipt and the applicable premium licence with the private
deployment records.

## Game assets

- Game One user-supplied replacement art and associated game props were
  generated for ReaDirect with ChatGPT. Existing in-repository AI provenance
  records remain applicable.
- The currently named character-inspired Game One assets are scheduled to be
  replaced from `master` before release. Do not ship them from this branch until
  that replacement has been brought in and verified.
- Game Two/OtterTale third-party sprite, music, and sound-effect provenance is
  pending. Do not represent these assets as CC0 or ready for distribution until
  their actual licences are supplied.
- Word Rescue vocabulary artwork provenance is pending final owner records.
  Its existing review status remains non-release-ready until then.

## ReaDirect identity and people

- The ReaDirect app icon, logo, and pixel-art identity assets were created by
  **Jerick E. Mendez** for ReaDirect.
- The Clara image assets share the Clara creator record above.
- The researcher/developer profile photos depict the ReaDirect researchers and
  developers themselves and are approved for their use in the application.
- Game-lobby thumbnails were generated for ReaDirect with ChatGPT.

## Clara voice and derived speech

The English and Filipino Clara voice reference recordings are by **Shaila
Patrice D. Avallenda**. The project holds written consent and acknowledgement
for use of her voice for voice cloning with VoxCPM2 and for the resulting
ReaDirect voice output. Store the signed consent privately; do not commit it or
the private reference recordings to public application assets.

## Deployment model and data licences

- Whisper model weights used by the historical Mu lineage and current
  `faster-whisper-base.en` runtime are MIT licensed.
- VoxCPM2 is Apache-2.0 licensed.
- SpeechOcean762, used in the historical Mu child-speech training basis, is
  CC BY 4.0. Its required attribution/citation must accompany any redistributed
  dataset material or publication describing that use.
- The historical isolated-letter training dataset manifest was lost. Treat that
  training-source provenance as incomplete; do not redistribute source material
  from it.

## Deferred and generated software notices

The project still needs final provenance entries for Game Two/OtterTale and Word
Rescue artwork. Third-party application dependency notices are separate from
asset provenance and should be generated from the Node, Composer, and Python
lockfiles as a software bill of materials before the Play Store release.
