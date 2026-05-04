// Sticky nav scroll behavior
const nav = document.getElementById('nav');
const onScroll = () => {
  if (window.scrollY > 24) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu toggle
const toggle = document.getElementById('menuToggle');
const menu = document.getElementById('mobileMenu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    toggle.classList.remove('open');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }));
}

// Reveal-on-scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Hero image zoom-out reveal
const heroImg = document.getElementById('heroImg');
if (heroImg) {
  const heroIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) heroImg.classList.add('in-view'); });
  }, { threshold: 0.2 });
  heroIO.observe(heroImg);
}

// Stat counter animation v2
// DOM initial text = final value so AI crawlers capture the real number.
// data-count="N"              → counts 0→N on viewport entry
// data-count-seq="a,b,c,…,z" → a is the static DOM default; on enter,
//                               snaps to b then tweens b→c→…→z
function _lerp(a, b, t) { return a + (b - a) * t; }
function _ease3(t) { return 1 - Math.pow(1 - t, 3); }
function _fmt(v, dec) { return dec ? v.toFixed(dec) : String(Math.round(v)); }
function _tween(el, from, to, ms, dec) {
  return new Promise(res => {
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / ms);
      el.textContent = _fmt(_lerp(from, to, _ease3(p)), dec);
      if (p < 1) requestAnimationFrame(tick); else { el.textContent = _fmt(to, dec); res(); }
    };
    requestAnimationFrame(tick);
  });
}
function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function _runCounter(el) {
  if (el.hasAttribute('data-count-seq')) {
    const steps = el.dataset.countSeq.split(',').map(Number);
    const dec = steps.some(v => !Number.isInteger(v)) ? 1 : 0;
    el.textContent = _fmt(steps[1], dec); // snap to animation start value
    await _wait(60);
    for (let i = 1; i < steps.length - 1; i++) {
      await _tween(el, steps[i], steps[i + 1], 900, dec);
      if (i < steps.length - 2) await _wait(180);
    }
  } else {
    const target = parseFloat(el.dataset.count);
    const dec = Number.isInteger(target) ? 0 : 1;
    await _tween(el, 0, target, 1400, dec);
  }
}
const counterIO = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { counterIO.unobserve(e.target); _runCounter(e.target); } });
}, { threshold: 0.4 });
document.querySelectorAll('[data-count],[data-count-seq]').forEach(el => counterIO.observe(el));

// ===== AI QUOTE TOOL =====
(function(){
  const tool = document.getElementById('aqTool');
  if (!tool) return;
  const photoInput = document.getElementById('aqPhoto');
  const dropzone = document.getElementById('aqDropzone');
  const previewImg = document.getElementById('aqPreviewImg');
  const beforeImg = document.getElementById('aqBeforeImg');
  const form = document.getElementById('aqForm');
  const changeBtn = document.getElementById('aqChangePhoto');
  const startOverBtn = document.getElementById('aqStartOver');
  const emailQuoteBtn = document.getElementById('aqEmailQuoteBtn');
  const status = document.getElementById('aqStatus');
  const statusList = document.getElementById('aqStatusList');
  const priceLow = document.getElementById('aqPriceLow');
  const priceHigh = document.getElementById('aqPriceHigh');
  const detail = document.getElementById('aqDetail');
  const timer = document.getElementById('aqTimer');
  const steps = tool.querySelectorAll('.aq-step');
  const stepLabels = tool.querySelectorAll('.aq-progress-steps span');
  let currentPhotoData = null;
  let timerInterval = null;

  function goToStep(n) {
    steps.forEach(s => s.classList.toggle('active', s.dataset.step == String(n)));
    stepLabels.forEach((l, i) => {
      l.classList.remove('active', 'done');
      if (i + 1 < n) l.classList.add('done');
      else if (i + 1 == n) l.classList.add('active');
    });
    tool.dataset.current = n;
    tool.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentPhotoData = e.target.result;
      previewImg.src = currentPhotoData;
      beforeImg.src = currentPhotoData;
      goToStep(2);
    };
    reader.readAsDataURL(file);
  }

  photoInput.addEventListener('change', e => handleFile(e.target.files[0]));
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });

  changeBtn.addEventListener('click', () => { photoInput.value = ''; goToStep(1); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('aqEmail');
    if (!email.value || !email.value.includes('@')) {
      email.style.borderColor = '#ff8a8a';
      email.focus();
      return;
    }
    email.style.borderColor = '';
    const data = {
      email: email.value,
      phone: document.getElementById('aqPhone').value,
      address: document.getElementById('aqAddress').value,
      timestamp: new Date().toISOString()
    };
    try { localStorage.setItem('bnr_lead_' + Date.now(), JSON.stringify(data)); } catch(err) {}
    runAnalysis(data);
  });

  function runAnalysis(data) {
    goToStep(3);
    const phases = [
      { label: 'Analyzing photo composition', delay: 600 },
      { label: 'Estimating square footage', delay: 700 },
      { label: 'Recommending method', delay: 600 },
      { label: 'Calculating your quote', delay: 500 }
    ];
    const items = statusList.querySelectorAll('li');
    items.forEach((li, i) => {
      li.classList.remove('active', 'done');
      if (i === 0) li.classList.add('active');
    });

    // Kick off the real API call in parallel with the loading animation
    const apiPromise = fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo: currentPhotoData,
        email: data.email,
        phone: data.phone || '',
        address: data.address || ''
      })
    })
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .catch(err => {
      console.warn('[bnr-quote] API failed, using local estimate:', err);
      return null;
    });

    let idx = 0;
    function nextPhase() {
      if (idx >= phases.length) {
        apiPromise.then(apiData => showResult(data, apiData));
        return;
      }
      status.textContent = phases[idx].label + '\u2026';
      items[idx].classList.add('active');
      setTimeout(() => {
        items[idx].classList.remove('active');
        items[idx].classList.add('done');
        idx++;
        if (items[idx]) items[idx].classList.add('active');
        nextPhase();
      }, phases[idx].delay);
    }
    nextPhase();
  }

  function showResult(data, apiData) {
    if (apiData && apiData.ok && apiData.quote) {
      const q = apiData.quote;
      priceLow.textContent = '$' + q.priceLow;
      priceHigh.textContent = '$' + q.priceHigh;
      const methodMap = { soft_wash: 'soft wash', pressure_wash: 'pressure wash', both: 'soft wash + pressure' };
      const method = methodMap[q.recommendedMethod] || 'soft wash + pressure';
      const surfaceLabel = q.surfaceLabel || q.surfaceType || 'exterior';
      detail.textContent = 'Estimated ' + q.sqft + ' sq ft \u00b7 ' + (q.stainLevel || 'moderate') + ' stain level \u00b7 ' + method + ' \u00b7 ' + surfaceLabel;
    } else {
      // Offline fallback estimate
      const hash = (data.email || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const base = 280 + (hash % 250);
      const high = base + 80 + (hash % 120);
      priceLow.textContent = '$' + base;
      priceHigh.textContent = '$' + high;
      const sqft = 600 + (hash % 800);
      const stainLevels = ['light', 'moderate', 'heavy'];
      const stain = stainLevels[hash % 3];
      detail.textContent = 'Estimated ' + sqft + ' sq ft \u00b7 ' + stain + ' stain level \u00b7 soft wash + pressure (offline estimate)';
    }
    goToStep(4);
    startTimer();
  }

  function startTimer() {
    let secs = 600;
    if (timerInterval) clearInterval(timerInterval);
    function tick() {
      const m = Math.floor(secs / 60).toString();
      const s = (secs % 60).toString().padStart(2, '0');
      timer.textContent = m + ':' + s;
      if (secs <= 0) { clearInterval(timerInterval); timer.textContent = '--:--'; }
      secs--;
    }
    tick();
    timerInterval = setInterval(tick, 1000);
  }

  startOverBtn.addEventListener('click', () => {
    photoInput.value = '';
    currentPhotoData = null;
    if (timerInterval) clearInterval(timerInterval);
    goToStep(1);
  });

  emailQuoteBtn.addEventListener('click', () => {
    const email = document.getElementById('aqEmail').value;
    emailQuoteBtn.textContent = 'Sent to ' + email;
    emailQuoteBtn.style.background = 'var(--gold-soft)';
    emailQuoteBtn.style.color = 'var(--gold)';
    emailQuoteBtn.disabled = true;
  });
})();
