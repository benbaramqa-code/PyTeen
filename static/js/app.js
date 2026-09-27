// ================================================================
// PyTeen - Application Bootstrap, PWA Installation & Event Listeners
// ================================================================

let deferredPWAInstallPrompt = null;

// Listen for PWA installation prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPWAInstallPrompt = e;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) {
    btn.style.display = 'inline-flex';
    btn.title = 'לחץ להורדת אייקון האפליקציה למסך הבית!';
  }
});

window.addEventListener('appinstalled', () => {
  deferredPWAInstallPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) {
    btn.innerHTML = '<span>✅</span><span>האייקון מותקן</span>';
    btn.classList.add('installed');
  }
  showToast('🎉 אייקון האפליקציה הותקן בהצלחה במסך הבית של המכשיר!');
});

async function triggerPWAInstall() {
  if (deferredPWAInstallPrompt) {
    deferredPWAInstallPrompt.prompt();
    const { outcome } = await deferredPWAInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('🎉 האייקון נוסף למסך הבית שלך!');
    }
    deferredPWAInstallPrompt = null;
    return;
  }

  // Detect iOS Safari or standalone mode
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone) {
    showToast('✅ האפליקציה כבר מותקנת במסך הבית שלך!');
  } else if (isIOS) {
    showToast('📱 ב-iPhone/iPad: לחצו על כפתור השיתוף (Share ⎋) בתחתית הדפדפן, ואז בחרו "הוסף למסך הבית" ➕', 6500);
  } else {
    showToast('💡 להורדת האייקון למסך הבית: לחצו על תפריט הדפדפן (⋮) ובחרו "התקן אפליקציה" או "הוסף למסך הבית"', 5500);
  }
}

// --- Mobile Workspace View Switcher ---
function switchMobileTab(tabName) {
  const courseView = document.getElementById('course-view');
  if (!courseView) return;
  courseView.setAttribute('data-mobile-tab', tabName);

  document.querySelectorAll('.mobile-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('mtab-' + tabName);
  if (activeBtn) activeBtn.classList.add('active');

  if (tabName === 'editor') {
    const editor = document.getElementById('code-editor');
    if (editor) {
      editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

async function initApp() {
  // FEATURE: Initialize daily streak state on load
  initStreak();

  try {
    let loaded = false;
    // 1. Try static JSON first (instant 0ms response, works on GitHub Pages & offline)
    try {
      const staticRes = await fetch('/static/data/lessons.json');
      if (staticRes.ok) {
        allLessons = await staticRes.json();
        loaded = true;
      }
    } catch (_) {}

    // 2. Fallback to API if static fetch fails
    if (!loaded) {
      const response = await fetch('/api/lessons');
      allLessons = await response.json();
      loaded = true;
    }

    // Cache in localStorage for ultra-fast startup
    try {
      localStorage.setItem('py_cached_lessons', JSON.stringify(allLessons));
    } catch (_) {}
  } catch (err) {
    // 3. Fallback to localStorage cache
    try {
      const cached = localStorage.getItem('py_cached_lessons');
      if (cached) {
        allLessons = JSON.parse(cached);
      }
    } catch (_) {}
    console.warn("Using cached lessons or error:", err);
  }

  if (allLessons && allLessons.length > 0) {
    const totalCount = allLessons.length;
    const chaptersCount = new Set(allLessons.map(l => l.chapter)).size;

    const statLessons = document.getElementById('stat-lessons-count');
    if (statLessons) statLessons.innerText = totalCount;

    const statChapters = document.getElementById('stat-chapters-count');
    if (statChapters) statChapters.innerText = chaptersCount;

    const sidebarCounter = document.getElementById('sidebar-counter');
    if (sidebarCounter) sidebarCounter.innerText = totalCount + ' שלבים';

    updateProgress();
    renderSidebar();
  }
}

// Setup editor event listeners and bootstrap
document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  initApp();

  // Check if app is already running in standalone PWA mode
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
      btn.innerHTML = '<span>✅</span><span>האייקון מותקן</span>';
      btn.classList.add('installed');
    }
  }

  const codeEditor = document.getElementById('code-editor');
  if (codeEditor) {
    // Tab, Ctrl+Enter, and Hebrew quote BiDi stabilization
    codeEditor.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runCode();
      } else if (e.key === '"' || e.key === "'") {
        // When typing a closing quote after Hebrew text or Hebrew punctuation, append \u200E
        // This keeps quotes, commas, and parentheses in proper visual order
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const before = this.value.substring(0, start);
        const lastChar = before.slice(-1);
        if (/[\u0590-\u05FF:!?.,]/.test(lastChar)) {
          e.preventDefault();
          const quote = e.key;
          this.value = this.value.substring(0, start) + quote + '\u200E' + this.value.substring(end);
          this.selectionStart = this.selectionEnd = start + 2;
        }
      } else if (e.key === 'Backspace') {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        if (start === end && start > 0) {
          if (this.value[start - 1] === '\u200E') {
            e.preventDefault();
            this.value = this.value.substring(0, start - 2) + this.value.substring(end);
            this.selectionStart = this.selectionEnd = Math.max(0, start - 2);
          }
        }
      }
    });

    // Paste handling - stabilize BiDi on paste
    codeEditor.addEventListener('paste', function() {
      setTimeout(() => {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = fixBidiForDisplay(this.value);
        this.selectionStart = start;
        this.selectionEnd = end;
      }, 0);
    });

    // Auto-save code draft on typing (clean bidi control chars from stored draft)
    let autoSaveTimer = null;
    codeEditor.addEventListener('input', function() {
      if (!currentLesson) return;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        saveCodeDraft(currentLesson.id, stripBidi(this.value));
      }, 400);
    });
  }
});
