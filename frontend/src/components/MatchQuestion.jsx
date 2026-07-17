import { useEffect, useState } from 'react';
import { shuffledIndices } from '../lib/quizParser.js';

export default function MatchQuestion({ q, value, onChange, submitted }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [dragOverField, setDragOverField] = useState(null);

  useEffect(() => {
    if (!value) {
      onChange({ assignments: new Array(q.fields.length).fill(null), cardOrder: shuffledIndices(q.cards.length) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!value) return null;

  const { assignments, cardOrder } = value;

  function assign(cardIndex, fieldIndex) {
    const next = assignments.slice();
    const prevField = next.indexOf(cardIndex);
    if (prevField !== -1) next[prevField] = null;
    next[fieldIndex] = cardIndex;
    setSelectedCard(null);
    onChange({ assignments: next, cardOrder });
  }

  function unassign(fieldIndex) {
    const next = assignments.slice();
    next[fieldIndex] = null;
    setSelectedCard(null);
    onChange({ assignments: next, cardOrder });
  }

  function handleCardClick(cardIndex) {
    if (submitted) return;
    const placedField = assignments.indexOf(cardIndex);
    if (placedField !== -1) {
      unassign(placedField);
      return;
    }
    setSelectedCard((prev) => (prev === cardIndex ? null : cardIndex));
  }

  function handleSlotClick(fieldIndex) {
    if (submitted) return;
    if (selectedCard !== null) {
      assign(selectedCard, fieldIndex);
    } else if (assignments[fieldIndex] !== null && assignments[fieldIndex] !== undefined) {
      unassign(fieldIndex);
    }
  }

  function renderCard(cardIndex) {
    const card = q.cards[cardIndex];
    return (
      <div
        key={cardIndex}
        className={`matchCard${selectedCard === cardIndex ? ' selected' : ''}`}
        draggable={!submitted}
        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(cardIndex))}
        onClick={(e) => {
          e.stopPropagation();
          handleCardClick(cardIndex);
        }}
      >
        {card.text}
      </div>
    );
  }

  const poolCardIndexes = cardOrder.filter((ci) => !assignments.includes(ci));

  return (
    <div className={`qbody${submitted ? ' locked' : ''}`}>
      <div className="matchFields">
        {q.fields.map((label, fi) => {
          const assignedCardIdx = assignments[fi];
          const isFilled = assignedCardIdx !== null && assignedCardIdx !== undefined;
          let stateClass = '';
          let correctHint = null;
          if (submitted) {
            const isRight = isFilled && q.cards[assignedCardIdx].target === fi;
            stateClass = isRight ? ' fieldCorrect' : ' fieldIncorrect';
            if (!isRight) {
              const correctCard = q.cards.find((c) => c.target === fi);
              if (correctCard) correctHint = correctCard.text;
            }
          }
          return (
            <div
              key={fi}
              className={`matchField${stateClass}${dragOverField === fi ? ' dragover' : ''}`}
              onDragOver={(e) => {
                if (submitted) return;
                e.preventDefault();
                setDragOverField(fi);
              }}
              onDragLeave={() => setDragOverField(null)}
              onDrop={(e) => {
                if (submitted) return;
                e.preventDefault();
                setDragOverField(null);
                const ci = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (!Number.isNaN(ci)) assign(ci, fi);
              }}
              onClick={() => handleSlotClick(fi)}
            >
              <div className="matchFieldLabel">{label}</div>
              <div className={`matchFieldSlot${isFilled ? ' filled' : ''}`}>
                {isFilled ? renderCard(assignedCardIdx) : 'Drop a card here'}
              </div>
              {correctHint && <div className="matchFieldCorrectHint">Correct: {correctHint}</div>}
            </div>
          );
        })}
      </div>
      <div className="matchPool">
        <div className="matchPoolLabel">Drag a card into a slot above (or tap a card, then tap a slot):</div>
        <div className="matchPoolCards">{poolCardIndexes.map((ci) => renderCard(ci))}</div>
      </div>
    </div>
  );
}
