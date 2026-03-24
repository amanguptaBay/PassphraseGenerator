'use strict';

let words = [];

// ── Timing display ────────────────────────────────────────────────────────
const timings = {};

function recordTiming(label, ms) {
  timings[label] = ms;
  renderTimings();
}

function renderTimings() {
  const el = document.getElementById('timing');
  if (!el) return;
  const order = ['wordlist-load', 'validation', 'generation'];
  const labels = { 'wordlist-load': 'WORDLIST LOAD', validation: 'VALIDATION', generation: 'GENERATION' };
  el.innerHTML = order
    .filter(k => timings[k] !== undefined)
    .map(k => {
      const ms = timings[k].toFixed(3);
      return `<span class="t-entry"><span class="t-label">// ${labels[k]}: </span><span class="t-value">${ms}</span><span class="t-unit">ms</span></span>`;
    })
    .join('');
}

// ── Wordlist loader ───────────────────────────────────────────────────────
async function loadWords() {
  const el = document.getElementById('status');
  const t0 = performance.now();
  try {
    const resp = await fetch('static/words.txt');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    words = text.split('\n').map(w => w.trim()).filter(Boolean);
    recordTiming('wordlist-load', performance.now() - t0);
    el.textContent = `// WORDLIST LOADED — ${words.length} WORDS READY`;
    el.className = 'status ready';
  } catch (e) {
    recordTiming('wordlist-load', performance.now() - t0);
    el.textContent = `// ERROR: FAILED TO LOAD WORDLIST — ${e.message}`;
    el.className = 'status error';
  }
}

// ── Toggle label sync ─────────────────────────────────────────────────────
document.querySelectorAll('.toggle input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => {
    cb.nextElementSibling.textContent = cb.checked ? 'ON' : 'OFF';
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Input validation ──────────────────────────────────────────────────────
const FIELD_RULES = [
  { id: 'numPhrases', errId: 'err-numPhrases', min: 1, msg: '// ERR: MUST BE >= 1' },
  { id: 'numWords',   errId: 'err-numWords',   min: 1, msg: '// ERR: MUST BE >= 1' },
  { id: 'numNumbers', errId: 'err-numNumbers', min: 0, msg: '// ERR: MUST BE >= 0' },
];

function validateInputs() {
  const t0 = performance.now();
  let ok = true;
  for (const { id, errId, min, msg } of FIELD_RULES) {
    const input = document.getElementById(id);
    const errEl = document.getElementById(errId);
    const val   = parseInt(input.value, 10);
    const fail  = !Number.isInteger(val) || val < min;
    input.classList.toggle('invalid', fail);
    errEl.textContent = fail ? msg : '';
    if (fail) ok = false;
  }
  recordTiming('validation', performance.now() - t0);
  return ok;
}

// Clear field error as soon as the user corrects a value
FIELD_RULES.forEach(({ id, errId, min }) => {
  document.getElementById(id).addEventListener('input', function () {
    const val = parseInt(this.value, 10);
    if (Number.isInteger(val) && val >= min) {
      this.classList.remove('invalid');
      document.getElementById(errId).textContent = '';
    }
  });
});

// ── Capitalization ────────────────────────────────────────────────────────
function applyCapitalization(word, capitalizeWords, randomCaps) {
  let letters = word.split('');

  if (randomCaps) {
    letters = letters.map(l => Math.random() < 0.05 ? l.toUpperCase() : l);
    if (!letters.some(l => l !== l.toLowerCase())) {
      letters[randInt(0, letters.length - 1)] =
        letters[randInt(0, letters.length - 1)].toUpperCase();
    }
  }

  if (capitalizeWords) {
    letters[0] = letters[0].toUpperCase();
  }

  return letters.join('');
}

// ── Core generator ────────────────────────────────────────────────────────
function generatePassphrase(opts) {
  const { numWords, separator, numNumbers, numbersInMiddle, capitalizeWords, randomCaps } = opts;

  let selected = Array.from({ length: numWords }, () =>
    words[randInt(0, words.length - 1)]
  );

  selected = selected.map(w => applyCapitalization(w, capitalizeWords, randomCaps));

  for (let i = 0; i < numNumbers; i++) {
    const num = String(randInt(0, 99));
    const wi  = randInt(0, selected.length - 1);
    const w   = selected[wi];

    if (numbersInMiddle && w.length > 1) {
      const pos = randInt(1, w.length - 1);
      selected[wi] = w.slice(0, pos) + num + w.slice(pos);
    } else {
      selected[wi] = Math.random() < 0.5 ? num + w : w + num;
    }
  }

  return selected.join(separator);
}

// ── Render output ─────────────────────────────────────────────────────────
function generate() {
  if (!words.length) {
    document.getElementById('status').textContent = '// ERR: WORDLIST NOT READY';
    document.getElementById('status').className = 'status error';
    return;
  }

  if (!validateInputs()) return;

  const count = parseInt(document.getElementById('numPhrases').value, 10);
  const opts = {
    numWords:        parseInt(document.getElementById('numWords').value, 10),
    separator:       document.getElementById('separator').value,
    numNumbers:      parseInt(document.getElementById('numNumbers').value, 10),
    numbersInMiddle: document.getElementById('numbersInMiddle').checked,
    capitalizeWords: document.getElementById('capitalizeWords').checked,
    randomCaps:      document.getElementById('randomCaps').checked,
  };

  const t0 = performance.now();
  const phrases = Array.from({ length: count }, () => generatePassphrase(opts));
  recordTiming('generation', performance.now() - t0);

  const list = document.getElementById('outputList');
  list.innerHTML = '';

  phrases.forEach((phrase, i) => {
    const row = document.createElement('div');
    row.className = 'passphrase-row';

    const idx = document.createElement('span');
    idx.className = 'passphrase-idx';
    idx.textContent = String(i + 1).padStart(2, '0');

    const prompt = document.createElement('span');
    prompt.className = 'passphrase-prompt';
    prompt.textContent = '>';

    const text = document.createElement('span');
    text.className = 'passphrase-text';
    text.textContent = phrase;

    const btn = document.createElement('button');
    btn.className = 'btn-copy';
    btn.textContent = '[ COPY ]';
    btn.addEventListener('click', () => copyText(btn, phrase));

    row.append(idx, prompt, text, btn);
    list.appendChild(row);
  });

  document.getElementById('outputCount').textContent =
    `// ${count} PHRASE${count !== 1 ? 'S' : ''} GENERATED`;
  document.getElementById('outputPanel').style.display = '';

  const copyAllBtn = document.getElementById('btnCopyAll');
  copyAllBtn.className = 'btn-copy-all';
  copyAllBtn.textContent = '[ COPY ALL ]';
  copyAllBtn._phrases = phrases;
}

// ── Clipboard ─────────────────────────────────────────────────────────────
async function copyText(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), {
      value: text, style: 'position:fixed;opacity:0'
    });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  const orig = btn.textContent;
  btn.textContent = '[ COPIED ]';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1400);
}

document.getElementById('btnCopyAll').addEventListener('click', function () {
  const phrases = this._phrases;
  if (!phrases) return;
  copyText(this, phrases.join('\n'));
});

document.getElementById('btnGenerate').addEventListener('click', generate);

// ── Boot ──────────────────────────────────────────────────────────────────
loadWords().then(() => { if (words.length) generate(); });
