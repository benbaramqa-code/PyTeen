// ================================================================
// PyTeen - Lessons, Navigation, Filters & Sidebar
// ================================================================

    // קביעת רמת השיעור: 'יסודות' או 'מתקדם'
    function getLessonLevel(lesson) {
      if (lesson.level) {
        return (lesson.level === 'advanced' || lesson.level === 'מתקדם') ? 'מתקדם' : 'יסודות';
      }
      if (typeof lesson.is_advanced === 'boolean') {
        return lesson.is_advanced ? 'מתקדם' : 'יסודות';
      }

      // בדיקה לפי מספר פרק אם מופיע "פרק X"
      const chMatch = (lesson.chapter || '').match(/פרק\s*(\d+)/);
      if (chMatch) {
        const chNum = parseInt(chMatch[1], 10);
        if (chNum >= 6) return 'מתקדם';
        if (chNum <= 5) return 'יסודות';
      }

      // בדיקת מילות מפתח מובהקות של חומר מתקדם
      const advKeywords = ['מתקדם', 'מילון', 'פונקצי', 'אתגר', 'אלגוריתם', 'מודולר', 'מחלק', 'עצמים', 'oop', 'קובץ', 'קבצים', 'חריג', 'json', 'api'];
      const fullText = ((lesson.chapter || '') + ' ' + (lesson.title || '')).toLowerCase();
      if (advKeywords.some(kw => fullText.includes(kw))) {
        return 'מתקדם';
      }

      if (lesson.id >= 18) {
        return 'מתקדם';
      }
      return 'יסודות';
    }

    function updateFilterCounts() {
      const total = allLessons.length;
      let basicsCount = 0;
      let advancedCount = 0;

      allLessons.forEach(l => {
        if (getLessonLevel(l) === 'מתקדם') {
          advancedCount++;
        } else {
          basicsCount++;
        }
      });

      const countAll = document.getElementById('count-all');
      const countBasics = document.getElementById('count-basics');
      const countAdvanced = document.getElementById('count-advanced');

      if (countAll) countAll.innerText = total;
      if (countBasics) countBasics.innerText = basicsCount;
      if (countAdvanced) countAdvanced.innerText = advancedCount;
    }

    function setCategoryFilter(filter) {
      currentCategoryFilter = filter;
      updateTabButtons();
      renderSidebar();
    }

    function updateTabButtons() {
      ['all', 'basics', 'advanced'].forEach(f => {
        const btn = document.getElementById('tab-' + f);
        if (btn) {
          if (f === currentCategoryFilter) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });
    }

    function onSearchInput(val) {
      searchQuery = (val || '').trim().toLowerCase();
      const clearBtn = document.getElementById('clear-search-btn');
      if (clearBtn) {
        clearBtn.style.display = searchQuery ? 'block' : 'none';
      }
      renderSidebar();
    }

    function clearSearch() {
      searchQuery = '';
      const input = document.getElementById('lesson-search');
      if (input) input.value = '';
      const clearBtn = document.getElementById('clear-search-btn');
      if (clearBtn) clearBtn.style.display = 'none';
      renderSidebar();
    }

    function toggleChapter(chapterName) {
      if (collapsedChapters.has(chapterName)) {
        collapsedChapters.delete(chapterName);
      } else {
        collapsedChapters.add(chapterName);
      }
      renderSidebar();
    }

    function toggleAllChapters(collapse) {
      if (collapse) {
        allLessons.forEach(l => collapsedChapters.add(l.chapter));
        // תמיד נשאיר את הפרק של השיעור הנוכחי פתוח
        if (currentLesson) {
          collapsedChapters.delete(currentLesson.chapter);
        }
      } else {
        collapsedChapters.clear();
      }
      renderSidebar();
    }


    function renderSidebar() {
      const menu = document.getElementById('lessons-menu');
      if (!menu) return;
      menu.innerHTML = '';

      updateFilterCounts();

      // קיבוץ לפי פרקים
      const chapters = {};
      allLessons.forEach(l => {
        if (!chapters[l.chapter]) chapters[l.chapter] = [];
        chapters[l.chapter].push(l);
      });

      let totalVisibleLessons = 0;

      for (const [chapterName, lessons] of Object.entries(chapters)) {
        // סינון השיעורים בפרק לפי טאב סינון וחיפוש
        const matchingLessons = lessons.filter(l => {
          const level = getLessonLevel(l);
          if (currentCategoryFilter === 'basics' && level !== 'יסודות') return false;
          if (currentCategoryFilter === 'advanced' && level !== 'מתקדם') return false;

          if (searchQuery) {
            const queryMatches = (l.title || '').toLowerCase().includes(searchQuery) ||
                                 (l.explanation || '').toLowerCase().includes(searchQuery) ||
                                 (l.chapter || '').toLowerCase().includes(searchQuery) ||
                                 ('שלב ' + l.id).includes(searchQuery);
            if (!queryMatches) return false;
          }
          return true;
        });

        if (matchingLessons.length === 0) {
          continue;
        }

        totalVisibleLessons += matchingLessons.length;

        const completedInChapter = lessons.filter(l => completedLessons.has(l.id)).length;
        const isChapterDone = (completedInChapter === lessons.length && lessons.length > 0);

        // אם מתבצע חיפוש, פותחים את הפרק כדי להציג את התוצאות
        const isCollapsed = searchQuery ? false : collapsedChapters.has(chapterName);

        const group = document.createElement('div');
        group.className = 'chapter-group';

        // כותרת הפרק (Accordion Header)
        const header = document.createElement('div');
        header.className = 'chapter-header' + (isCollapsed ? ' collapsed' : '');
        header.title = isCollapsed ? 'לחץ לפתיחת הפרק' : 'לחץ לכיווץ הפרק';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'chapter-title-wrap';

        const chevron = document.createElement('span');
        chevron.className = 'chapter-chevron' + (isCollapsed ? ' collapsed' : '');
        chevron.innerText = isCollapsed ? '◀' : '▼';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'chapter-name';
        nameSpan.innerText = chapterName;

        titleWrap.appendChild(chevron);
        titleWrap.appendChild(nameSpan);

        const statsSpan = document.createElement('span');
        statsSpan.className = 'chapter-stats' + (isChapterDone ? ' done' : '');
        statsSpan.innerText = isChapterDone ? ('✓ ' + completedInChapter + '/' + lessons.length) : (completedInChapter + '/' + lessons.length);

        header.appendChild(titleWrap);
        header.appendChild(statsSpan);

        header.onclick = () => toggleChapter(chapterName);
        group.appendChild(header);

        // גוף הפרק (Accordion Body)
        const body = document.createElement('div');
        body.className = 'chapter-body' + (isCollapsed ? ' collapsed' : '');

        matchingLessons.forEach(l => {
          const item = document.createElement('div');
          const isCurrent = currentLesson && currentLesson.id === l.id;
          const isDone = completedLessons.has(l.id);
          const level = getLessonLevel(l);
          const levelClass = (level === 'מתקדם') ? 'advanced' : 'basics';

          item.className = 'lesson-item' + (isCurrent ? ' active' : '') + (isDone ? ' completed' : '');
          item.title = l.title;

          const leftWrap = document.createElement('div');
          leftWrap.className = 'lesson-info-left';

          const icon = document.createElement('span');
          icon.className = 'status-icon';
          icon.innerText = isDone ? '✅' : '⚪';

          const titleSpan = document.createElement('span');
          titleSpan.className = 'lesson-title-text';
          titleSpan.innerText = l.title;

          leftWrap.appendChild(icon);
          leftWrap.appendChild(titleSpan);

          const tag = document.createElement('span');
          tag.className = 'level-tag tag-' + levelClass;
          tag.innerText = level;

          item.appendChild(leftWrap);
          item.appendChild(tag);

          item.onclick = () => selectLesson(l.id);
          body.appendChild(item);
        });

        group.appendChild(body);
        menu.appendChild(group);
      }

      if (totalVisibleLessons === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-search-msg';
        emptyMsg.innerText = '🔍 לא נמצאו שלבים התואמים לסינון.';
        menu.appendChild(emptyMsg);
      }
    }


    function showHome() {
      document.getElementById('home-view').style.display = 'flex';
      document.getElementById('course-view').style.display = 'none';
    }

    function startCourse() {
      document.getElementById('home-view').style.display = 'none';
      document.getElementById('course-view').style.display = 'flex';

      let targetLessonId = null;
      try {
        const lastActive = parseInt(localStorage.getItem('py_bekalut_active_lesson'), 10);
        if (lastActive && allLessons.some(l => l.id === lastActive)) {
          targetLessonId = lastActive;
        }
      } catch (e) {}

      if (!targetLessonId) {
        const firstUncompleted = allLessons.find(l => !completedLessons.has(l.id));
        targetLessonId = firstUncompleted ? firstUncompleted.id : (allLessons[0] ? allLessons[0].id : 1);
      }

      selectLesson(targetLessonId);
    }

    // יצירת פרומפט גיבוי מלא ל-Gemini אם לא סופק מהשרת
    function generateFallbackGeminiPrompt(lesson, lessonsList) {
      const total = lessonsList.length || 42;
      const percent = Math.round((lesson.id / total) * 100);

      let knownSkills = "";
      if (lesson.id === 1) {
        knownSkills = "• התלמיד בנקודת ההתחלה המוחלטת (שיעור ראשון במסלול, ללא כל ידע קודם בתכנות או בפייתון).";
      } else {
        const prevLessons = lessonsList.filter(l => l.id < lesson.id);
        knownSkills = prevLessons.map(l => {
          const cleanTitle = (l.title || '').split(':').pop().trim();
          const whenShort = (l.when_to_use || l.when || '').split('.')[0];
          return "• שלב " + l.id + " (" + l.chapter + "): " + cleanTitle + (whenShort ? " - " + whenShort : "") + ".";
        }).join('\n');
      }

      let nextPreview = "";
      const nextL = lessonsList.find(l => l.id === lesson.id + 1);
      if (nextL) {
        nextPreview = "בשלב הבא (שלב " + nextL.id + " - " + nextL.title + "): נלמד " + (nextL.why_learn || '');
        const futureL = lessonsList.find(l => l.id === lesson.id + 2);
        if (futureL) {
          nextPreview += "\n• ובהמשך (שלב " + futureL.id + "): " + futureL.title;
        }
      } else {
        nextPreview = "זהו שלב השיא והסיום של הקורס! התלמיד מוכן כעת לפרויקטים עצמאיים ולפיתוח יישומים מלאים.";
      }

      return (
        "אתה מנטור תכנות אישי, מעודד וסבלני של תלמיד בקורס 'פייתון בקלות'.\n\n" +
        "📍 תמונת המצב המלאה של התלמיד כרגע:\n" +
        "• שלב נוכחי: שלב " + lesson.id + " מתוך " + total + " (" + lesson.chapter + " - " + lesson.title + ")\n" +
        "• התקדמות במסלול: " + percent + "% מהקורס הושלמו.\n\n" +
        "🧠 מה התלמיד כבר יודע ושולט בו עד כה:\n" +
        knownSkills + "\n\n" +
        "⚠️ הנחיה פדגוגית קריטית: התאם את ההסבר והדוגמאות שלך אך ורק לכלים שהתלמיד כבר מכיר! אין להשתמש במושגים שלא נלמדו עדיין (כגון מחלקות OOP, ספריות מורכבות או מבנים מתקדמים).\n\n" +
        "🎯 הנושא הנלמד כרגע:\n" +
        "• נושא: " + lesson.title + "\n" +
        "• למה לומדים את זה עכשיו: " + (lesson.why_learn || '') + "\n" +
        "• מתי ואיך נשתמש בזה בעולם האמיתי: " + (lesson.when_to_use || '') + "\n" +
        "• הקוד שעליו התלמיד מתרגל כעת:\n" +
        "```python\n" + (lesson.default_code || '') + "\n```\n\n" +
        "🔭 מה צפוי לתלמיד בהמשך המסלול:\n" +
        "• " + nextPreview + "\n\n" +
        "📋 בקשת התלמיד ממך כמנטור (אנא ספק תשובה ברורה בעברית):\n" +
        "1. הסבר אינטואיטיבי ולא-טכני: תן משל, אנלוגיה או דוגמה מהיומיום שמסבירה למה צריך את הכלי הזה ומתי בדיוק משתמשים בו.\n" +
        "2. הסבר טכני מותאם לרמתו: איך פייתון מריצה ומבינה את זה מאחורי הקלעים ומהם הכללים שחייבים לזכור.\n" +
        "3. 2 דוגמאות שימוש מהחיים שמשתמשות אך ורק בכלים שהוא כבר יודע + הנושא הנוכחי.\n" +
        "4. חיבור להמשך והתמדה: הסבר במשפט מעודד איך השלב הזה בונה את הגשר לשלב הבא במסע כדי לעזור לו לשמור על רצף והתמדה בלמידה!\n" +
        "5. אתגר חשיבה קטן ברמתו עם רמז כדי שיוכל לבדוק אם הבין."
      );
    }


    function selectLesson(lessonId) {
      const lesson = allLessons.find(l => l.id === lessonId);
      if (!lesson) return;

      currentLesson = lesson;

      // שמירת השלב הפעיל ב-localStorage
      try {
        localStorage.setItem('py_bekalut_active_lesson', lesson.id);
      } catch (e) {}

      // ודא שפרק השיעור פתוח באקורדיון
      collapsedChapters.delete(lesson.chapter);

      // ודא שהשיעור גלוי בטאב הסינון הפעיל
      const lessonLevel = getLessonLevel(lesson);
      if (currentCategoryFilter === 'basics' && lessonLevel !== 'יסודות') {
        currentCategoryFilter = 'all';
        updateTabButtons();
      } else if (currentCategoryFilter === 'advanced' && lessonLevel !== 'מתקדם') {
        currentCategoryFilter = 'all';
        updateTabButtons();
      }

      renderSidebar();

      // כותרת ותג שלב
      const badgeStep = document.getElementById('badge-step');
      if (badgeStep) {
        badgeStep.innerText = lesson.chapter + ' • שלב ' + lesson.id + ' (' + lessonLevel + ')';
      }

      const theoryTitle = document.getElementById('theory-title');
      if (theoryTitle) {
        theoryTitle.innerText = lesson.title;
      }

      // 1. roadmap-stage-info
      const stageInfo = document.getElementById('roadmap-stage-info');
      if (stageInfo) {
        const pct = Math.round((lesson.id / allLessons.length) * 100);
        stageInfo.innerText = 'שלב ' + lesson.id + ' מתוך ' + allLessons.length + ' (' + pct + '% מהקורס)';
      }

      // 2. roadmap-recap: מה למדנו עד כה
      const recapEl = document.getElementById('roadmap-recap');
      if (recapEl) {
        recapEl.innerText = lesson.recap || 'תחילת הדרך במסע התכנות בפייתון!';
      }

      // 3. roadmap-why: למה לומדים את זה עכשיו
      const whyEl = document.getElementById('roadmap-why');
      if (whyEl) {
        whyEl.innerText = lesson.why_learn || 'צעד חיוני להרחבת ארגז הכלים של מתכנת.';
      }

      // 4. roadmap-when: מתי ואיך נשתמש בזה בעולם האמיתי
      const whenEl = document.getElementById('roadmap-when');
      if (whenEl) {
        whenEl.innerText = lesson.when_to_use || lesson.when || 'נשתמש בכלי זה בפיתוח תוכנה מעשי, אלגוריתמים ובניית יישומים.';
      }

      // 5. roadmap-next: מה צפוי לנו בהמשך המסע
      const nextEl = document.getElementById('roadmap-next');
      if (nextEl) {
        let nextText = '';
        if (lesson.next_step) {
          nextText = lesson.next_step;
        } else if (lesson.roadmap_next) {
          nextText = lesson.roadmap_next;
        } else {
          const nextLessonObj = allLessons.find(l => l.id === lesson.id + 1);
          if (nextLessonObj) {
            const cleanTitle = nextLessonObj.title.replace(/^שלב\s*\d+\s*:\s*/, '');
            nextText = 'בשלב הבא (שלב ' + nextLessonObj.id + '): ' + cleanTitle + ' – ' + (nextLessonObj.why_learn || '');
          } else {
            nextText = 'זהו שלב השיא והסיום של הקורס! רכשת כלים מעשיים מצוינים בפייתון ואתה מוכן לפיתוח פרויקטים עצמאיים.';
          }
        }
        nextEl.innerText = nextText;
      }

      // תיאוריה, טיפ, רמז
      const theoryContent = document.getElementById('theory-content');
      if (theoryContent) theoryContent.innerText = lesson.explanation;

      const tipCard = document.getElementById('tip-card');
      if (tipCard) tipCard.innerText = lesson.tip;

      const hintCard = document.getElementById('hint-card');
      if (hintCard) {
        const hintText = lesson.hint || 'נסה לעקוב אחר ההסבר והדוגמה בשלב זה.';
        hintCard.innerHTML = `
          <div class="hint-header">
            <div class="hint-title-text">
              <span>💡</span>
              <span>רמז והכוונה לפתרון השלב</span>
            </div>
            <button class="hint-close-btn" onclick="toggleHint()" title="סגור רמז">✕</button>
          </div>
          <div class="hint-content-body" id="hint-content-text"></div>
        `;
        const bodyEl = document.getElementById('hint-content-text');
        if (bodyEl) bodyEl.textContent = hintText;
        hintCard.style.display = 'none';
      }
      const navHintBtn = document.getElementById('btn-nav-hint');
      if (navHintBtn) navHintBtn.innerHTML = '💡 רמז לפתרון';
      const editorHintBtn = document.getElementById('btn-editor-hint');
      if (editorHintBtn) editorHintBtn.innerHTML = '💡 רמז';


      // 6. gemini-prompt-text: הפרומפט המלא למנטור Gemini
      const promptText = lesson.gemini_prompt || generateFallbackGeminiPrompt(lesson, allLessons);
      const geminiPromptBox = document.getElementById('gemini-prompt-text');
      if (geminiPromptBox) {
        geminiPromptBox.value = promptText;
      }

      const copyBtnText = document.getElementById('copy-btn-text');
      if (copyBtnText) copyBtnText.innerText = 'העתק פרומפט';

      const charCountEl = document.getElementById('prompt-char-count');
      if (charCountEl) {
        charCountEl.innerText = promptText.length + ' תווים';
      }

      const geminiBadge = document.getElementById('gemini-level-badge');
      if (geminiBadge) {
        geminiBadge.innerText = 'שלב ' + lesson.id + ' • ' + lessonLevel;
      }

      // שמירה על תצוגת פרומפט מכווצת בעת מעבר בין שלבים
      const promptWrapper = document.getElementById('gemini-prompt-wrapper');
      if (promptWrapper) promptWrapper.style.display = 'none';
      const toggleBtnText = document.getElementById('toggle-prompt-text');
      if (toggleBtnText) toggleBtnText.innerText = 'הצג פרומפט';

      // במובייל: במעבר לשלב, עוברים מיד לטאב השיעור
      if (window.innerWidth <= 900) {
        switchMobileTab('theory');
      }

      // קוד ועורך: טעינת טיוטה שמורה אם קיימת, אחרת קוד ברירת מחדל
      const codeEditor = document.getElementById('code-editor');
      if (codeEditor) {
        const savedDraft = getCodeDraft(lesson.id);
        codeEditor.value = (savedDraft !== null && savedDraft !== undefined) ? savedDraft : lesson.default_code;
      }

      // איפוס מסוף
      const terminal = document.getElementById('terminal-body');
      if (terminal) {
        terminal.className = 'terminal-body';
        terminal.innerHTML = '<span class="terminal-placeholder">לחץ על "הרץ קוד ▶️" או Ctrl+Enter כדי לבדוק את התוצאה...</span>';
      }

      const banner = document.getElementById('feedback-banner');
      if (banner) banner.style.display = 'none';

      const termStatus = document.getElementById('terminal-status');
      if (termStatus) termStatus.innerText = 'מוכן להרצה';

      // כפתורי ניווט
      const btnPrev = document.getElementById('btn-prev');
      if (btnPrev) btnPrev.disabled = (lesson.id === 1);

      const btnNext = document.getElementById('btn-next-nav');
      if (btnNext) btnNext.disabled = (lesson.id === allLessons.length);

      // גלילה חלקה לשלב הפעיל בסרגל הצד
      setTimeout(() => {
        const activeItem = document.querySelector('.lesson-item.active');
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
    }

    function nextLesson() {
      if (currentLesson && currentLesson.id < allLessons.length) {
        selectLesson(currentLesson.id + 1);
      }
    }

    function prevLesson() {
      if (currentLesson && currentLesson.id > 1) {
        selectLesson(currentLesson.id - 1);
      }
    }
