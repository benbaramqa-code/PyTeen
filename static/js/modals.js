// ================================================================
// PyTeen - Modals, Gemini Assistant & Certificates
// ================================================================


    async function copyGeminiPrompt() {
      const text = document.getElementById('gemini-prompt-text').value;
      if (!text) return;
      const btnText = document.getElementById('copy-btn-text');

      try {
        await navigator.clipboard.writeText(text);
        if (btnText) btnText.innerText = '✔️ הועתק!';
        setTimeout(() => {
          if (btnText) btnText.innerText = 'העתק פרומפט';
        }, 2500);
      } catch (err) {
        const ta = document.getElementById('gemini-prompt-text');
        ta.select();
        document.execCommand('copy');
        if (btnText) btnText.innerText = '✔️ הועתק!';
        setTimeout(() => {
          if (btnText) btnText.innerText = 'העתק פרומפט';
        }, 2500);
      }
    }

    async function copyAndOpenGemini() {
      await copyGeminiPrompt();
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
    }

    // --- Gemini Compact Assistant & Info Modal ---
    function togglePromptPreview() {
      const wrapper = document.getElementById('gemini-prompt-wrapper');
      const btnText = document.getElementById('toggle-prompt-text');
      if (!wrapper) return;
      if (wrapper.style.display === 'none' || wrapper.style.display === '') {
        wrapper.style.display = 'flex';
        if (btnText) btnText.innerText = 'הסתר פרומפט';
      } else {
        wrapper.style.display = 'none';
        if (btnText) btnText.innerText = 'הצג פרומפט';
      }
    }

    function openGeminiInfoModal() {
      const modal = document.getElementById('gemini-info-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeGeminiInfoModal(event) {
      if (!event || event.target.id === 'gemini-info-modal' || event.target.className === 'guide-close-btn') {
        const modal = document.getElementById('gemini-info-modal');
        if (modal) modal.style.display = 'none';
      }
    }

    function openGuideModal() {
      document.getElementById('guide-modal').style.display = 'flex';
    }

    function closeGuideModal(event) {
      if (!event || event.target.id === 'guide-modal' || event.target.className === 'guide-close-btn') {
        document.getElementById('guide-modal').style.display = 'none';
      }
    }

    // ================================================================
    // FEATURE: Certificate of Completion
    // ================================================================

    const totalLessons = 42;

    function openCertModal() {
      const overlay = document.getElementById('cert-overlay');
      if (overlay) {
        overlay.classList.add('active');
        const dateEl = document.getElementById('cert-preview-date');
        if (dateEl) dateEl.innerText = 'תאריך השלמה: ' + getFormattedDate();
        updateCertPreview();
        const nameInput = document.getElementById('cert-name-input');
        if (nameInput) setTimeout(() => nameInput.focus(), 300);
      }
      launchConfetti();
    }

    function closeCertModal(event) {
      if (!event || event.target.id === 'cert-overlay' || event.target.className === 'cert-close-btn') {
        const overlay = document.getElementById('cert-overlay');
        if (overlay) overlay.classList.remove('active');
      }
    }

    function updateCertPreview() {
      const nameInput = document.getElementById('cert-name-input');
      const previewName = document.getElementById('cert-preview-name');
      if (nameInput && previewName) {
        previewName.innerText = nameInput.value.trim() || 'שמך יופיע כאן';
      }
    }

    function getFormattedDate() {
      return new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function downloadCertificate() {
      const nameInput = document.getElementById('cert-name-input');
      const studentName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : 'בוגר/ת הקורס';
      const dateStr = getFormattedDate();

      const W = 900, H = 630;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0f172a'); bgGrad.addColorStop(0.5, '#1a2540'); bgGrad.addColorStop(1, '#0d1b32');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

      // Color bars
      const topGrad = ctx.createLinearGradient(0, 0, W, 0);
      topGrad.addColorStop(0, '#38bdf8'); topGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6);

      // Border
      ctx.strokeStyle = 'rgba(56,189,248,0.25)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(24, 22, W - 48, H - 44);

      ctx.textAlign = 'center'; ctx.direction = 'rtl';

      // Logo
      ctx.font = 'bold 28px Arial, sans-serif'; ctx.fillStyle = '#38bdf8';
      ctx.fillText('🐍 פייתון בקלות', W / 2, 85);

      // Title
      ctx.font = 'bold 40px Arial, sans-serif'; ctx.fillStyle = '#f8fafc';
      ctx.fillText('תעודת סיום קורס', W / 2, 165);

      ctx.font = '18px Arial, sans-serif'; ctx.fillStyle = '#94a3b8';
      ctx.fillText('זה מאשר בגאווה כי', W / 2, 210);

      // Student name
      const nameGrad = ctx.createLinearGradient(0, 0, W, 0);
      nameGrad.addColorStop(0, '#a855f7'); nameGrad.addColorStop(1, '#38bdf8');
      ctx.font = 'bold 46px Arial, sans-serif'; ctx.fillStyle = nameGrad;
      ctx.fillText(studentName, W / 2, 278);

      // Underline
      const nw = Math.min(ctx.measureText(studentName).width + 40, W * 0.7);
      const nlg = ctx.createLinearGradient((W - nw) / 2, 0, (W + nw) / 2, 0);
      nlg.addColorStop(0, '#a855f7'); nlg.addColorStop(1, '#38bdf8');
      ctx.strokeStyle = nlg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo((W - nw) / 2, 290); ctx.lineTo((W + nw) / 2, 290); ctx.stroke();

      ctx.font = '20px Arial, sans-serif'; ctx.fillStyle = '#cbd5e1';
      ctx.fillText('השלים/ה בהצלחה את כל שלבי הקורס:', W / 2, 340);

      // Details box
      ctx.fillStyle = 'rgba(56,189,248,0.07)';
      const bx = W * 0.15, bw = W * 0.7;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, 360, bw, 80, 12); else ctx.rect(bx, 360, bw, 80);
      ctx.fill(); ctx.strokeStyle = 'rgba(56,189,248,0.2)'; ctx.lineWidth = 1; ctx.stroke();

      ctx.font = 'bold 22px Arial, sans-serif'; ctx.fillStyle = '#38bdf8';
      ctx.fillText('42 שלבים ב-14 פרקים', W / 2, 396);
      ctx.font = '16px Arial, sans-serif'; ctx.fillStyle = '#94a3b8';
      ctx.fillText('Python — מהתחלה ועד תכנות מתקדם', W / 2, 424);

      ctx.font = 'bold 18px Arial, sans-serif'; ctx.fillStyle = '#22c55e';
      ctx.fillText('🏆 כל הכבוד! ההתמדה, הסקרנות והעבודה הקשה שלך הניבו פרי.', W / 2, 490);
      ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = '#94a3b8';
      ctx.fillText('את/ה מוכן/ה לצאת לפרויקטים עצמאיים ולהמשיך לגדול כמתכנת/ת!', W / 2, 515);
      ctx.font = '14px Arial, sans-serif'; ctx.fillStyle = '#64748b';
      ctx.fillText('תאריך השלמה: ' + dateStr, W / 2, 575);

      // Watermark
      ctx.globalAlpha = 0.07; ctx.font = '180px Arial'; ctx.fillStyle = '#ffffff';
      ctx.fillText('🏆', W / 2, H / 2 + 80); ctx.globalAlpha = 1;

      const link = document.createElement('a');
      link.download = 'תעודת-סיום-פייתון-בקלות.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }


    // FEATURE: Pure-JS Confetti
    // ================================================================

    function launchConfetti() {
      const container = document.getElementById('confetti-container');
      if (!container) return;
      container.innerHTML = '';
      const colors = ['#38bdf8','#a855f7','#22c55e','#facc15','#f87171','#fb923c','#34d399'];
      const shapes = ['2px','50%','0%'];
      for (let i = 0; i < 120; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 8 + Math.random() * 8;
        el.style.cssText = `left:${Math.random()*100}%;width:${size}px;height:${size}px;background:${color};border-radius:${shapes[Math.floor(Math.random()*3)]};animation-duration:${2.2+Math.random()*2.5}s;animation-delay:${Math.random()*1.8}s;`;
        container.appendChild(el);
      }
      setTimeout(() => { container.innerHTML = ''; }, 6000);
    }

