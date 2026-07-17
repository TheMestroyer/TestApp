import { useEffect, useState } from 'react';

export default function Navigator({
  total,
  currentIndex,
  onJump,
  answeredFlags,
  marked,
  submitted,
  verdicts,
  onSubmit,
  onDownload,
  onReview,
  onRetake,
  showReviewButton,
}) {
  const [jumpValue, setJumpValue] = useState(String(currentIndex + 1));

  useEffect(() => {
    setJumpValue(String(currentIndex + 1));
  }, [currentIndex]);

  function handleJump() {
    const n = parseInt(jumpValue, 10);
    if (!Number.isNaN(n)) onJump(Math.min(Math.max(n - 1, 0), total - 1));
  }

  return (
    <aside className="navigator glow-panel">
      <div className="jumpBox">
        <label htmlFor="jumpInput">Go to question</label>
        <input
          id="jumpInput"
          type="number"
          min="1"
          className="jumpInput"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleJump();
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={handleJump}>
          Go
        </button>
      </div>

      <div className="questionGrid">
        {Array.from({ length: total }).map((_, i) => {
          const verdict = verdicts ? verdicts[i] : null;
          const cls = [
            'gridBtn',
            i === currentIndex ? 'current' : '',
            marked[i] ? 'marked' : '',
            answeredFlags[i] ? 'answered' : '',
            verdict === 'correct' ? 'q-correct' : '',
            verdict === 'incorrect' ? 'q-incorrect' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={i} type="button" className={cls} onClick={() => onJump(i)}>
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="actionsCol">
        {!submitted && (
          <button type="button" className="btn" onClick={onSubmit}>
            Submit Answers
          </button>
        )}
        {submitted && (
          <button type="button" className="btn btn-secondary" onClick={onDownload}>
            Download Answer File
          </button>
        )}
        {submitted && showReviewButton && (
          <button type="button" className="btn btn-secondary" onClick={onReview}>
            Download Short-Answer Review File
          </button>
        )}
        {submitted && (
          <button type="button" className="btn btn-secondary" onClick={onRetake}>
            Retake This Test
          </button>
        )}
      </div>
    </aside>
  );
}
