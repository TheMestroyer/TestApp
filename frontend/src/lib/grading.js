// Grading logic ported from the original single-file app. Pure functions operating
// on a parsed quiz's questions[] and a serialized answers[] array (see quizParser.js
// for question shape and AppPage for the answer shape per question type).

export function computeVerdict(q, answer) {
  let userAnswerDisplay = '';
  let correctAnswerDisplay = '';
  let verdict = 'ungraded';

  if (q.type === 'single') {
    const pickedIdx = answer !== null && answer !== undefined && answer !== '' ? parseInt(answer, 10) : -1;
    const picked = pickedIdx >= 0 ? q.options[pickedIdx] : null;
    userAnswerDisplay = picked ? picked.text : '(no answer)';
    const correctOpt = q.options.find((o) => o.correct);
    correctAnswerDisplay = correctOpt ? correctOpt.text : '(unspecified)';
    verdict = picked && picked.correct ? 'correct' : 'incorrect';
  } else if (q.type === 'multiple') {
    const pickedSet = Array.isArray(answer) ? answer.map((v) => parseInt(v, 10)).sort((a, b) => a - b) : [];
    const correctSet = q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i !== -1).sort((a, b) => a - b);
    const isCorrect = pickedSet.length === correctSet.length && pickedSet.every((v, i) => v === correctSet[i]);
    userAnswerDisplay = pickedSet.length ? pickedSet.map((i) => q.options[i].text).join(', ') : '(no answer)';
    correctAnswerDisplay = correctSet.map((i) => q.options[i].text).join(', ');
    verdict = isCorrect ? 'correct' : 'incorrect';
  } else if (q.type === 'truefalse') {
    userAnswerDisplay = answer === 'true' ? 'True' : answer === 'false' ? 'False' : '(no answer)';
    const correctVal = /^true$/i.test(q.answer || '') ? 'true' : 'false';
    correctAnswerDisplay = correctVal === 'true' ? 'True' : 'False';
    verdict = answer === correctVal ? 'correct' : 'incorrect';
  } else if (q.type === 'fill') {
    const userVal = (answer || '').trim();
    userAnswerDisplay = userVal || '(no answer)';
    const accepted = (q.answer || '').split('|').map((a) => a.trim().toLowerCase());
    correctAnswerDisplay = (q.answer || '').split('|').map((a) => a.trim()).join(' / ');
    verdict = accepted.includes(userVal.toLowerCase()) ? 'correct' : 'incorrect';
  } else if (q.type === 'short') {
    userAnswerDisplay = (answer || '').trim() || '(no answer)';
    correctAnswerDisplay = '';
    verdict = 'ungraded';
  } else if (q.type === 'match') {
    const assignments = (answer && answer.assignments) || [];
    let allCorrect = q.fields.length > 0;
    const userLines = [];
    const correctLines = [];
    q.fields.forEach((fieldLabel, fi) => {
      const ci = assignments[fi];
      const userCardText = ci !== null && ci !== undefined ? q.cards[ci].text : '(empty)';
      const correctCard = q.cards.find((c) => c.target === fi);
      const correctText = correctCard ? correctCard.text : '(unspecified)';
      userLines.push(`${fieldLabel}: ${userCardText}`);
      correctLines.push(`${fieldLabel}: ${correctText}`);
      if (ci === null || ci === undefined || !q.cards[ci] || q.cards[ci].target !== fi) allCorrect = false;
    });
    userAnswerDisplay = userLines.join(' | ');
    correctAnswerDisplay = correctLines.join(' | ');
    verdict = allCorrect ? 'correct' : 'incorrect';
  }

  return { verdict, userAnswerDisplay, correctAnswerDisplay };
}

export function hasAnyAnswer(q, answer) {
  if (q.type === 'single' || q.type === 'truefalse') return answer !== null && answer !== undefined && answer !== '';
  if (q.type === 'multiple') return Array.isArray(answer) && answer.length > 0;
  if (q.type === 'fill' || q.type === 'short') return !!(answer && String(answer).trim());
  if (q.type === 'match') return !!(answer && answer.assignments && answer.assignments.some((a) => a !== null && a !== undefined));
  return false;
}

export function gradeQuiz(questions, answers) {
  const results = [];
  let gradable = 0;
  let correctCount = 0;
  questions.forEach((q, idx) => {
    const v = computeVerdict(q, answers ? answers[idx] : null);
    if (q.type !== 'short') gradable++;
    if (v.verdict === 'correct') correctCount++;
    results.push({
      number: idx + 1,
      text: q.text,
      type: q.type,
      userAnswer: v.userAnswerDisplay,
      correctAnswer: v.correctAnswerDisplay,
      verdict: v.verdict,
      explain: q.explain || '',
    });
  });
  return { results, gradable, correctCount };
}

export function formatElapsed(ms) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}
