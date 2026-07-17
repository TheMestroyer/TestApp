import { formatElapsed } from './grading.js';

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function buildResultsText(quizTitle, fileName, lastResults) {
  let out = '';
  out += `RESULTS: ${quizTitle || fileName}\n`;
  out += `Source file: ${fileName}\n`;
  out += `Date: ${dateStamp()}\n`;
  out += `Time taken: ${formatElapsed(lastResults.elapsedMs)}\n`;
  out += `Score: ${lastResults.correctCount} / ${lastResults.gradable} (${lastResults.pct}%)\n`;
  out += `\n${'='.repeat(50)}\n\n`;

  lastResults.results.forEach((r) => {
    out += `Q${r.number}. ${r.text}\n`;
    out += `Your answer: ${r.userAnswer}\n`;
    if (r.verdict !== 'ungraded') {
      out += `Correct answer: ${r.correctAnswer}\n`;
    }
    out += `Result: ${r.verdict === 'correct' ? 'CORRECT' : r.verdict === 'incorrect' ? 'INCORRECT' : 'NOT AUTO-GRADED (review manually)'}\n`;
    if (r.explain) out += `Note: ${r.explain}\n`;
    out += '\n';
  });

  return out;
}

export function buildShortAnswerReviewText(quizTitle, fileName, lastResults) {
  const ungraded = lastResults.results.filter((r) => r.verdict === 'ungraded');
  let out = '';
  out += `SHORT-ANSWER REVIEW: ${quizTitle || fileName}\n`;
  out += `Source file: ${fileName}\n`;
  out += `Date: ${dateStamp()}\n\n`;
  out += 'Instructions for whoever checks this: the questions below are from a self-study quiz\n';
  out += 'and are not auto-graded. Please review each answer for correctness/completeness and\n';
  out += 'give feedback or a corrected answer where needed.\n';
  out += `\n${'='.repeat(50)}\n\n`;

  ungraded.forEach((r) => {
    out += `Q${r.number}. ${r.text}\n`;
    out += `My answer: ${r.userAnswer}\n`;
    if (r.explain) out += `Reference note: ${r.explain}\n`;
    out += '\n';
  });

  return out;
}

export function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
