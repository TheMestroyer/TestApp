// Parser for the plain-text quiz format (TITLE / QUESTION / TYPE / ...).
// Ported from the original single-file app — see legacy/README.md for the format spec.

const TYPE_ALIASES = {
  single: 'single', radio: 'single', sc: 'single',
  multiple: 'multiple', multi: 'multiple', checkbox: 'multiple', mc: 'multiple',
  fill: 'fill', blank: 'fill', fillblank: 'fill', text: 'fill',
  truefalse: 'truefalse', 'true/false': 'truefalse', tf: 'truefalse', boolean: 'truefalse',
  short: 'short', open: 'short', essay: 'short',
  match: 'match', order: 'match', ordering: 'match', sequence: 'match', dragdrop: 'match', cards: 'match',
};

function parseOption(line) {
  let correct = false;
  let s = line;
  if (s.startsWith('*')) {
    correct = true;
    s = s.slice(1).trim();
  }
  const labelMatch = /^[A-Za-z0-9]+[).]\s*/.exec(s);
  if (labelMatch) s = s.slice(labelMatch[0].length);
  return { text: s.trim(), correct };
}

function parseCard(line) {
  const m = /^\*(\d+)\s*(.*)$/.exec(line);
  if (m) {
    return { text: m[2].trim(), target: parseInt(m[1], 10) - 1 };
  }
  return { text: line.trim(), target: null };
}

export function parseQuiz(text) {
  const lines = text.split(/\r\n|\r|\n/);
  let title = '';
  const questions = [];
  let current = null;
  let phase = null; // 'question' | 'options' | 'code'
  const warnings = [];

  function pushCurrent() {
    if (current) questions.push(current);
  }

  lines.forEach((rawLine, i) => {
    if (phase === 'code') {
      if (/^endcode\s*$/i.test(rawLine.trim())) {
        phase = 'question';
        return;
      }
      current.code.push(rawLine.replace(/\s+$/, ''));
      return;
    }

    const line = rawLine.trim();
    if (line === '') return;

    const titleMatch = /^title:\s*(.*)$/i.exec(line);
    const qMatch = /^question:\s*(.*)$/i.exec(line);
    const codeMatch = /^code:\s*$/i.exec(line);
    const typeMatch = /^type:\s*(.*)$/i.exec(line);
    const answerMatch = /^answer:\s*(.*)$/i.exec(line);
    const explainMatch = /^explain:\s*(.*)$/i.exec(line);
    const fieldMatch = /^field:\s*(.*)$/i.exec(line);
    const cardMatch = /^card:\s*(.*)$/i.exec(line);

    if (titleMatch) { title = titleMatch[1].trim(); return; }

    if (qMatch) {
      pushCurrent();
      current = { text: qMatch[1].trim(), type: 'single', options: [], fields: [], cards: [], code: null, answer: null, explain: null, line: i + 1 };
      phase = 'question';
      return;
    }

    if (!current) return; // ignore stray lines before the first question

    if (codeMatch) {
      current.code = [];
      phase = 'code';
      return;
    }
    if (typeMatch) {
      const raw = typeMatch[1].trim().toLowerCase();
      current.type = TYPE_ALIASES[raw] || raw;
      phase = 'options';
      return;
    }
    if (answerMatch) { current.answer = answerMatch[1].trim(); return; }
    if (explainMatch) { current.explain = explainMatch[1].trim(); return; }
    if (fieldMatch) { current.fields.push(fieldMatch[1].trim()); return; }
    if (cardMatch) { current.cards.push(parseCard(cardMatch[1].trim())); return; }

    if (phase === 'question') {
      current.text += ' ' + line;
    } else if (phase === 'options') {
      if (current.type === 'single' || current.type === 'multiple') {
        current.options.push(parseOption(line));
      }
      // extra lines for fill/truefalse/short/match are ignored
    }
  });

  if (phase === 'code' && current) {
    warnings.push(`Question near line ${current.line}: a "CODE:" block was started but never closed with "ENDCODE".`);
  }

  pushCurrent();

  questions.forEach((q, idx) => {
    const label = `Question ${idx + 1} (near line ${q.line})`;
    if (!q.text) warnings.push(`${label}: missing question text.`);
    if (['single', 'multiple'].includes(q.type)) {
      if (q.options.length < 2) warnings.push(`${label}: needs at least two options.`);
      if (!q.options.some((o) => o.correct)) {
        warnings.push(`${label}: no option marked correct (prefix it with "*").`);
      }
    } else if (q.type === 'fill') {
      if (!q.answer) warnings.push(`${label}: fill-in-the-blank needs an "ANSWER:" line.`);
    } else if (q.type === 'truefalse') {
      if (!/^true$|^false$/i.test(q.answer || '')) {
        warnings.push(`${label}: true/false needs "ANSWER: TRUE" or "ANSWER: FALSE".`);
      }
    } else if (q.type === 'short') {
      // no requirements, self-graded
    } else if (q.type === 'match') {
      if (q.fields.length < 2) {
        warnings.push(`${label}: needs at least two "FIELD:" lines.`);
      }
      if (q.cards.length < q.fields.length) {
        warnings.push(`${label}: needs at least as many "CARD:" lines as "FIELD:" lines.`);
      } else {
        const targets = q.cards.map((c) => c.target).filter((t) => t !== null);
        const outOfRange = targets.some((t) => t < 0 || t >= q.fields.length);
        const uniqueCount = new Set(targets).size;
        if (outOfRange || targets.length !== q.fields.length || uniqueCount !== q.fields.length) {
          warnings.push(`${label}: exactly one "CARD:" must be marked "*N" for each field, N from 1 to ${q.fields.length}, with no repeats.`);
        }
      }
    } else {
      warnings.push(`${label}: unknown TYPE "${q.type}".`);
    }
  });

  if (questions.length === 0) {
    warnings.push('No questions were found. Make sure each question starts with a line like "QUESTION: ...".');
  }

  return { title, questions, warnings };
}

export function shuffledIndices(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function typeLabel(t) {
  return {
    single: 'Single choice',
    multiple: 'Multiple choice',
    fill: 'Fill in the blank',
    truefalse: 'True / False',
    short: 'Short answer',
    match: 'Put in order / match',
  }[t] || t;
}

export function blankState(questionCount) {
  const n = Number.isInteger(questionCount) && questionCount > 0 ? questionCount : 0;
  return {
    currentIndex: 0,
    marked: new Array(n).fill(false),
    peeked: new Array(n).fill(false),
    answers: new Array(n).fill(null),
    submitted: false,
    submittedElapsedMs: null,
    scoreText: null,
  };
}

const JAVA_KEYWORDS = ['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto',
  'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private',
  'protected', 'public', 'record', 'return', 'sealed', 'permits', 'short', 'static', 'strictfp', 'super', 'switch',
  'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'var', 'void', 'volatile', 'while', 'yield',
  'true', 'false', 'null'];
const JAVA_KEYWORD_SET = new Set(JAVA_KEYWORDS);

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightCodeHtml(code) {
  const escaped = escapeHtml(code);
  const tokenRe = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d[\d_]*(?:\.[\d_]+)?[fFdDlL]?\b)|(\b[A-Za-z_$][A-Za-z0-9_$]*\b)/g;
  return escaped.replace(tokenRe, (match, comment1, comment2, str, ch, num, word) => {
    if (comment1 || comment2) return `<span class="tok-comment">${match}</span>`;
    if (str || ch) return `<span class="tok-string">${match}</span>`;
    if (num) return `<span class="tok-number">${match}</span>`;
    if (word) {
      if (JAVA_KEYWORD_SET.has(word)) return `<span class="tok-keyword">${match}</span>`;
      if (/^[A-Z]/.test(word)) return `<span class="tok-type">${match}</span>`;
      return match;
    }
    return match;
  });
}
