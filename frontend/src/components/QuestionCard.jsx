import { highlightCodeHtml, typeLabel } from '../lib/quizParser.js';
import { computeVerdict } from '../lib/grading.js';
import MatchQuestion from './MatchQuestion.jsx';

function optClass(wasCorrect, wasWrongPick) {
  return `opt${wasCorrect ? ' wasCorrect' : ''}${wasWrongPick ? ' wasWrongPick' : ''}`;
}

export default function QuestionCard({ idx, q, answer, onAnswerChange, submitted, peeked }) {
  const v = computeVerdict(q, answer);
  const showFeedback = submitted || peeked;
  const glowClass = showFeedback
    ? v.verdict === 'correct'
      ? ' glow-correct'
      : v.verdict === 'incorrect'
        ? ' glow-incorrect'
        : ''
    : '';

  return (
    <div className={`qcard${glowClass}`}>
      <div className="qnum">{typeLabel(q.type)}</div>
      <div className="qtext">{q.text}</div>

      {q.code && q.code.length > 0 && (
        <pre className="codeBlock">
          <code dangerouslySetInnerHTML={{ __html: highlightCodeHtml(q.code.join('\n')) }} />
        </pre>
      )}

      <div className="qbody">
        {q.type === 'single' &&
          q.options.map((opt, oi) => {
            const checked = answer === String(oi);
            const wasCorrect = submitted && opt.correct;
            const wasWrongPick = submitted && !opt.correct && checked;
            return (
              <label key={oi} className={optClass(wasCorrect, wasWrongPick)}>
                <input
                  type="radio"
                  name={`q${idx}`}
                  checked={checked}
                  disabled={submitted}
                  onChange={() => onAnswerChange(String(oi))}
                />
                <span>{opt.text}</span>
              </label>
            );
          })}

        {q.type === 'multiple' &&
          q.options.map((opt, oi) => {
            const arr = Array.isArray(answer) ? answer : [];
            const checked = arr.includes(String(oi));
            const wasCorrect = submitted && opt.correct;
            const wasWrongPick = submitted && !opt.correct && checked;
            return (
              <label key={oi} className={optClass(wasCorrect, wasWrongPick)}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={submitted}
                  onChange={() => {
                    const next = checked ? arr.filter((val) => val !== String(oi)) : [...arr, String(oi)];
                    onAnswerChange(next);
                  }}
                />
                <span>{opt.text}</span>
              </label>
            );
          })}

        {q.type === 'truefalse' &&
          ['true', 'false'].map((val) => {
            const checked = answer === val;
            const correctVal = /^true$/i.test(q.answer || '') ? 'true' : 'false';
            const wasCorrect = submitted && val === correctVal;
            const wasWrongPick = submitted && val !== correctVal && checked;
            return (
              <label key={val} className={optClass(wasCorrect, wasWrongPick)}>
                <input
                  type="radio"
                  name={`q${idx}`}
                  checked={checked}
                  disabled={submitted}
                  onChange={() => onAnswerChange(val)}
                />
                <span>{val === 'true' ? 'True' : 'False'}</span>
              </label>
            );
          })}

        {q.type === 'fill' && (
          <input
            type="text"
            className="field-input"
            placeholder="Type your answer"
            value={answer || ''}
            disabled={submitted}
            onChange={(e) => onAnswerChange(e.target.value)}
          />
        )}

        {q.type === 'short' && (
          <textarea
            className="field-textarea"
            placeholder="Write your answer (not auto-graded)"
            value={answer || ''}
            disabled={submitted}
            onChange={(e) => onAnswerChange(e.target.value)}
          />
        )}

        {q.type === 'match' && <MatchQuestion q={q} value={answer} onChange={onAnswerChange} submitted={submitted} />}
      </div>

      {peeked && !submitted && (
        <div className="peekLine">
          {q.type === 'short' ? (
            <>
              <span className="label">Your answer:</span> {v.userAnswerDisplay}
              <br />
              {q.explain ? (
                <>
                  <span className="label">Reference note:</span> {q.explain}
                </>
              ) : (
                <span className="label">No reference answer provided for this short-answer question.</span>
              )}
            </>
          ) : (
            <>
              <span className="label">Your answer:</span> {v.userAnswerDisplay}
              <br />
              <span className="label">Correct answer:</span> {v.correctAnswerDisplay}
              <br />
              <span className={v.verdict === 'correct' ? 'verdict-correct' : 'verdict-incorrect'}>
                {v.verdict === 'correct' ? 'Correct' : 'Incorrect'}
              </span>
              {q.explain && (
                <>
                  <br />
                  <span className="label">Note:</span> {q.explain}
                </>
              )}
            </>
          )}
        </div>
      )}

      {submitted && (
        <div className="resultLine">
          <span className="label">Your answer:</span> {v.userAnswerDisplay}
          <br />
          {v.verdict !== 'ungraded' && (
            <>
              <span className="label">Correct answer:</span> {v.correctAnswerDisplay}
              <br />
            </>
          )}
          <span
            className={
              v.verdict === 'correct' ? 'verdict-correct' : v.verdict === 'incorrect' ? 'verdict-incorrect' : 'verdict-ungraded'
            }
          >
            {v.verdict === 'correct' ? 'Correct' : v.verdict === 'incorrect' ? 'Incorrect' : 'Not auto-graded'}
          </span>
          {q.explain && (
            <>
              <br />
              <span className="label">Note:</span> {q.explain}
            </>
          )}
        </div>
      )}
    </div>
  );
}
