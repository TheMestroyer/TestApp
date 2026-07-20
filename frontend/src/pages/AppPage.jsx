import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { parseQuiz, blankState } from '../lib/quizParser.js';
import { computeVerdict, gradeQuiz, hasAnyAnswer, formatElapsed } from '../lib/grading.js';
import { buildResultsText, buildShortAnswerReviewText, downloadTextFile } from '../lib/exportText.js';
import Sidebar from '../components/Sidebar.jsx';
import Dropzone from '../components/Dropzone.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import Navigator from '../components/Navigator.jsx';
import TestEditor from '../components/TestEditor.jsx';
import TutorialModal from '../components/TutorialModal.jsx';

const TUTORIAL_SEEN_KEY = 'studytest.tutorialSeen';

export default function AppPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [globalTests, setGlobalTests] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [editing, setEditing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [marked, setMarked] = useState([]);
  const [peeked, setPeeked] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [lastResults, setLastResults] = useState(null);
  const [showDropzone, setShowDropzone] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reportedIndexes, setReportedIndexes] = useState([]);

  const skipSaveRef = useRef(false);
  const saveTimerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    api
      .listTests()
      .then((res) => setTests(res.tests))
      .catch(() => {});
    api
      .listGlobalTests()
      .then((res) => setGlobalTests(res.globalTests))
      .catch(() => {});
    if (typeof window !== 'undefined' && window.localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true') {
      setShowTutorial(true);
    }
  }, []);

  function handleCloseTutorial() {
    setShowTutorial(false);
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  }

  useEffect(() => {
    if (!activeId || !quiz) return undefined;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return undefined;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state = {
        currentIndex,
        marked,
        peeked,
        answers,
        submitted,
        submittedElapsedMs: lastResults ? lastResults.elapsedMs : null,
        scoreText: lastResults ? `${lastResults.correctCount} / ${lastResults.gradable} (${lastResults.pct}%)` : null,
      };
      api
        .updateTest(activeId, { state })
        .then((res) => updateTestInList(res.test))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, marked, peeked, currentIndex, submitted]);

  useEffect(() => {
    if (!quiz) return undefined;

    function handleKeyDown(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      const type = (e.target.type || '').toLowerCase();
      const isTextCaret = tag === 'textarea' || (tag === 'input' && (type === 'text' || type === 'number'));
      const isRadioOrCheckbox = tag === 'input' && (type === 'radio' || type === 'checkbox');
      const isButton = tag === 'button';

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (isTextCaret || isRadioOrCheckbox) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
        else goTo(currentIndex + 1);
      } else if (e.key === 'Enter') {
        if (tag === 'textarea' || isButton) return;
        if (!submitted) {
          e.preventDefault();
          togglePeek();
          e.target.blur?.();
        }
      } else if (/^[1-9]$/.test(e.key)) {
        if (isTextCaret || isRadioOrCheckbox || submitted) return;
        const q = quiz.questions[currentIndex];
        const n = parseInt(e.key, 10);
        if (q.type === 'single' && n <= q.options.length) {
          e.preventDefault();
          handleAnswerChange(currentIndex, String(n - 1));
        } else if (q.type === 'multiple' && n <= q.options.length) {
          e.preventDefault();
          toggleMultipleOption(currentIndex, String(n - 1));
        } else if (q.type === 'truefalse' && (n === 1 || n === 2)) {
          e.preventDefault();
          handleAnswerChange(currentIndex, n === 1 ? 'true' : 'false');
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, currentIndex, submitted]);

  function updateTestInList(updated) {
    setTests((prev) => {
      const next = prev.map((t) =>
        t.id === updated.id ? { ...t, name: updated.name, state: updated.state, updatedAt: updated.updatedAt } : t,
      );
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      return next;
    });
  }

  function activateTest(test) {
    const parsed = parseQuiz(test.rawText);
    skipSaveRef.current = true;
    setActiveId(test.id);
    setFileName(test.fileName);
    setRawText(test.rawText);
    setEditing(false);
    setQuiz(parsed);
    setAnswers(test.state.answers || []);
    setMarked(test.state.marked || []);
    setPeeked(test.state.peeked || []);
    setCurrentIndex(Math.min(test.state.currentIndex || 0, Math.max(parsed.questions.length - 1, 0)));
    setSubmitted(!!test.state.submitted);
    if (test.state.submitted) {
      const graded = gradeQuiz(parsed.questions, test.state.answers || []);
      const pct = graded.gradable ? Math.round((graded.correctCount / graded.gradable) * 100) : 0;
      setLastResults({ ...graded, elapsedMs: test.state.submittedElapsedMs || 0, pct });
    } else {
      setLastResults(null);
    }
    setLoadError('');
    setShowDropzone(false);
    startTimeRef.current = Date.now();

    if (test.globalTestId) {
      api
        .myReportedQuestions(test.globalTestId)
        .then((res) => setReportedIndexes(res.reportedIndexes))
        .catch(() => setReportedIndexes([]));
    } else {
      setReportedIndexes([]);
    }
  }

  async function handleFileText(text, name) {
    const parsed = parseQuiz(text);
    if (parsed.warnings.length) {
      setLoadError(parsed.warnings.join('\n'));
      return;
    }
    const res = await api.createTest({
      fileName: name,
      rawText: text,
      name: parsed.title || name,
      questionCount: parsed.questions.length,
    });
    setTests((prev) => [res.test, ...prev]);
    activateTest(res.test);
  }

  async function handleSelectTest(id) {
    setLoadError('');
    const res = await api.getTest(id);
    activateTest(res.test);
  }

  async function handleSelectGlobalTest(globalTestId) {
    setLoadError('');
    const res = await api.startGlobalTest(globalTestId);
    setTests((prev) => (prev.some((t) => t.id === res.test.id) ? prev : [res.test, ...prev]));
    activateTest(res.test);
  }

  async function handleRename(id, name) {
    const res = await api.updateTest(id, { name });
    updateTestInList(res.test);
  }

  async function handleDelete(id) {
    await api.deleteTest(id);
    setTests((prev) => prev.filter((t) => t.id !== id));
    if (id === activeId) {
      setActiveId(null);
      setQuiz(null);
      setShowDropzone(true);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  async function handleSaveEdit({ name, rawText: newRawText, parsed }) {
    const contentChanged = newRawText !== rawText;
    if (contentChanged) {
      const hasProgress = submitted || answers.some((a, i) => hasAnyAnswer(quiz.questions[i], a));
      if (
        hasProgress &&
        !window.confirm(
          'Saving these changes will reset your progress on this test (answers, marks, and score) since the questions changed. Continue?',
        )
      ) {
        return;
      }
    }

    const payload = { name };
    if (contentChanged) {
      payload.rawText = newRawText;
      payload.state = blankState(parsed.questions.length);
    }

    const res = await api.updateTest(activeId, payload);
    updateTestInList(res.test);
    activateTest(res.test);
  }

  async function handleReportQuestion(reason) {
    const globalTestId = activeTest?.globalTestId;
    if (!globalTestId) return;
    await api.reportQuestion({
      globalTestId,
      questionIndex: currentIndex,
      questionText: quiz.questions[currentIndex].text,
      reason,
    });
    setReportedIndexes((prev) => (prev.includes(currentIndex) ? prev : [...prev, currentIndex]));
  }

  function handleAnswerChange(idx, value) {
    setAnswers((prev) => {
      const next = prev.slice();
      next[idx] = value;
      return next;
    });
  }

  function toggleMultipleOption(idx, optionValue) {
    setAnswers((prev) => {
      const arr = Array.isArray(prev[idx]) ? prev[idx] : [];
      const next = prev.slice();
      next[idx] = arr.includes(optionValue) ? arr.filter((v) => v !== optionValue) : [...arr, optionValue];
      return next;
    });
  }

  function toggleMark() {
    setMarked((prev) => {
      const next = prev.slice();
      next[currentIndex] = !next[currentIndex];
      return next;
    });
  }

  function togglePeek() {
    setPeeked((prev) => {
      const next = prev.slice();
      next[currentIndex] = !next[currentIndex];
      return next;
    });
  }

  function goTo(i) {
    if (!quiz) return;
    setCurrentIndex(Math.min(Math.max(i, 0), quiz.questions.length - 1));
  }

  function handleSubmit() {
    const graded = gradeQuiz(quiz.questions, answers);
    const elapsedMs = Date.now() - startTimeRef.current;
    const pct = graded.gradable ? Math.round((graded.correctCount / graded.gradable) * 100) : 0;
    setLastResults({ ...graded, elapsedMs, pct });
    setSubmitted(true);
  }

  function handleRetake() {
    const blank = blankState(quiz.questions.length);
    setAnswers(blank.answers);
    setMarked(blank.marked);
    setPeeked(blank.peeked);
    setCurrentIndex(0);
    setSubmitted(false);
    setLastResults(null);
    startTimeRef.current = Date.now();
  }

  function handleDownload() {
    if (!lastResults) return;
    downloadTextFile(
      buildResultsText(quiz.title, fileName, lastResults),
      `${fileName.replace(/\.[^/.]+$/, '')}-results.txt`,
    );
  }

  function handleReviewDownload() {
    if (!lastResults) return;
    downloadTextFile(
      buildShortAnswerReviewText(quiz.title, fileName, lastResults),
      `${fileName.replace(/\.[^/.]+$/, '')}-short-answers-for-review.txt`,
    );
  }

  const answeredFlags = quiz ? quiz.questions.map((q, i) => hasAnyAnswer(q, answers[i])) : [];
  const verdicts = submitted && quiz ? quiz.questions.map((q, i) => computeVerdict(q, answers[i]).verdict) : null;
  const ungradedCount = lastResults ? lastResults.results.length - lastResults.gradable : 0;
  const activeTest = tests.find((t) => t.id === activeId);

  return (
    <div className="appShell">
      {showTutorial && <TutorialModal isAdmin={!!user.isAdmin} onClose={handleCloseTutorial} />}
      <Sidebar
        user={user}
        tests={tests}
        globalTests={globalTests}
        activeId={activeId}
        onSelect={handleSelectTest}
        onSelectGlobal={handleSelectGlobalTest}
        onRename={handleRename}
        onDelete={handleDelete}
        onLogout={handleLogout}
        onShowTutorial={() => setShowTutorial(true)}
      />
      <div className="mainWrap">
        <header className="appHeader">
          <h1>Study Test App</h1>
          <p className="sub">Drop in a test file, answer the questions, and track your progress — saved to your account.</p>
        </header>

        {(!quiz || showDropzone) && <Dropzone onFileText={handleFileText} />}

        {quiz && !showDropzone && (
          <div className="loadedBar glow-panel">
            <span className="fname">
              Loaded: <strong>{fileName}</strong>
            </span>
            <div className="loadedBarActions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
                Edit test
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => downloadTextFile(rawText, fileName)}>
                Download test file
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDropzone(true)}>
                Load a different file
              </button>
            </div>
          </div>
        )}

        {loadError && <div className="errorBox">{`This file could not be fully loaded:\n\n${loadError}`}</div>}

        {quiz && editing && (
          <TestEditor
            name={activeTest?.name || fileName}
            rawText={rawText}
            onSave={handleSaveEdit}
            onCancel={() => setEditing(false)}
            onDownload={(text) => downloadTextFile(text, fileName)}
          />
        )}

        {quiz && !editing && (
          <div className="quizArea">
            <h2 className="quizTitle">{quiz.title || fileName}</h2>

            {submitted && lastResults && (
              <div className={`summary glow-panel ${lastResults.pct >= 60 ? 'good' : 'bad'}`}>
                Score: {lastResults.correctCount} / {lastResults.gradable} ({lastResults.pct}%)
                <span className="detail">
                  Time taken: {formatElapsed(lastResults.elapsedMs)}
                  {ungradedCount ? ` · ${ungradedCount} short-answer question(s) need manual review` : ''}
                </span>
              </div>
            )}

            <div className="quizLayout">
              <div className="questionStage">
                <div className="stageHead">
                  Question {currentIndex + 1} of {quiz.questions.length}
                </div>
                <QuestionCard
                  key={currentIndex}
                  idx={currentIndex}
                  q={quiz.questions[currentIndex]}
                  answer={answers[currentIndex]}
                  onAnswerChange={(value) => handleAnswerChange(currentIndex, value)}
                  submitted={submitted}
                  peeked={!!peeked[currentIndex]}
                  reportable={!!activeTest?.globalTestId}
                  alreadyReported={reportedIndexes.includes(currentIndex)}
                  onReport={handleReportQuestion}
                />
                <div className="stageNav">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={currentIndex === 0}
                    onClick={() => goTo(currentIndex - 1)}
                  >
                    &larr; Previous
                  </button>
                  <button
                    type="button"
                    className={`btn btn-secondary${marked[currentIndex] ? ' active' : ''}`}
                    onClick={toggleMark}
                  >
                    {marked[currentIndex] ? 'Unmark' : 'Mark for Review'}
                  </button>
                  {!submitted && (
                    <button
                      type="button"
                      className={`btn btn-secondary${peeked[currentIndex] ? ' active' : ''}`}
                      onClick={togglePeek}
                    >
                      {peeked[currentIndex] ? 'Hide Answer' : 'Show Answer'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={currentIndex === quiz.questions.length - 1}
                    onClick={() => goTo(currentIndex + 1)}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>

              <Navigator
                total={quiz.questions.length}
                currentIndex={currentIndex}
                onJump={goTo}
                answeredFlags={answeredFlags}
                marked={marked}
                submitted={submitted}
                verdicts={verdicts}
                onSubmit={handleSubmit}
                onDownload={handleDownload}
                onReview={handleReviewDownload}
                onRetake={handleRetake}
                showReviewButton={ungradedCount > 0}
              />
            </div>
          </div>
        )}

        <footer className="appFooter">Your tests and progress are saved to your account.</footer>
      </div>
    </div>
  );
}
