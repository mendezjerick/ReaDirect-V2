import { Link } from "react-router-dom";

import "./credits-licenses.css";

export function CreditsLicensesPage() {
  return (
    <main
      className="credits-licenses"
      aria-labelledby="credits-licenses-title"
      data-route-focus
      tabIndex={-1}
    >
      <header className="credits-licenses__header">
        <Link className="credits-licenses__back" to="/home">
          ← Back to ReaDirect
        </Link>
        <p>About ReaDirect</p>
        <h1 id="credits-licenses-title">Credits &amp; licenses</h1>
        <span>
          Recognition for the people, assets, research, and open technologies
          that support ReaDirect.
        </span>
      </header>

      <div className="credits-licenses__content">
        <section aria-labelledby="credits-creators">
          <h2 id="credits-creators">ReaDirect creators</h2>
          <p>
            ReaDirect&apos;s app icon, logo, and pixel-art identity were created
            by Jerick E. Mendez. Researcher and developer profile photographs
            are used with the team&apos;s approval.
          </p>
          <p>
            Learning backgrounds and game-lobby thumbnails were generated for
            ReaDirect using the project&apos;s AI-generation workflows. Selected
            Game One art was generated for ReaDirect with ChatGPT.
          </p>
        </section>

        <section aria-labelledby="credits-assets">
          <h2 id="credits-assets">Visual assets</h2>
          <dl>
            <div>
              <dt>Ma&apos;am Clara (CherryGoth model)</dt>
              <dd>
                The source model was designed by{" "}
                <a
                  href="https://www.etsy.com/shop/pngVtubers"
                  target="_blank"
                  rel="noreferrer"
                >
                  pngVtubers
                </a>{" "}
                and licensed from seller zuki through the{" "}
                <a
                  href="https://www.etsy.com/listing/4295933400/customizable-goth-vtuber-model-premade"
                  target="_blank"
                  rel="noreferrer"
                >
                  Customizable Goth VTuber Model Etsy listing
                </a>
                . ReaDirect uses the model and its derived Ma&apos;am Clara stills
                under the seller&apos;s non-exclusive terms. The Live2D Cubism
                runtime is licensed separately under its accompanying
                third-party terms.
              </dd>
            </div>
            <div>
              <dt>Achievement icons</dt>
              <dd>
                Licensed premium CraftPix game-interface assets. See CraftPix
                licence terms for the applicable asset pack.
              </dd>
            </div>
            <div>
              <dt>Game One Ninja Adventure assets</dt>
              <dd>
                Pixel-boy&apos;s Ninja Adventure Asset Pack, CC0 1.0. Attribution
                is appreciated but not required by the licence.
              </dd>
            </div>
            <div>
              <dt>OtterTale (Game Two)</dt>
              <dd>
                Repackaged, remixed, and original game assets released under
                CC0 1.0. Credits: analogStudios_, RottingPixels, Brackeys,
                Sofia Thirslund, Asbjørn Thirslund, and Jayvee Enaguas
                (Pixel Operator). Attribution is preserved although not
                required by the licence.
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="credits-audio">
          <h2 id="credits-audio">Audio and voice</h2>
          <p>
            Ma&apos;am Clara&apos;s English and Filipino voice references are used with
            written consent from Shaila Patrice D. Avallenda for VoxCPM2 voice
            cloning and resulting ReaDirect speech output.
          </p>
          <p>
            <strong>Alphabet Defender:</strong> Sound effects by SoundsbyDane.
          </p>
        </section>

        <section aria-labelledby="credits-fonts">
          <h2 id="credits-fonts">Fonts</h2>
          <p>
            Fredoka, Lexend, Pixelify Sans, and Jersey 20 are distributed under
            the SIL Open Font License 1.1.
          </p>
        </section>

        <section aria-labelledby="credits-technology">
          <h2 id="credits-technology">Speech and research technology</h2>
          <ul>
            <li>
              Whisper ASR model weights — MIT License.{" "}
              <a href="https://github.com/openai/whisper" target="_blank" rel="noreferrer">
                OpenAI Whisper
              </a>
            </li>
            <li>
              VoxCPM2 speech synthesis — Apache License 2.0.{" "}
              <a href="https://huggingface.co/openbmb/VoxCPM2" target="_blank" rel="noreferrer">
                VoxCPM2 model card
              </a>
            </li>
            <li>
              SpeechOcean762 historical training corpus — CC BY 4.0.{" "}
              <a href="https://www.openslr.org/101/" target="_blank" rel="noreferrer">
                OpenSLR record
              </a>
            </li>
          </ul>
          <p className="credits-licenses__note">
            AI-generated speech is clearly identified in the application. This
            page does not publish private voice recordings, consent documents,
            purchase receipts, or credentials.
          </p>
        </section>

        <section aria-labelledby="credits-software">
          <h2 id="credits-software">Open-source software</h2>
          <p>
            ReaDirect uses open-source JavaScript, PHP, and Python dependencies.
            A full dependency licence notice will be published with the Play
            Store release package.
          </p>
        </section>
      </div>
    </main>
  );
}
