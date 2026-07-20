import { useState } from 'react';

export default function ReportQuestionButton({ alreadyReported, onReport }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (alreadyReported) {
    return <div className="reportDone">Question reported — thanks for the feedback.</div>;
  }

  if (!open) {
    return (
      <button type="button" className="btn-danger-ghost reportToggle" onClick={() => setOpen(true)}>
        Report this question
      </button>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onReport(reason.trim() || null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="reportForm">
      <textarea
        className="field-textarea"
        placeholder="What's wrong with this question or answer? (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
      <div className="reportFormActions">
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="button" className="btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </div>
  );
}
