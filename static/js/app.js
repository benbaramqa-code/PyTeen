// ================================================================
// PyTeen - Application Bootstrap & Event Listeners
// ================================================================

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
        const response = await fetch('/api/lessons');
        allLessons = await response.json();

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
      } catch (err) {
        console.error("Failed to fetch lessons", err);
      }
    }


// Setup editor event listeners and bootstrap
document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  initApp();

  const codeEditor = document.getElementById('code-editor');
  if (codeEditor) {
    // Tab and Ctrl+Enter handling
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
      }
    });

    // Auto-save code draft on typing
    let autoSaveTimer = null;
    codeEditor.addEventListener('input', function() {
      if (!currentLesson) return;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        saveCodeDraft(currentLesson.id, this.value);
      }, 400);
    });
  }
});
