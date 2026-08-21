import { Link } from "react-router-dom";

interface AboutReaDirectDialogProps {
  onClose: () => void;
}

const team = [
  {
    name: "Jerick E. Mendez",
    role: "Lead Developer",
    image: "/assets/profile/jerick.png",
  },
  {
    name: "Nick Narry S. Mendoza",
    role: "Developer",
    image: "/assets/profile/nick.png",
  },
  {
    name: "Victor P. De Mesa Jr.",
    role: "Developer",
    image: "/assets/profile/victor.jpg",
  },
] as const;

export function AboutReaDirectDialog({ onClose }: AboutReaDirectDialogProps) {
  return (
    <div
      className="home-about__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        className="home-about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-about-title"
      >
        <header className="home-about__header">
          <div>
            <span>Research-based reading support</span>
            <h2 id="home-about-title">About ReaDirect</h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close About ReaDirect"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="home-about__content">
          <section>
            <h3>About ReaDirect</h3>
            <p>
              <strong>ReaDirect</strong> is an AI-powered educational mobile
              application developed as part of the research entitled:
            </p>
            <p className="home-about__research-title">
              “READIRECT: An AI-Based Oral Reading and Comprehension Learning
              Support Intervention Using Automatic Speech Recognition under the
              DepEd ARAL Program.”
            </p>
            <p>
              ReaDirect is designed to strengthen learners&apos; oral reading
              fluency and reading comprehension through the integration of
              Artificial Intelligence (AI) and Automatic Speech Recognition
              (ASR) technologies. By providing real-time oral reading
              assessment, immediate feedback, and interactive comprehension
              activities, the application serves as a supplementary learning
              support intervention that helps learners improve their reading
              skills in an engaging and accessible manner.
            </p>
            <p>
              Developed in support of the Department of Education&apos;s ARAL
              Program, ReaDirect aims to empower both teachers and learners by
              providing an innovative digital tool that complements classroom
              instruction and reading intervention programs. Through
              research-driven design and intelligent technology, the application
              promotes literacy development, independent learning, and
              meaningful engagement with reading materials.
            </p>
            <p>
              ReaDirect reflects the commitment of its developers to leverage
              emerging technologies in creating practical educational solutions
              that address the evolving needs of learners while supporting the
              Department of Education&apos;s mission of delivering quality,
              inclusive, and learner-centered education.
            </p>
          </section>

          <section>
            <h3>Mission</h3>
            <p>
              ReaDirect is committed to enhancing learners&apos; oral reading
              fluency and reading comprehension through the responsible
              application of Artificial Intelligence and Automatic Speech
              Recognition technologies.
            </p>
            <p>Our mission is to:</p>
            <ul>
              <li>
                Enhance literacy through an engaging, accessible, and
                interactive reading intervention.
              </li>
              <li>
                Support teachers with a digital tool that complements classroom
                instruction and reading remediation activities.
              </li>
              <li>
                Encourage independent learning through immediate, personalized
                oral-reading feedback.
              </li>
              <li>
                Promote meaningful learning experiences aligned with the
                Department of Education&apos;s ARAL Program.
              </li>
              <li>
                Advance educational technology through research-based and
                learner-centered innovation.
              </li>
            </ul>
          </section>

          <section>
            <h3>Vision</h3>
            <p>
              To become a trusted AI-powered learning support intervention that
              empowers every learner to become a confident, proficient, and
              lifelong reader while advancing quality education through
              innovative educational technology.
            </p>
          </section>

          <section>
            <h3>Acknowledgments</h3>
            <p>
              The ReaDirect Development Team extends its heartfelt gratitude to
              the individuals whose guidance, expertise, and unwavering support
              made the successful completion of this research and application
              possible.
            </p>
            <p>
              We express our sincere appreciation to{" "}
              <strong>Dr. Orlando T. Valverde</strong>, Chief, Curriculum
              Implementation Division (CID), for his invaluable educational
              expertise, professional guidance, and conceptual insights. His
              recommendations helped align the application with the literacy
              goals and educational initiatives of the Department of Education,
              particularly under the ARAL Program.
            </p>
            <p>
              We likewise extend our deepest gratitude to{" "}
              <strong>Ms. Mia V. Villarica, DIT</strong>, Associate Dean,
              College of Computer Studies, for her exceptional mentorship,
              technical expertise, and continuous encouragement throughout the
              research and software development process.
            </p>
            <p>
              We are equally grateful to the participating schools,
              administrators, teachers, learners, and everyone who shared their
              time, cooperation, and valuable feedback. Their contributions have
              been instrumental in refining ReaDirect into a meaningful
              educational intervention.
            </p>
          </section>

          <section>
            <h3>Research Information</h3>
            <dl className="home-about__facts">
              <div>
                <dt>Research title</dt>
                <dd>
                  READIRECT: An AI-Based Oral Reading and Comprehension Learning
                  Support Intervention Using Automatic Speech Recognition under
                  the DepEd ARAL Program
                </dd>
              </div>
              <div>
                <dt>Application</dt>
                <dd>ReaDirect</dd>
              </div>
              <div>
                <dt>Technology</dt>
                <dd>
                  Artificial Intelligence (AI) • Automatic Speech Recognition
                  (ASR)
                </dd>
              </div>
              <div>
                <dt>Institution</dt>
                <dd>College of Computer Studies</dd>
              </div>
              <div>
                <dt>Application version</dt>
                <dd>Version 1.0</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3>Meet the Development Team</h3>
            <p>
              The ReaDirect Development Team is composed of passionate Computer
              Studies students dedicated to developing innovative,
              research-driven educational technologies that enhance literacy,
              empower educators, and improve learning experiences through
              Artificial Intelligence.
            </p>
            <div className="home-about__team">
              {team.map((member) => (
                <article key={member.name}>
                  <img src={member.image} alt={member.name} />
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3>Disclaimer</h3>
            <p>
              ReaDirect is a research-based educational application developed as
              part of an academic study in support of the Department of
              Education&apos;s ARAL Program. It is intended solely as a
              supplementary learning support intervention.
            </p>
            <p>
              The views, findings, conclusions, and recommendations presented
              through this application are those of the researchers and do not
              necessarily reflect the official policies, positions, or
              endorsements of the Department of Education or any of its offices.
            </p>
          </section>

          <section className="home-about__credits">
            <h3>Credits &amp; licences</h3>
            <p>
              See the people, creative assets, audio, fonts, research
              technologies, and open-source software that support ReaDirect.
            </p>
            <Link
              className="home-about__credits-link"
              to="/credits-licenses"
              onClick={onClose}
            >
              View credits and licences
              <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
      </section>
    </div>
  );
}
