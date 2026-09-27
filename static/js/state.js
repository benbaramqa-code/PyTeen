// ================================================================
// PyTeen - State Management, Persistence & Theme
// ================================================================

    let allLessons = [];
    let currentLesson = null;
    let completedLessons = new Set();
    let currentCategoryFilter = 'all'; // 'all', 'basics', 'advanced', 'data-ai'
    let searchQuery = '';
    let collapsedChapters = new Set();

    // טעינת התקדמות שמורה מ-localStorage
    try {
      const saved = localStorage.getItem('py_bekalut_completed');
      if (saved) {
        completedLessons = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Storage not available", e);
    }


    // BiDi stabilizer helpers: prevents Hebrew text from flipping adjacent Python syntax (quotes, commas, parentheses)
    function stripBidi(code) {
      if (!code) return '';
      return code.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
    }

    function fixBidiForDisplay(code) {
      if (!code) return '';
      const clean = stripBidi(code);
      // Match any quote containing Hebrew characters and append an LRM (\u200E) right after its closing quote
      // This ensures the closing quote, commas, numbers, and brackets stay in LTR order on mobile and desktop
      return clean.replace(/(["'])([^"'\n]*[\u0590-\u05FF][^"'\n]*)(\1)/g, '$1$2$3\u200E');
    }

    // שמירה וטעינה של טיוטות קוד מה-localStorage
    function getCodeDraft(lessonId) {
      try {
        const drafts = JSON.parse(localStorage.getItem('py_bekalut_code_drafts') || '{}');
        return drafts[lessonId];
      } catch (e) {
        return null;
      }
    }

    let saveIndicatorTimeout = null;
    function showSavedIndicator(msg = '💾 נשמר') {
      const el = document.getElementById('save-indicator');
      if (!el) return;
      el.innerText = msg;
      el.style.opacity = '1';
      clearTimeout(saveIndicatorTimeout);
      saveIndicatorTimeout = setTimeout(() => {
        el.style.opacity = '0';
      }, 1500);
    }

    function saveCodeDraft(lessonId, code) {
      if (!lessonId) return;
      try {
        const drafts = JSON.parse(localStorage.getItem('py_bekalut_code_drafts') || '{}');
        drafts[lessonId] = code;
        localStorage.setItem('py_bekalut_code_drafts', JSON.stringify(drafts));
        showSavedIndicator('💾 נשמר');
      } catch (e) {}
    }

    function clearCodeDraft(lessonId) {
      if (!lessonId) return;
      try {
        const drafts = JSON.parse(localStorage.getItem('py_bekalut_code_drafts') || '{}');
        delete drafts[lessonId];
        localStorage.setItem('py_bekalut_code_drafts', JSON.stringify(drafts));
      } catch (e) {}
    }

    function saveProgress() {
      try {
        localStorage.setItem('py_bekalut_completed', JSON.stringify(Array.from(completedLessons)));
      } catch (e) {}
      updateProgress();
      renderSidebar();

      // FEATURE: Update daily streak on every successful lesson completion
      updateStreak();

      // FEATURE: Show certificate modal when all lessons completed
      const totalLessonsCount = (allLessons && allLessons.length) ? allLessons.length : 68;
      if (completedLessons.size >= totalLessonsCount) {
        setTimeout(() => openCertModal(), 800);
      }
    }

    function updateProgress() {
      const count = completedLessons.size;
      const total = (allLessons && allLessons.length) ? allLessons.length : 68;
      const percent = Math.round((count / total) * 100);

      const fill = document.getElementById('progress-fill');
      if (fill) fill.style.width = percent + '%';

      const txt = document.getElementById('progress-text');
      if (txt) txt.innerText = count + '/' + total + ' הושלמו (' + percent + '%)';

      const statComp = document.getElementById('stat-completed-count');
      if (statComp) statComp.innerText = count;

      // עדכון כפתור דף הבית (המשך מאיפה שהפסקת)
      const btnStart = document.getElementById('btn-start-hero');
      if (btnStart) {
        let lastActive = null;
        try { lastActive = parseInt(localStorage.getItem('py_bekalut_active_lesson'), 10); } catch(e){}
        if (lastActive && allLessons.some(l => l.id === lastActive)) {
          btnStart.innerText = '🚀 המשך מאיפה שהפסקת (שלב ' + lastActive + ')';
        } else if (count > 0) {
          const nextUnfinished = allLessons.find(l => !completedLessons.has(l.id));
          const stepNum = nextUnfinished ? nextUnfinished.id : 1;
          btnStart.innerText = '🚀 המשך מאיפה שהפסקת (שלב ' + stepNum + ')';
        } else {
          btnStart.innerText = '🚀 התחל ללמוד עכשיו';
        }
      }
    }


    // --- Dark / Light Theme Logic ---
    function initTheme() {
      let saved = null;
      try { saved = localStorage.getItem('py_theme'); } catch(e){}
      if (!saved) {
        saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      }
      applyTheme(saved);
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem('py_theme', theme); } catch(e){}
      const btn = document.getElementById('theme-toggle-btn');
      if (btn) {
        btn.innerHTML = (theme === 'dark') ? '☀️ יום בהיר' : '🌙 לילה כהה';
        btn.title = (theme === 'dark') ? 'עבור למצב יום (בהיר)' : 'עבור למצב לילה (כהה)';
      }
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = (current === 'dark') ? 'light' : 'dark';
      applyTheme(next);
    }


    // FEATURE: Daily Learning Streak
    // ================================================================

    let currentStreak = 0;

    function initStreak() {
      try {
        const lastDate = localStorage.getItem('py_last_activity_date');
        const savedStreak = parseInt(localStorage.getItem('py_streak_days') || '0', 10);
        const today = getTodayISO();
        if (!lastDate) {
          currentStreak = 0;
        } else if (lastDate === today) {
          currentStreak = savedStreak;
        } else {
          const diff = daysBetween(lastDate, today);
          if (diff === 1) { currentStreak = savedStreak; }
          else { currentStreak = 0; localStorage.setItem('py_streak_days', '0'); }
        }
      } catch (e) {}
      renderStreakBadge();
    }

    function updateStreak() {
      try {
        const lastDate = localStorage.getItem('py_last_activity_date');
        const today = getTodayISO();
        const prevStreak = currentStreak;
        if (!lastDate) {
          currentStreak = 1;
        } else if (lastDate === today) {
          // already logged today — no change
        } else {
          const diff = daysBetween(lastDate, today);
          currentStreak = (diff === 1) ? currentStreak + 1 : 1;
        }
        localStorage.setItem('py_last_activity_date', today);
        localStorage.setItem('py_streak_days', String(currentStreak));
        renderStreakBadge();
        if (lastDate !== today && currentStreak >= 2) showStreakToast(currentStreak);
      } catch (e) {}
    }

    function renderStreakBadge() {
      const badge = document.getElementById('streak-badge');
      const countText = document.getElementById('streak-count-text');
      if (!badge || !countText) return;
      if (currentStreak >= 2) {
        badge.style.display = 'flex';
        if (currentStreak >= 7) {
          badge.classList.add('super-streak');
          countText.innerText = '🔥 ' + currentStreak + ' ימים! אלוף!';
        } else {
          badge.classList.remove('super-streak');
          countText.innerText = currentStreak + ' ימים רצופים';
        }
      } else {
        badge.style.display = 'none';
      }
    }

    function showStreakToast(streak) {
      const toast = document.getElementById('streak-toast');
      if (!toast) return;
      toast.innerText = '🔥 רצף של ' + streak + ' ימים! כל הכבוד!';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function getTodayISO() { return new Date().toISOString().slice(0, 10); }
    function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

    // ================================================================
    // FEATURE: Download .py File
    // ================================================================

    function showToast(msg, durationMs = 2500) {
      const toast = document.getElementById('pyteen-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), durationMs);
    }
