export default function TutorialModal({ isAdmin, onClose }) {
  return (
    <div className="tutorialOverlay" onClick={onClose}>
      <div className="tutorialCard glow-panel" onClick={(e) => e.stopPropagation()}>
        <div className="tutorialHeader">
          <h2>Welcome to Study Test App</h2>
          <button type="button" className="btn-danger-ghost tutorialClose" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="tutorialBody">
          <section>
            <h3>Getting started</h3>
            <p>
              Drag a plain-text test file onto the drop zone (or click it to browse) to load it. Every file you load
              is saved to your account under <strong>Test history</strong> in the sidebar — click any entry to pick
              up exactly where you left off.
            </p>
          </section>

          <section>
            <h3>Shared tests</h3>
            <p>
              The <strong>Shared tests</strong> section in the sidebar lists tests everyone can take. Clicking one
              gives you your own private copy to answer — your progress and score stay separate from everyone
              else's.
            </p>
          </section>

          <section>
            <h3>Taking a test</h3>
            <ul>
              <li>
                <strong>Question grid</strong> (right side) — jump to any question; answered ones get a highlighted
                border.
              </li>
              <li>
                <strong>Mark for Review</strong> — flag a question to find it again later.
              </li>
              <li>
                <strong>Show Answer</strong> — check your current answer on the spot, without affecting your score.
              </li>
              <li>
                <strong>Submit Answers</strong> — grade the whole test and see your score, with a glow showing
                right/wrong on every question.
              </li>
            </ul>
          </section>

          <section>
            <h3>Editing &amp; downloading</h3>
            <p>
              <strong>Edit test</strong> lets you fix or rewrite a test's questions right in the browser — saving
              with different questions resets that test's progress. <strong>Download test file</strong> grabs the
              current plain-text file, any time.
            </p>
          </section>

          {isAdmin && (
            <section>
              <h3>Admin panel</h3>
              <p>
                As the admin, use the <strong>Admin panel</strong> link to add, edit, rename, or remove the shared
                tests everyone else sees.
              </p>
            </section>
          )}

          <section>
            <h3>Keyboard shortcuts</h3>
            <ul className="tutorialShortcuts">
              <li>
                <kbd>&larr;</kbd> <kbd>&rarr;</kbd> — previous / next question
              </li>
              <li>
                <kbd>Enter</kbd> — show the answer for the current question
              </li>
              <li>
                <kbd>1</kbd>–<kbd>9</kbd> — pick an answer (single / multiple choice)
              </li>
              <li>
                <kbd>1</kbd> / <kbd>2</kbd> — True / False
              </li>
            </ul>
          </section>
        </div>

        <button type="button" className="btn btn-block" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}
