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
    el.textContent = _fmt(steps[1], dec);
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
  const photoCamera = document.getElementById('aqPhotoCamera');
  const photoUpload = document.getElementById('aqPhotoUpload');
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

  // Downscale a data URI image to fit Vercel's 4.5MB function payload limit.
  // Returns Promise<dataUri> (downscaled JPEG) or original on failure.
  function downscaleDataUri(dataUri, maxDim, quality) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const w0 = img.naturalWidth, h0 = img.naturalHeight;
            const ratio = Math.min(1, maxDim / Math.max(w0, h0));
            const w = Math.max(1, Math.round(w0 * ratio));
            const h = Math.max(1, Math.round(h0 * ratio));
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', quality));
          } catch (e) { resolve(dataUri); }
        };
        img.onerror = () => resolve(dataUri);
        img.src = dataUri;
      } catch (e) { resolve(dataUri); }
    });
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const orig = e.target.result;
      // Show full-quality preview and "Now" image to the user...
      previewImg.src = orig;
      beforeImg.src = orig;
      // ...but downscale before POSTing to the AI quote API (Vercel function 4.5MB cap).
      downscaleDataUri(orig, 1600, 0.82).then((scaled) => {
        currentPhotoData = scaled || orig;
        goToStep(2);
      });
    };
    reader.readAsDataURL(file);
  }

  if (photoCamera) photoCamera.addEventListener('change', e => handleFile(e.target.files[0]));
  if (photoUpload) photoUpload.addEventListener('change', e => handleFile(e.target.files[0]));
  if (dropzone) {
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFile(e.dataTransfer.files[0]);
    });
    document.addEventListener('paste', e => {
      const tool = document.getElementById('aqTool');
      if (!tool || tool.dataset.current !== '1') return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          handleFile(items[i].getAsFile());
          break;
        }
      }
    });
  }

  if (changeBtn) changeBtn.addEventListener('click', () => {
    if (photoCamera) photoCamera.value = '';
    if (photoUpload) photoUpload.value = '';
    goToStep(1);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('aqEmail');
    if (!email.value || !email.value.includes('@')) {
      email.style.borderColor = '#ff8a8a';
      email.focus();
      return;
    }
    email.style.borderColor = '';
    const isCommercial = (document.getElementById('instant-quote') || {}).getAttribute && document.getElementById('instant-quote').getAttribute('data-quote-type') === 'commercial';
    const data = {
      email: email.value,
      phone: document.getElementById('aqPhone').value,
      address: (document.getElementById('aqAddress') || {}).value || (document.getElementById('aqAddressC') || {}).value || '',
      timestamp: new Date().toISOString(),
      type: isCommercial ? 'commercial' : 'residential'
    };
    if (isCommercial) {
      data.company = (document.getElementById('aqCompany') || {}).value || '';
      data.propertyType = (document.getElementById('aqPropertyType') || {}).value || '';
      data.sqft = (document.getElementById('aqSqft') || {}).value || '';
      data.frequency = (document.getElementById('aqFrequency') || {}).value || '';
    }
    try { localStorage.setItem('bnr_lead_' + Date.now(), JSON.stringify(data)); } catch(err) {}
    runAnalysis(data);
  });

  function runAnalysis(data) {
    goToStep(3);
    const phases = [
      { label: 'Analyzing photo composition', delay: 600 },
      { label: 'Estimating square footage', delay: 700 },
      { label: 'Recommending method', delay: 600 },
      { label: data.type === 'commercial' ? 'Calculating contract rate' : 'Calculating your quote', delay: 500 }
    ];
    const items = statusList.querySelectorAll('li');
    items.forEach((li, i) => {
      li.classList.remove('active', 'done');
      if (i === 0) li.classList.add('active');
    });

    const apiPromise = fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo: currentPhotoData,
        email: data.email,
        phone: data.phone || '',
        address: data.address || '',
        type: data.type || 'residential',
        company: data.company,
        propertyType: data.propertyType,
        sqft: data.sqft,
        frequency: data.frequency
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
      // Real AI-generated after-image (falls back to static SVG if generation failed)
      if (apiData.afterImage) {
        const afterImg = document.getElementById('aqAfterImg');
        if (afterImg) afterImg.src = apiData.afterImage;
      }
    } else {
      const hash = (data.email || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      let base, high;
      if (data.type === 'commercial') {
        const sqft = parseInt(String(data.sqft || '').replace(/[^0-9]/g, ''), 10) || 3000;
        const perVisit = Math.max(450, Math.round(sqft * 0.16));
        const freqMul = { weekly: 0.6, monthly: 0.75, quarterly: 0.85, biannual: 0.9, onetime: 1 }[data.frequency] || 0.75;
        base = Math.round(perVisit * freqMul / 5) * 5;
        high = Math.round(perVisit * freqMul * 1.25 / 5) * 5;
        detail.textContent = `Estimated ${sqft.toLocaleString()} sq ft \u00b7 ${data.frequency || 'monthly'} contract \u00b7 per-visit rate (offline estimate)`;
      } else {
        base = 280 + (hash % 250);
        high = base + 80 + (hash % 120);
        const sqft = 600 + (hash % 800);
        const stainLevels = ['light', 'moderate', 'heavy'];
        const stain = stainLevels[hash % 3];
        detail.textContent = 'Estimated ' + sqft + ' sq ft \u00b7 ' + stain + ' stain level \u00b7 soft wash + pressure (offline estimate)';
      }
      priceLow.textContent = '$' + base;
      priceHigh.textContent = '$' + high;
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

  if (startOverBtn) startOverBtn.addEventListener('click', () => {
    if (photoCamera) photoCamera.value = '';
    if (photoUpload) photoUpload.value = '';
    currentPhotoData = null;
    if (timerInterval) clearInterval(timerInterval);
    goToStep(1);
  });

  if (emailQuoteBtn) emailQuoteBtn.addEventListener('click', () => {
    const email = document.getElementById('aqEmail').value;
    emailQuoteBtn.textContent = 'Sent to ' + email;
    emailQuoteBtn.style.background = 'var(--gold-soft)';
    emailQuoteBtn.style.color = 'var(--gold)';
    emailQuoteBtn.disabled = true;
  });
})();

// ===== QUOTE MODAL: scroll first, modal on subsequent clicks =====
(function(){
  const triggers = document.querySelectorAll('[data-quote-trigger]');
  const modal = document.getElementById('quoteModal');
  const modalBody = document.getElementById('quoteModalBody');
  if (!triggers.length || !modal || !modalBody) return;
  const aqSection = document.getElementById('instant-quote');
  const aqTool = document.getElementById('aqTool');
  if (!aqSection || !aqTool) return;

  const STORAGE_KEY = 'bnr_quote_seen';
  let modalActive = false;
  let savedScrollY = 0;
  const toolHomeParent = aqTool.parentNode;

  function setQuoteType(type) {
    const isCommercial = type === 'commercial';
    if (isCommercial) {
      aqSection.setAttribute('data-quote-type', 'commercial');
      modal.setAttribute('data-quote-type', 'commercial');
    } else {
      aqSection.removeAttribute('data-quote-type');
      modal.removeAttribute('data-quote-type');
    }
    document.querySelectorAll('#aqSample [data-residential]').forEach(el => el.hidden = isCommercial);
    document.querySelectorAll('#aqSample [data-commercial]').forEach(el => el.hidden = !isCommercial);
    const aqHead = document.querySelector('#aqTool .aq-head, .aq-head');
    if (aqHead) {
      const h2 = aqHead.querySelector('h2');
      const lede = aqHead.querySelector('.lede');
      const eyebrow = aqHead.querySelector('.eyebrow');
      if (isCommercial) {
        if (h2) h2.innerHTML = 'Commercial-grade <em class="italic-disp">contract quote.</em>';
        if (lede) lede.textContent = 'Snap a photo of your storefront, parking lot, or property exterior. Tell us scope + frequency. We come back with a real contract rate (one-time or recurring) within 24 hours \u2014 no surprise change orders.';
        if (eyebrow) eyebrow.innerHTML = '<span class="dot"></span>Powered by AI \u00b7 Commercial contract quote';
      } else {
        if (h2) h2.innerHTML = 'Skip the call. <em class="italic-disp">Get an instant quote.</em>';
        if (lede) lede.textContent = 'Snap a photo of your driveway, home, or storefront. Our AI analyzes it, estimates square footage, picks the right cleaning method, and gives you a real price range \u2014 no more "starting at" pricing.';
        if (eyebrow) eyebrow.innerHTML = '<span class="dot"></span>Powered by AI \u00b7 60-second quote';
      }
    }
    const submit = document.querySelector('.aq-submit');
    if (submit) {
      const label = submit.firstChild;
      if (label && label.nodeType === 3) label.nodeValue = isCommercial ? 'Get My Contract Rate' : 'Get My Quote';
    }
  }

  function openModal(type) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    setQuoteType(type);
    modalBody.appendChild(aqTool);
    modal.removeAttribute('hidden');
    modal.setAttribute('data-open', 'true');
    document.body.style.top = `-${savedScrollY}px`;
    document.body.classList.add('modal-open');
    modalActive = true;
    setTimeout(() => {
      const closeBtn = modal.querySelector('.quote-modal-close');
      if (closeBtn) closeBtn.focus();
    }, 80);
  }

  function closeModal() {
    if (!modalActive) return;
    if (toolHomeParent && aqTool) toolHomeParent.appendChild(aqTool);
    modal.setAttribute('data-open', 'false');
    setTimeout(() => modal.setAttribute('hidden', ''), 240);
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
    modalActive = false;
  }

  function scrollToSection(type) {
    setQuoteType(type);
    const headerOffset = 80;
    const top = aqSection.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function handleTrigger(e, trigger) {
    e.preventDefault();
    const type = trigger.getAttribute('data-quote-type') || 'residential';
    let seen = false;
    try { seen = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch(_) {}
    if (modalActive) {
      setQuoteType(type);
      return;
    }
    if (!seen) {
      scrollToSection(type);
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch(_) {}
    } else {
      openModal(type);
    }
  }

  triggers.forEach(t => t.addEventListener('click', e => handleTrigger(e, t)));
  modal.querySelectorAll('[data-quote-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();
