// ================================================================
// PyTeen - Code Editor, Client-Side Python (Pyodide) & Terminal
// ================================================================

let pyodideInstance = null;
let pyodideLoadingPromise = null;

// Hebrew error translation matching code_evaluator.py
function translatePythonError(errorMsg) {
  if (errorMsg.includes("SyntaxError")) {
    if (errorMsg.includes("unexpected EOF") || errorMsg.includes("unclosed")) {
      return "אופס! נראה ששכחת לסגור סוגריים או גרשיים בסוף. בדוק שוב את השורה!";
    }
    return "שגיאת תחביר (SyntaxError): יש טעות כתיב בקוד, או שחסר פסיק / נקודתיים (:) במקום כלשהו.";
  } else if (errorMsg.includes("IndentationError")) {
    return "שגיאת הזחה (IndentationError): בפייתון הרווחים בתחילת השורה קריטיים! ודא שכל הפקודות מיושרות ומודגשות בהזחה נכונה.";
  } else if (errorMsg.includes("NameError")) {
    return "שגיאת שם (NameError): השתמשת במשתנה או בפקודה שלא הוגדרו קודם לכן. בדוק שאין שגיאת איות באנגלית.";
  } else if (errorMsg.includes("TypeError")) {
    return "שגיאת סוג (TypeError): ניסית לבצע פעולה בין סוגי נתונים שלא מתאימים (למשל לחבר מספר עם טקסט ללא המרה).";
  } else if (errorMsg.includes("ZeroDivisionError")) {
    return "חלוקה באפס (ZeroDivisionError): במתמטיקה ובפייתון אי אפשר לחלק מספר ב-0!";
  } else if (errorMsg.includes("IndexError")) {
    return "חריגה מהרשימה (IndexError): ניסית לגשת לאיבר במיקום שאינו קיים ברשימה.";
  } else if (errorMsg.includes("KeyError")) {
    return "שגיאת מפתח (KeyError): המפתח המבוקש אינו קיים במילון.";
  } else if (errorMsg.includes("AttributeError")) {
    return "שגיאת תכונה (AttributeError): ניסית לגשת לתכונה או למתודה שאינה קיימת באובייקט.";
  } else if (errorMsg.includes("ValueError")) {
    return "ערך לא חוקי (ValueError): הערך שהועבר אינו תואם למה שהפונקציה מצפה לקבל.";
  } else {
    return `קרתה שגיאה בהרצת הקוד:\n${errorMsg}`;
  }
}

// Normalize output string for comparison
function normalizeOutput(text) {
  if (!text) return "";
  return text.replace(/\r\n/g, "\n").trim().split("\n").map(l => l.trimEnd()).join("\n");
}

// Initialize Pyodide WebAssembly runtime in browser
async function getPyodideRuntime() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  if (typeof loadPyodide === 'function') {
    pyodideLoadingPromise = loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
    }).then(py => {
      pyodideInstance = py;
      console.log("[Pyodide] WebAssembly Python 3 is ready in your browser!");
      const status = document.getElementById('terminal-status');
      if (status && status.innerText.includes('טוען סביבה')) {
        status.innerText = 'מוכן להרצה';
      }
      return py;
    }).catch(err => {
      console.warn("[Pyodide] Browser load failed, will fallback to server:", err);
      pyodideLoadingPromise = null;
      return null;
    });
    return pyodideLoadingPromise;
  }
  return null;
}

// Start loading Pyodide in background
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    getPyodideRuntime();
  });
}

function toggleHint() {
  const hint = document.getElementById('hint-card');
  if (!hint) return;
  const isVisible = (hint.style.display === 'block');
  const navBtn = document.getElementById('btn-nav-hint');
  const editorBtn = document.getElementById('btn-editor-hint');

  if (isVisible) {
    hint.style.display = 'none';
    if (navBtn) navBtn.innerHTML = '💡 רמז לפתרון';
    if (editorBtn) editorBtn.innerHTML = '💡 רמז';
  } else {
    hint.style.display = 'block';
    if (navBtn) navBtn.innerHTML = '💡 הסתר רמז';
    if (editorBtn) editorBtn.innerHTML = '💡 הסתר רמז';

    // If on mobile and in editor tab, switch to theory tab to view the hint
    const courseView = document.getElementById('course-view');
    if (courseView && courseView.getAttribute('data-mobile-tab') === 'editor') {
      switchMobileTab('theory');
    }
    setTimeout(() => {
      hint.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }
}

function resetCode() {
  if (currentLesson) {
    clearCodeDraft(currentLesson.id);
    document.getElementById('code-editor').value = fixBidiForDisplay(currentLesson.default_code || '');
    showSavedIndicator("הקוד אופס לברירת המחדל");
  }
}

async function runCode() {
  if (!currentLesson) return;

  const rawCode = document.getElementById('code-editor').value;
  const code = stripBidi(rawCode);
  const terminal = document.getElementById('terminal-body');
  const status = document.getElementById('terminal-status');
  const banner = document.getElementById('feedback-banner');

  status.innerText = 'מריץ...';
  terminal.innerHTML = '<span style="color: #38bdf8;">>>> מריץ קוד...</span>';
  banner.style.display = 'none';

  // 1. Try running client-side with Pyodide (instant, zero cold-start)
  try {
    const py = await getPyodideRuntime();
    if (py) {
      const packagesToLoad = [];
      if (code.includes('numpy') || code.includes('np.')) packagesToLoad.push('numpy');
      if (code.includes('pandas') || code.includes('pd.')) packagesToLoad.push('pandas');
      if (code.includes('sklearn') || code.includes('scikit-learn')) packagesToLoad.push('scikit-learn');
      if (packagesToLoad.length > 0) {
        status.innerText = 'טוען חבילות דאטה...';
        await py.loadPackage(packagesToLoad);
        status.innerText = 'מריץ...';
      }
      py.globals.set("py_user_code", code);
      const runnerCode = `
import sys, io, traceback
_buffer = io.StringIO()
_old_stdout, _old_stderr = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _buffer, _buffer
_success = False
_error = ""
try:
    exec(py_user_code, {})
    _success = True
except Exception as _e:
    _error = traceback.format_exc()
finally:
    sys.stdout, sys.stderr = _old_stdout, _old_stderr
_out = _buffer.getvalue()
(_success, _out, _error)
`;
      const resTuple = py.runPython(runnerCode);
      const success = resTuple.get(0);
      const output = resTuple.get(1);
      const rawError = resTuple.get(2);
      resTuple.destroy();

      status.innerText = 'הסתיים (בדפדפן ⚡)';

      if (success) {
        terminal.innerText = output ? output : '(הקוד רץ בהצלחה ללא פלט למסך)';
        terminal.className = 'terminal-body output-success';

        const actualNorm = normalizeOutput(output);
        const expectedNorm = normalizeOutput(currentLesson.expected_output);

        if (actualNorm === expectedNorm) {
          completedLessons.add(currentLesson.id);
          saveProgress();

          banner.className = 'feedback-banner feedback-success';
          const nextBtnHtml = (currentLesson.id < allLessons.length) ? '<button class="btn-next-step" onclick="nextLesson()">לשלב הבא ⬅️</button>' : '<button class="btn-next-step" onclick="openCertModal()">🎓 קבל את תעודת הסיום שלך! 🎉</button>';
          banner.innerHTML = '<span>' + (currentLesson.success_message + ' 🎉') + '</span>' + nextBtnHtml;
          banner.style.display = 'flex';
        } else {
          banner.className = 'feedback-banner feedback-warning';
          banner.innerHTML = '<div><strong>הקוד רץ, אך הפלט אינו תואם למצופה:</strong><br><span style="font-family: Consolas, monospace; direction: ltr; display: inline-block;">מצופה: ' + (currentLesson.expected_output || '') + '</span></div>';
          banner.style.display = 'block';
        }
      } else {
        const translated = translatePythonError(rawError);
        terminal.innerText = translated;
        terminal.className = 'terminal-body output-error';
        banner.className = 'feedback-banner feedback-warning';
        banner.innerText = '⚠️ קרתה שגיאה בהרצה. בדוק את פירוט השגיאה במסוף למעלה ותקן את הקוד.';
        banner.style.display = 'block';
      }
      return;
    }
  } catch (clientErr) {
    console.warn("[Pyodide] Client execution error, falling back to server:", clientErr);
  }

  // 2. Fallback to server execution if Pyodide not available
  try {
    status.innerText = 'מריץ בשרת...';
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        lesson_id: currentLesson.id
      })
    });

    const data = await response.json();
    status.innerText = 'הסתיים';

    if (data.success) {
      terminal.innerText = data.output ? data.output : '(הקוד רץ בהצלחה ללא פלט למסך)';
      terminal.className = 'terminal-body output-success';

      if (data.passed) {
        completedLessons.add(currentLesson.id);
        saveProgress();

        banner.className = 'feedback-banner feedback-success';
        const nextBtnHtml = (currentLesson.id < allLessons.length) ? '<button class="btn-next-step" onclick="nextLesson()">לשלב הבא ⬅️</button>' : '<button class="btn-next-step" onclick="openCertModal()">🎓 קבל את תעודת הסיום שלך! 🎉</button>';
        banner.innerHTML = '<span>' + (data.message || 'כל הכבוד! עברת את השלב בהצלחה!') + '</span>' + nextBtnHtml;
        banner.style.display = 'flex';
      } else {
        banner.className = 'feedback-banner feedback-warning';
        banner.innerHTML = '<div><strong>הקוד רץ, אך הפלט אינו תואם למצופה:</strong><br><span style="font-family: Consolas, monospace; direction: ltr; display: inline-block;">מצופה: ' + (data.expected || '') + '</span></div>';
        banner.style.display = 'block';
      }
    } else {
      terminal.innerText = data.error;
      terminal.className = 'terminal-body output-error';
      banner.className = 'feedback-banner feedback-warning';
      banner.innerText = '⚠️ קרתה שגיאה בהרצה. בדוק את פירוט השגיאה במסוף למעלה ותקן את הקוד.';
      banner.style.display = 'block';
    }
  } catch (err) {
    status.innerText = 'שגיאת תקשורת';
    terminal.innerText = 'שגיאת תקשורת עם השרת: ' + err.message;
    terminal.className = 'terminal-body output-error';
  }
}

// --- Mobile Tab / Indentation Helper (4 spaces) ---
function insertTab() {
  const editor = document.getElementById('code-editor');
  if (!editor) return;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
  editor.selectionStart = editor.selectionEnd = start + 4;
  editor.focus();
  if (currentLesson) {
    saveCodeDraft(currentLesson.id, editor.value);
  }
}

function makeTitleSlug(title) {
  return (title || '').replace(/^שלב\s*\d+\s*:\s*/, '').replace(/[^\w\u0590-\u05FF\s-]/g, '').trim().replace(/\s+/g, '_').substring(0, 40) || 'lesson';
}

function downloadCode() {
  if (!currentLesson) { showToast('⚠️ לא נטען שלב. נסה שוב.'); return; }
  const rawCode = document.getElementById('code-editor').value;
  const code = stripBidi(rawCode);
  const header = [
    `# ===================================================`,
    `# קובץ זה נוצר על ידי PyTeen – פייתון בקלות`,
    `# שלב ${currentLesson.id}: ${currentLesson.title}`,
    `# תאריך הורדה: ${new Date().toLocaleDateString('he-IL')}`,
    `# ===================================================`,
    ``
  ].join('\n');
  const blob = new Blob([header + code], { type: 'text/x-python;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pyteen_lesson_${currentLesson.id}_${makeTitleSlug(currentLesson.title)}.py`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✅ הקוד הורד בהצלחה!');
}
