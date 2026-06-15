/* ══════════════════════════════════════════════
   LINGUABRIDGE — script.js
   New features added:
   · Live character counter with colour warning
   · Translation history (sessionStorage, click to reload)
   · Confidence quality badge on result
   · Shimmer sweep on output panel while translating
   · Toast notification on copy
   · Smart speak toggle (stop if already speaking)
   · Enter key shortcut (Ctrl/Cmd + Enter)
   · Clear source button
   · Recording UI: show/hide stop button, pulse ring
   ══════════════════════════════════════════════ */

// ── DOM ──
const fromText      = document.querySelector(".from-text");
const toText        = document.querySelector(".to-text");
const selectTags    = document.querySelectorAll(".lang-select");
const exchangeBtn   = document.querySelector(".exchange");
const translateBtn  = document.querySelector("#translate-btn");
const shimmer       = document.getElementById("shimmer");
const charUsed      = document.getElementById("char-used");
const charCount     = document.querySelector(".char-count");
const confBadge     = document.getElementById("confidence-badge");
const historyList   = document.getElementById("history-list");
const clearHistory  = document.getElementById("clear-history");
const toast         = document.getElementById("toast");

// voice
const startRecBtn   = document.getElementById("startRecording");
const stopRecBtn    = document.getElementById("stopRecording");
const playBtn       = document.getElementById("playTranslation");

// ── POPULATE LANGUAGE SELECTS ──
selectTags.forEach((tag, id) => {
  for (const code in countries) {
    let selected = "";
    if (id === 0 && code === "en-GB") selected = "selected";
    if (id === 1 && code === "fr-FR") selected = "selected";
    tag.insertAdjacentHTML("beforeend",
      `<option value="${code}" ${selected}>${countries[code]}</option>`
    );
  }
});

// ── EXCHANGE LANGUAGES ──
exchangeBtn.addEventListener("click", () => {
  const tmpText = fromText.value;
  const tmpLang = selectTags[0].value;
  fromText.value        = toText.value;
  selectTags[0].value   = selectTags[1].value;
  toText.value          = tmpText;
  selectTags[1].value   = tmpLang;
  updateCharCount();
});

// ── CHARACTER COUNTER ──
function updateCharCount() {
  const len = fromText.value.length;
  charUsed.textContent = len;
  charCount.classList.toggle("near-limit", len >= 4000 && len < 5000);
  charCount.classList.toggle("at-limit",   len >= 5000);
}
fromText.addEventListener("input", updateCharCount);

// ── CLEAR SOURCE ──
document.querySelector(".clear-from").addEventListener("click", () => {
  fromText.value = "";
  updateCharCount();
  fromText.focus();
});

// ── TRANSLATE ──
translateBtn.addEventListener("click", doTranslate);
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doTranslate();
});

function doTranslate() {
  const text  = fromText.value.trim();
  const from  = selectTags[0].value;
  const to    = selectTags[1].value;
  if (!text) { fromText.focus(); return; }

  // loading state
  toText.value = "";
  toText.setAttribute("placeholder", "Translating…");
  shimmer.classList.add("active");
  translateBtn.classList.add("loading");
  translateBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Translating…`;
  confBadge.style.display = "none";

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const result  = data.responseData.translatedText;
      const quality = parseFloat(data.responseData.match);  // 0–1

      toText.value = result;
      toText.setAttribute("placeholder", "Translation appears here…");

      // shimmer off
      shimmer.classList.remove("active");
      translateBtn.classList.remove("loading");
      translateBtn.innerHTML = `<i class="bi bi-translate"></i> Translate`;

      // confidence badge
      showConfidence(quality);

      // add to history
      addHistory(text, result, from, to);
    })
    .catch(() => {
      toText.setAttribute("placeholder", "Translation failed. Check your connection.");
      shimmer.classList.remove("active");
      translateBtn.classList.remove("loading");
      translateBtn.innerHTML = `<i class="bi bi-translate"></i> Translate`;
    });
}

// ── CONFIDENCE BADGE ──
function showConfidence(q) {
  confBadge.style.display = "";
  confBadge.className = "confidence-badge";
  if (q >= 0.8) {
    confBadge.textContent = "✓ High confidence";
    confBadge.classList.add("conf-high");
  } else if (q >= 0.5) {
    confBadge.textContent = "~ Medium confidence";
    confBadge.classList.add("conf-medium");
  } else {
    confBadge.textContent = "⚠ Low confidence";
    confBadge.classList.add("conf-low");
  }
}

// ── COPY & SPEAK ICONS ──
document.querySelector(".copy-from").addEventListener("click", () => {
  if (!fromText.value) return;
  navigator.clipboard.writeText(fromText.value).then(() => showToast("Copied!"));
});
document.querySelector(".copy-to").addEventListener("click", () => {
  if (!toText.value) return;
  navigator.clipboard.writeText(toText.value).then(() => showToast("Copied!"));
});

document.querySelector(".speak-from").addEventListener("click", function() {
  toggleSpeak(fromText.value, selectTags[0].value, this);
});
document.querySelector(".speak-to").addEventListener("click", function() {
  toggleSpeak(toText.value, selectTags[1].value, this);
});

function toggleSpeak(text, lang, btn) {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    document.querySelectorAll(".icon-btn").forEach(b => b.classList.remove("active-speak"));
    return;
  }

  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);

  const voices = window.speechSynthesis.getVoices();

  let selectedVoice = voices.find(v => v.lang === lang);

  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.lang.startsWith(lang.split("-")[0]));
  }

  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.name.includes("Google"));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  // 🎛️ Tune to sound less robotic
  utterance.rate = 0.85;   // slower = more natural
  utterance.pitch = 1;     // keep natural pitch
  utterance.volume = 1;

  utterance.onend = () => btn.classList.remove("active-speak");
function toggleSpeak(text, lang, btn) {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    document.querySelectorAll(".icon-btn").forEach(b => b.classList.remove("active-speak"));
    return;
  }
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.onend = () => btn.classList.remove("active-speak");
  btn.classList.add("active-speak");
  window.speechSynthesis.speak(utterance);
}
  btn.classList.add("active-speak");
  window.speechSynthesis.speak(utterance);
}

// ── TOAST ──
let toastTimer;
function showToast(msg = "Copied!") {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ── SPEECH RECOGNITION ──
let recognition;
let isRecording = false;

if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = e => {
    fromText.value = e.results[0][0].transcript;
    updateCharCount();
    doTranslate();
  };
  recognition.onerror = e => {
    console.warn("Speech error:", e.error);
    stopRec();
  };
  recognition.onend = stopRec;

  startRecBtn.addEventListener("click", () => {
    if (isRecording) return;
    isRecording = true;
    recognition.lang = selectTags[0].value;
    recognition.start();
    startRecBtn.classList.add("recording");
    startRecBtn.style.display = "none";
    stopRecBtn.style.display  = "";
  });

  stopRecBtn.addEventListener("click", () => {
    recognition.stop();
    stopRec();
  });
} else {
  startRecBtn.disabled = true;
  startRecBtn.title = "Speech recognition not supported in this browser";
}

function stopRec() {
  isRecording = false;
  startRecBtn.classList.remove("recording");
  startRecBtn.style.display = "";
  stopRecBtn.style.display  = "none";
}

// play translation
playBtn.addEventListener("click", () => {
  if (!toText.value) return;
  toggleSpeak(toText.value, selectTags[1].value, playBtn);
});

// ── HISTORY ──
const HIST_KEY = "lingua_history";

function getHistory() {
  try { return JSON.parse(sessionStorage.getItem(HIST_KEY)) || []; }
  catch { return []; }
}
function saveHistory(items) {
  sessionStorage.setItem(HIST_KEY, JSON.stringify(items.slice(0, 12)));
}

function addHistory(src, result, from, to) {
  const items = getHistory();
  items.unshift({ src, result, from, to, time: Date.now() });
  saveHistory(items);
  renderHistory();
}

function renderHistory() {
  const items = getHistory();
  if (!items.length) {
    historyList.innerHTML = '<p class="history-empty">Your translations will appear here.</p>';
    return;
  }
  historyList.innerHTML = items.map((item, i) => {
    const fromLabel = countries[item.from] || item.from;
    const toLabel   = countries[item.to]   || item.to;
    return `
      <div class="history-item" data-index="${i}" style="animation-delay:${i * 0.04}s">
        <div>
          <div class="history-text">${escHtml(truncate(item.src, 40))}</div>
          <div class="history-langs">${escHtml(fromLabel)}</div>
        </div>
        <span class="history-arrow">→</span>
        <div>
          <div class="history-text result">${escHtml(truncate(item.result, 40))}</div>
          <div class="history-langs">${escHtml(toLabel)}</div>
        </div>
      </div>`;
  }).join("");

  // click to reload
  historyList.querySelectorAll(".history-item").forEach(el => {
    el.addEventListener("click", () => {
      const item = getHistory()[el.dataset.index];
      fromText.value      = item.src;
      toText.value        = item.result;
      selectTags[0].value = item.from;
      selectTags[1].value = item.to;
      updateCharCount();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

clearHistory.addEventListener("click", () => {
  sessionStorage.removeItem(HIST_KEY);
  renderHistory();
});

// ── UTILS ──
function truncate(str, n) { return str.length > n ? str.slice(0, n) + "…" : str; }
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── INIT ──
renderHistory();
