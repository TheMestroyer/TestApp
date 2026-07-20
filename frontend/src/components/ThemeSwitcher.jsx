import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeSwitcher() {
  const { mode, color, colors, toggleMode, setColor } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`themeSwitcher${open ? ' open' : ''}`} ref={containerRef}>
      {open && (
        <div className="themeSwitcherPanel glow-panel">
          <div className="themeSwitcherRow">
            <span className="themeSwitcherLabel">Mode</span>
            <button type="button" className="btn btn-secondary themeModeBtn" onClick={toggleMode}>
              {mode === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
          <div className="themeSwitcherRow">
            <span className="themeSwitcherLabel">Color</span>
            <div className="themeSwatches">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`themeSwatch${color === c.id ? ' active' : ''}`}
                  style={{ background: c.swatch }}
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setColor(c.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        className="themeSwitcherToggle"
        onClick={() => setOpen((prev) => !prev)}
        title="Theme settings"
        aria-label="Theme settings"
      >
        ◐
      </button>
    </div>
  );
}
