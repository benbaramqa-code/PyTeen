// ================================================================
// PyTeen - Code Editor, Execution & Terminal
// ================================================================

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
        document.getElementById('code-editor').value = currentLesson.default_code;
        showSavedIndicator("הקוד אופס לברירת המחדל");
      }
    }

    async function runCode() {
      if (!currentLesson) return;

      const code = document.getElementById('code-editor').value;
      const terminal = document.getElementById('terminal-body');
      const status = document.getElementById('terminal-status');
      const banner = document.getElementById('feedback-banner');

      status.innerText = 'מריץ...';
      terminal.innerHTML = '<span style="color: #38bdf8;">>>> מריץ קוד...</span>';
      banner.style.display = 'none';

      try {
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
            const nextBtnHtml = (currentLesson.id < allLessons.length) ? '<button class="btn-next-step" onclick="nextLesson()">לשלב הבא ⬅️</button>' : '<span>🏆 סיימת את כל הקורס!</span>';
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
      const code = document.getElementById('code-editor').value;
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
