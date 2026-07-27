/* ============================================================
   MYSTIC TAROT — App Logic v3.1
   • Soft ambient sounds (Web Audio)
   • Standard reading + AI tab switcher
   • Card lightbox on click
   ============================================================ */

// ── SPREADS CONFIGURATION ──────────────────────────────────────
const SPREADS = {
  "3-card": {
    id: "3-card", name: "Quá Khứ - Hiện Tại - Tương Lai", drawCount: 3, cssClass: "layout-3",
    positions: [
      { num:"I",   label:"Quá Khứ",   desc:"Sự kiện, nguyên nhân trong quá khứ", prompt:"Sự kiện, nguyên nhân gốc rễ trong quá khứ ảnh hưởng đến vấn đề này." },
      { num:"II",  label:"Hiện Tại",  desc:"Tình huống, cảm xúc hiện tại",      prompt:"Tình huống, cảm xúc hiện tại và năng lượng lúc này." },
      { num:"III", label:"Tương Lai", desc:"Kết quả dự kiến nếu tiếp tục",      prompt:"Kết quả dự kiến hoặc hướng đi trong tương lai nếu mọi thứ tiếp diễn." }
    ]
  },
  "6-card": {
    id: "6-card", name: "Chân Dung Vấn Đề", drawCount: 6, cssClass: "layout-6",
    positions: [
      { num:"I",   label:"Năng Lượng Hiện Tại", desc:"Trạng thái & năng lượng của bạn lúc này",       prompt:"Năng lượng hiện tại của người dùng trong vấn đề này." },
      { num:"II",  label:"Gốc Rễ Quá Khứ",     desc:"Nguyên nhân sâu xa từ quá khứ",                  prompt:"Gốc rễ nguyên nhân sâu xa từ quá khứ." },
      { num:"III", label:"Bóng Tối Ẩn Giấu",   desc:"Điều bạn chưa nhìn nhận rõ ràng",                prompt:"Điều người dùng đang che giấu hoặc chưa nhìn nhận rõ." },
      { num:"IV",  label:"Thử Thách",           desc:"Trở ngại lớn nhất phải đối mặt",                 prompt:"Thử thách chướng ngại lớn nhất hiện tại." },
      { num:"V",   label:"Lời Khuyên",          desc:"Hành động nên thực hiện ngay",                   prompt:"Lời khuyên hành động nên thực hiện ngay." },
      { num:"VI",  label:"Kết Quả Tiềm Năng",  desc:"Điều có thể xảy ra nếu hành động đúng đắn",      prompt:"Kết quả tiềm năng nếu áp dụng lời khuyên." }
    ]
  },
  "10-card": {
    id: "10-card", name: "Celtic Cross", drawCount: 10, cssClass: "layout-10",
    positions: [
      { num:"I",   label:"Hiện Tại",        desc:"Bản thân vấn đề hoặc trạng thái hiện tại", prompt:"Trạng thái hiện tại của vấn đề." },
      { num:"II",  label:"Thử Thách",       desc:"Yếu tố cản trở (Lá bài cắt ngang)",        prompt:"Yếu tố chướng ngại vật đang cản trở." },
      { num:"III", label:"Nền Tảng",        desc:"Nguyên nhân tiềm thức sâu xa",             prompt:"Nguyên nhân sâu xa trong tiềm thức." },
      { num:"IV",  label:"Quá Khứ Gần",     desc:"Sự kiện vừa xảy ra ảnh hưởng",             prompt:"Sự kiện quá khứ gần đây tác động đến hiện tại." },
      { num:"V",   label:"Mục Tiêu",        desc:"Điều bạn đang hướng tới/suy nghĩ",         prompt:"Điều người dùng đang kỳ vọng hoặc lý trí đang hướng tới." },
      { num:"VI",  label:"Tương Lai Gần",   desc:"Điều sắp xảy ra tiếp theo",                prompt:"Diễn biến sắp tới trong tương lai gần." },
      { num:"VII", label:"Bản Thân",        desc:"Thái độ, cách nhìn nhận của bạn",          prompt:"Thái độ, phản ứng của bản thân với tình huống." },
      { num:"VIII",label:"Môi Trường",      desc:"Tác động từ người khác/hoàn cảnh",         prompt:"Ảnh hưởng từ hoàn cảnh bên ngoài và người khác." },
      { num:"IX",  label:"Hy Vọng & Sợ Hãi",desc:"Niềm hy vọng và nỗi lo lắng",              prompt:"Hy vọng và nỗi lo sợ của người dùng." },
      { num:"X",   label:"Kết Quả",         desc:"Cái kết nếu mọi thứ diễn ra tự nhiên",     prompt:"Kết quả tổng thể của toàn bộ quá trình." }
    ]
  }
};

const DATA_URL    = "https://raw.githubusercontent.com/jordantwells42/tarot/master/public/tarot-images.json";
const IMG_BASE    = "https://raw.githubusercontent.com/jordantwells42/tarot/master/public/cards/";
const STORAGE_KEY = "mystic_tarot_profile";

// ── STATE ────────────────────────────────────────────────────
let tarotData       = null;
let shuffledDeck    = []; // tarotData shuffled once when deck is built
let selectedIdxs    = [];
let drawnCards      = [];
let userInfo        = { name: "", dob: "", gender: "Không rõ", topic: "Tình yêu", spread: "6-card", intent: "" };
let currentSpread   = SPREADS["6-card"];
let geminiKey       = "";
let soundEnabled    = true;
let audioCtx        = null;
let deckReady       = false;
let aiGenerated     = false;
let currentReadPane = "standard"; // "standard" | "ai"

// ── DOM ──────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const settingsBtn   = $("settings-btn");
const settingsModal = $("settings-modal");
const closeSettings = $("close-settings");
const saveSettings  = $("save-settings");
const apiKeyInput   = $("api-key-input");
const soundToggle   = $("sound-toggle");
const settingsName  = $("settings-name");
const settingsDob   = $("settings-dob");
const settingsGender= $("settings-gender");

const step1 = $("step-1"), step2 = $("step-2"), step3 = $("step-3");
const userNameInput = $("user-name");
const dobInput      = $("dob");
const intentInput   = $("intent");
const topicPills    = document.querySelectorAll("#topic-pills .pill");
const spreadPills   = document.querySelectorAll("#spread-pills .pill");
const genderPills   = document.querySelectorAll("#gender-pills .pill");
const startBtn      = $("start-btn");

const drawCounter   = $("draw-counter");
const shuffleIntro  = $("shuffle-intro");
const shuffleBtn    = $("shuffle-btn");
const spreadPreview = $("spread-preview");
const spreadSlots   = $("spread-slots");
const deckContainer = $("deck-container");
const carouselRing  = $("carousel-ring");
const revealBtn     = $("reveal-btn");

const resultTitle     = $("result-title");
const userInfoSummary = $("user-info-summary");
const spreadContainer = $("spread-container");
const aiLoading       = $("ai-loading");
const readingStandard = $("reading-standard");
const readingAi       = $("reading-ai");
const aiTabBtn        = $("ai-tab-btn");
const aiGenArea       = $("ai-gen-area");
const aiGenDesc       = $("ai-gen-desc");
const genAiBtn        = $("gen-ai-btn");
const genAiLabel      = $("gen-ai-label");
const restartBtn      = $("restart-btn");
const saveResultBtn   = $("save-result-btn");
const toast           = $("toast");

const cardLightbox    = $("card-lightbox");
const lightboxBackdrop= $("lightbox-backdrop");
const lightboxClose   = $("lightbox-close");
const lightboxImg     = $("lightbox-img");
const lightboxPos     = $("lightbox-pos");
const lightboxName    = $("lightbox-name");
const lightboxKw      = $("lightbox-kw");
const lightboxMeanings= $("lightbox-meanings");

// ================================================================
//  STARS
// ================================================================
function initStars() {
  const s = document.createElement("style");
  s.textContent = `@keyframes twinkle { from{opacity:0.12;} to{opacity:1;} }`;
  document.head.appendChild(s);
  [1,2,3].forEach(n => {
    const layer = $("stars-"+n);
    if (!layer) return;
    const count = n===1?130:n===2?80:45;
    for (let i=0; i<count; i++) {
      const el  = document.createElement("div");
      const sz  = n===1?Math.random()*1.5+0.4:n===2?Math.random()*2+0.8:Math.random()*3+1;
      const op  = Math.random()*0.5+0.2;
      const amb = n===3||Math.random()<0.12;
      el.style.cssText = `
        position:absolute;width:${sz}px;height:${sz}px;border-radius:50%;
        background:${amb?`rgba(138,90,25,${op})`:`rgba(184,123,46,${op})`};
        left:${Math.random()*100}%;top:${Math.random()*100}%;
        ${amb?`box-shadow:0 0 ${sz*3}px rgba(138,90,25,0.6);`:""}
        animation:twinkle ${2.5+Math.random()*5}s ease-in-out ${Math.random()*6}s infinite alternate;
      `;
      layer.appendChild(el);
    }
  });
}

// ================================================================
//  SOFT AMBIENT SOUND ENGINE
// ================================================================
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}

// Paper rustling sound synthesizer
function paperSound(dur, freq, vol) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudio();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * vol;
    
    const src = ctx.createBufferSource();
    src.buffer = buf;
    
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = freq;
    filt.Q.value = 1.0;
    
    const gain = ctx.createGain();
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + dur * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur * 0.9);
    
    src.start();
    src.stop(ctx.currentTime + dur);
  } catch(e) {}
}

function sfxHover() { paperSound(0.1, 4000, 0.05); }
function sfxSelect() { paperSound(0.2, 2000, 0.15); }
function sfxShuffle() { paperSound(0.5, 1500, 0.2); }
function sfxTransition() { paperSound(0.3, 1000, 0.1); }
function sfxFlip() { paperSound(0.25, 1200, 0.2); }
function sfxChime() { paperSound(0.6, 800, 0.15); }

// ================================================================
//  PROFILE
// ================================================================
function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.name)   { userInfo.name=d.name; userNameInput.value=d.name; settingsName.value=d.name; }
    if (d.dob)    { userInfo.dob=d.dob;   dobInput.value=d.dob;       settingsDob.value=d.dob;  }
    if (d.gender) { userInfo.gender=d.gender; settingsGender.value=d.gender; setGenderPill(d.gender); }
    if (d.topic)  { userInfo.topic=d.topic; setActivePill(d.topic); }
    if (d.spread) { 
      userInfo.spread=d.spread; 
      currentSpread = SPREADS[d.spread] || SPREADS["6-card"];
      spreadPills.forEach(p => p.classList.toggle("active", p.dataset.value===d.spread));
    }
    if (d.geminiKey)          { geminiKey=d.geminiKey; apiKeyInput.value=d.geminiKey; }
    if (d.soundEnabled!=null) { soundEnabled=d.soundEnabled; soundToggle.checked=soundEnabled; }
  } catch(e) {}
}
function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name:userInfo.name, dob:userInfo.dob, gender:userInfo.gender, topic:userInfo.topic, spread:userInfo.spread, geminiKey, soundEnabled
    }));
  } catch(e) {}
}
function setActivePill(val) {
  topicPills.forEach(p => p.classList.toggle("active", p.dataset.value===val));
}
function setGenderPill(val) {
  if (!genderPills) return;
  genderPills.forEach(p => p.classList.toggle("active", p.dataset.value===val));
}

// ================================================================
//  SETTINGS
// ================================================================
settingsBtn.addEventListener("click", () => {
  settingsName.value=userInfo.name; settingsDob.value=userInfo.dob; settingsGender.value=userInfo.gender;
  apiKeyInput.value=geminiKey; soundToggle.checked=soundEnabled;
  settingsModal.classList.remove("hidden"); sfxTransition();
});
closeSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));
settingsModal.addEventListener("click", e => { if(e.target===settingsModal) settingsModal.classList.add("hidden"); });
saveSettings.addEventListener("click", () => {
  userInfo.name=settingsName.value.trim(); userInfo.dob=settingsDob.value; userInfo.gender=settingsGender.value;
  geminiKey=apiKeyInput.value.trim(); soundEnabled=soundToggle.checked;
  userNameInput.value=userInfo.name; dobInput.value=userInfo.dob; setGenderPill(userInfo.gender);
  saveProfile(); settingsModal.classList.add("hidden");
  updateAiGenArea(); showToast("✦ Đã lưu cài đặt");
});
// Synchronize inputs real-time between Step 1 and Settings
userNameInput.addEventListener("input", e => settingsName.value = e.target.value);
dobInput.addEventListener("input", e => settingsDob.value = e.target.value);
settingsName.addEventListener("input", e => userNameInput.value = e.target.value);
settingsDob.addEventListener("input", e => dobInput.value = e.target.value);
settingsGender.addEventListener("change", e => setGenderPill(e.target.value));

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
  });
});

// ================================================================
//  STEP 1
// ================================================================
topicPills.forEach(pill => {
  pill.addEventListener("click", () => {
    topicPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active"); userInfo.topic=pill.dataset.value; sfxHover();
  });
});
spreadPills.forEach(pill => {
  pill.addEventListener("click", () => {
    spreadPills.forEach(p => p.classList.remove("active"));
    pill.classList.add("active"); userInfo.spread=pill.dataset.value; sfxHover();
  });
});
if (genderPills) {
  genderPills.forEach(pill => {
    pill.addEventListener("click", () => {
      genderPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active"); userInfo.gender=pill.dataset.value; 
      settingsGender.value = pill.dataset.value; // Sync to settings
      sfxHover();
    });
  });
}
startBtn.addEventListener("click", () => {
  if (!tarotData) { showToast("⏳ Đang tải dữ liệu..."); return; }
  userInfo.name   = userNameInput.value.trim();
  userInfo.dob    = dobInput.value;
  userInfo.intent = intentInput.value.trim() || "Xin lời khuyên tổng quan";
  
  if (!userInfo.spread) userInfo.spread = "6-card";
  currentSpread = SPREADS[userInfo.spread] || SPREADS["6-card"];

  saveProfile(); sfxTransition();
  showWelcomeCeremony();
});

// ================================================================
//  CEREMONY 1.1 — Welcome Overlay (typewriter greeting)
// ================================================================
function showWelcomeCeremony() {
  const overlay   = document.getElementById("welcome-overlay");
  const textEl    = document.getElementById("welcome-line");
  const readyBtn  = document.getElementById("welcome-ready-btn");
  
  overlay.classList.remove("hidden");
  readyBtn.classList.add("hidden");

  const name = userInfo.name || "người bạn";
  const numerology = userInfo.dob
    ? (() => {
        const digits = userInfo.dob.replace(/\D/g,"").split("").map(Number);
        let s = digits.reduce((a,b)=>a+b,0);
        while (s > 9 && s !== 11 && s !== 22) s = String(s).split("").map(Number).reduce((a,b)=>a+b,0);
        return s;
      })()
    : null;

  const lines = [
    `Xin chào, ${name}...`,
    `Vũ trụ đã nghe tiếng gọi của bạn...`,
    numerology
      ? `Hôm nay, con số định mệnh ${numerology} đang đồng hành cùng bạn...`
      : `Năng lượng hôm nay đang hội tụ về phía bạn...`,
    `Hãy để tâm trí lắng xuống, và những lá bài sẽ lên tiếng...`,
  ];

  let lineIdx = 0;
  function typeNextLine() {
    if (lineIdx >= lines.length) {
      setTimeout(() => readyBtn.classList.remove("hidden"), 400);
      return;
    }
    typewriterEffect(textEl, lines[lineIdx], 38, () => {
      lineIdx++;
      setTimeout(typeNextLine, 1200);
    });
  }
  setTimeout(typeNextLine, 400);

  document.getElementById("welcome-ready-btn").onclick = () => {
    overlay.classList.add("hidden");
    goToStep(2);
    resetStep2();
    startBreathLock();
  };
  
  document.getElementById("welcome-skip-btn").onclick = () => {
    overlay.classList.add("hidden");
    goToStep(2);
    resetStep2();
    startBreathLock();
  };
}

function typewriterEffect(el, text, speed, onDone) {
  el.textContent = "";
  let i = 0;
  const tick = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(tick, speed);
    } else if (onDone) {
      onDone();
    }
  };
  tick();
}

// ================================================================
//  CEREMONY 1.2 — Breathing Lock before shuffle
// ================================================================
function startBreathLock() {
  const overlay   = document.getElementById("breath-overlay");
  const countEl   = document.getElementById("breath-count");
  const textEl    = document.getElementById("breath-text");
  const shuffleBtn= document.getElementById("shuffle-btn");
  
  const breathMsgs = [
    "Hít vào thật chậm... giữ câu hỏi trong lòng...",
    "Thở ra nhẹ nhàng... để tâm trí trống rỗng...",
    "Một lần nữa... bạn đang kết nối với vũ trụ...",
  ];

  overlay.classList.remove("hidden");
  shuffleBtn.disabled = true;
  let count = 3;

  let breathTimeout;
  const tick = () => {
    countEl.textContent = count;
    textEl.textContent  = breathMsgs[3 - count];
    paperSound(0.4, 600, 0.04);
    if (count <= 0) {
      breathTimeout = setTimeout(() => {
        overlay.classList.add("hidden");
        shuffleBtn.disabled = false;
        startFocusTicker();
      }, 1000);
      return;
    }
    count--;
    breathTimeout = setTimeout(tick, 4000);
  };
  tick();

  document.getElementById("breath-skip-btn").onclick = () => {
    clearTimeout(breathTimeout);
    overlay.classList.add("hidden");
    shuffleBtn.disabled = false;
    startFocusTicker();
  };
}

// ================================================================
//  CEREMONY 2.2 — Focus Ticker during shuffle wait
// ================================================================
const FOCUS_MSGS = [
  "Hãy nghĩ về điều bạn thực sự muốn hỏi...",
  "Tập trung vào cảm xúc của bạn lúc này...",
  "Vũ trụ đang sắp xếp những lá bài dành cho bạn...",
  "Hãy để trực giác dẫn đường — đừng suy nghĩ nhiều...",
  "Hít thở sâu... bộ bài đang lắng nghe...",
  "Niềm tin của bạn chính là chìa khóa...",
];
let _tickerInterval = null;
function startFocusTicker() {
  const el = document.getElementById("shuffle-ticker");
  if (!el) return;
  let i = 0;
  clearInterval(_tickerInterval);
  el.textContent = FOCUS_MSGS[0];
  _tickerInterval = setInterval(() => {
    i = (i + 1) % FOCUS_MSGS.length;
    el.textContent = FOCUS_MSGS[i];
  }, 4000);
}
function stopFocusTicker() { clearInterval(_tickerInterval); }


// ================================================================
//  STEP 2: SHUFFLE FLOW
// ================================================================
function resetStep2() {
  selectedIdxs=[]; deckReady=false;
  
  // Dynamic pips
  const pipsContainer = document.getElementById("progress-pips");
  if(pipsContainer) {
    pipsContainer.innerHTML = "";
    for(let i=0; i<currentSpread.drawCount; i++) {
      const pip = document.createElement("div");
      pip.className = "pip";
      pipsContainer.appendChild(pip);
    }
  }

  updateCounter();
  shuffleIntro.classList.remove("hidden");
  spreadPreview.classList.add("hidden");
  deckContainer.classList.add("hidden");
  carouselRing.innerHTML = "";
  carouselRing.style.transform = "rotateY(0deg)";
  revealBtn.classList.add("hidden");
  buildSpreadSlots();
}
function buildSpreadSlots() {
  spreadSlots.className="spread-slots";
  spreadSlots.innerHTML="";
  currentSpread.positions.forEach((pos,i) => {
    const slot=document.createElement("div");
    slot.className="spread-slot"; slot.id="slot-"+i;
    if(i===0) slot.classList.add("active");
    slot.innerHTML=`<div class="slot-num">${pos.num}</div><div class="slot-name">${pos.label}</div><span class="slot-check">✓</span>`;
    spreadSlots.appendChild(slot);
  });
}
shuffleBtn.addEventListener("click", () => { stopFocusTicker(); sfxShuffle(); animateShuffle(); });

function animateShuffle() {
  const pile  = $("deck-pile");
  const cards = pile.querySelectorAll(".deck-pile-card");
  let cuts = 0;
  const doRiffle = () => {
    if (cuts>=3) { afterShuffle(); return; }
    cards.forEach((c,i) => {
      const dir = i%2===0?-1:1;
      c.style.transition="transform 0.2s ease";
      c.style.transform=`translate(${dir*28}px,${-i*3}px) rotate(${dir*9}deg)`;
      setTimeout(() => { c.style.transform=`translate(${-dir*6}px,${-i*1}px) rotate(${dir*2}deg)`; }, 200);
      setTimeout(() => { c.style.transform=""; }, 400);
    });
    sfxShuffle(); cuts++;
    setTimeout(doRiffle, 480);
  };
  doRiffle();
}
function afterShuffle() {
  sfxTransition();
  shuffleIntro.style.opacity="0"; shuffleIntro.style.transition="opacity 0.4s";
  setTimeout(() => {
    shuffleIntro.classList.add("hidden"); shuffleIntro.style.opacity="";
    spreadPreview.classList.remove("hidden"); deckContainer.classList.remove("hidden");
    deckReady=true; buildDeck();
  }, 440);
}
// ================================================================
//  3D CAROUSEL LOGIC
// ================================================================
let carouselAngle = 0;
let carouselRAF = null;
let carouselSpeed = 0.15;
let isHoveringCard = false;
let isAnimatingFly = false;
let userScrollVelocity = 0;

function rotateCarousel() {
  if (!deckReady) return;
  // Slow down if hovering or flying a card, unless user is scrolling
  let targetSpeed = (isHoveringCard || isAnimatingFly) ? 0.02 : 0.15;
  
  if (Math.abs(userScrollVelocity) > 0.1) {
    targetSpeed = userScrollVelocity;
    // apply friction
    userScrollVelocity *= 0.95;
  }
  
  carouselSpeed += (targetSpeed - carouselSpeed) * 0.1;
  carouselAngle += carouselSpeed;
  
  if (carouselRing) {
    carouselRing.style.transform = `rotateY(${carouselAngle}deg)`;
  }
  carouselRAF = requestAnimationFrame(rotateCarousel);
}

function buildDeck() {
  carouselRing.innerHTML = "";
  cancelAnimationFrame(carouselRAF);
  carouselAngle = 0;

  // Calculate radius based on screen width
  const isMobile = window.innerWidth <= 600;
  const radius = isMobile ? 400 : 750;

  shuffledDeck = [...tarotData].sort(() => 0.5 - Math.random());
  for (let i = 0; i < 78; i++) {
    const card = document.createElement("div");
    card.className = "card-back";
    card.dataset.index = i;
    
    // Distribute cards evenly in a circle
    const angle = (360 / 78) * i;
    card.style.setProperty("--base-transform", `rotateY(${angle}deg) translateZ(${radius}px)`);
    card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
    card.style.animationDelay = (i * 7) + "ms";
    
    card.addEventListener("mouseenter", () => {
      if (!card.classList.contains("selected")) {
        sfxHover();
        isHoveringCard = true;
      }
    });
    card.addEventListener("mouseleave", () => {
      isHoveringCard = false;
    });
    card.addEventListener("click", () => selectCard(card, i, angle, radius));
    
    carouselRing.appendChild(card);
  }

  // Start rotation loop
  carouselRAF = requestAnimationFrame(rotateCarousel);
}

function selectCard(el, idx, cardAngle, radius) {
  if (!deckReady || selectedIdxs.length >= currentSpread.drawCount || el.classList.contains("selected") || isAnimatingFly) return;
  
  el.classList.add("selected");
  selectedIdxs.push(idx);
  sfxSelect();
  const n = selectedIdxs.length;
  
  const dynamicPips = document.querySelectorAll("#progress-pips .pip");
  if (dynamicPips[n - 1]) dynamicPips[n - 1].classList.add("done");
  
  const slot = $("slot-" + (n - 1));
  const nextSlot = $("slot-" + n);
  
  if (slot) {
    isAnimatingFly = true;

    // Create a clone to animate, leave original in carousel but hidden
    const clone = el.cloneNode(true);
    const rect = el.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    
    // Hide original
    el.style.animation = "none";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    
    document.body.appendChild(clone);
    clone.style.position = "fixed";
    clone.style.margin = "0";
    clone.style.zIndex = "9999";
    clone.style.animation = "none";
    clone.style.transition = "none";
    
    // Snap to exact center of the screen bounds
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    clone.style.left = (centerX - 25) + "px"; // 25 is half of 50px width
    clone.style.top = (centerY - 42) + "px";  // 42 is half of 84px height
    clone.style.width = "50px";
    clone.style.height = "84px";
    clone.style.transform = "none"; // reset 3D rotation of the clone
    
    // Force reflow
    void clone.offsetWidth;
    
    // Calculate target center of slot
    const targetWidth = 50;
    const targetHeight = 84;
    const targetLeft = slotRect.left + (slotRect.width - targetWidth) / 2;
    const targetTop = slotRect.top + (slotRect.height - targetHeight) / 2;

    // Animate to slot
    clone.style.transition = "all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)";
    clone.style.left = targetLeft + "px";
    clone.style.top = targetTop + "px";
    clone.style.width = targetWidth + "px";
    clone.style.height = targetHeight + "px";
    clone.style.transform = "rotateY(180deg) scale(0.8)"; 
    clone.style.opacity = "0";

    setTimeout(() => {
      slot.classList.remove("active");
      slot.classList.add("filled");
      slot.classList.add("pinging");
      setTimeout(() => slot.classList.remove("pinging"), 300);
      
      if (nextSlot) nextSlot.classList.add("active");
      clone.remove(); // cleanup flying clone
      isAnimatingFly = false;
      
      updateCounter();
      if (n === currentSpread.drawCount) {
        setTimeout(() => {
          revealBtn.classList.remove("hidden");
          sfxChime();
        }, 300);
      }
    }, 600);
  }
}

// Add mouse wheel support for manual carousel rotation
deckContainer.addEventListener("wheel", (e) => {
  if (!deckReady || isAnimatingFly) return;
  e.preventDefault();
  // Map vertical or horizontal scroll to rotation velocity
  const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
  userScrollVelocity = delta * 0.02;
}, { passive: false });

// Add touch support for mobile swiping
let touchStartX = 0;
deckContainer.addEventListener("touchstart", (e) => {
  if (!deckReady || isAnimatingFly) return;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

deckContainer.addEventListener("touchmove", (e) => {
  if (!deckReady || isAnimatingFly) return;
  const delta = touchStartX - e.touches[0].clientX;
  userScrollVelocity = delta * 0.1; // sensitivity
  touchStartX = e.touches[0].clientX;
}, { passive: true });

function updateCounter() {
  const left=currentSpread.drawCount-selectedIdxs.length;
  drawCounter.textContent=left>0?left:"✓";
}
revealBtn.addEventListener("click", () => {
  sfxTransition();
  const overlay = document.getElementById("breathe-overlay");
  overlay.classList.remove("hidden");
  
  // Tĩnh lặng 3 giây
  setTimeout(() => {
    overlay.classList.add("hidden");
    goToStep(3);
    prepareReading();
  }, 3000);
});

// ================================================================
//  STEP 3: READING
// ================================================================
function prepareReading() {
  aiGenerated=false; currentReadPane="standard";
  const name=userInfo.name||"Bạn";
  resultTitle.textContent=`Dành Cho ${name}`;
  userInfoSummary.textContent=`${userInfo.topic} · "${userInfo.intent}"`;

  // Use the cards the user actually selected from shuffledDeck
  drawnCards = selectedIdxs.map(idx => ({ ...shuffledDeck[idx], isReversed: Math.random() > 0.5 }));

  renderSpread();
  // Reset reading tabs
  readingStandard.innerHTML=""; readingAi.innerHTML="";
  readingStandard.classList.remove("hidden"); readingAi.classList.add("hidden");
  document.querySelectorAll(".reading-tab").forEach(t=>t.classList.remove("active"));
  document.querySelector('.reading-tab[data-pane="standard"]').classList.add("active");
  aiTabBtn.disabled=true;
  updateAiGenArea();

  // Generate standard reading after cards flip
  setTimeout(generateStandardReading, currentSpread.drawCount*350+800);
}

function updateAiGenArea() {
  if (aiGenerated) {
    aiGenArea.style.display="none"; return;
  }
  aiGenArea.style.display="";
  if (geminiKey) {
    aiGenDesc.textContent="Nhận luận giải sâu sắc được cá nhân hóa từ Gemini AI.";
    genAiBtn.disabled=false; genAiBtn.classList.remove("done");
    genAiLabel.textContent="Khám Phá Giải Nghĩa AI";
  } else {
    aiGenDesc.textContent="Nhập Gemini API Key trong Cài Đặt (⚙) để bật tính năng này.";
    genAiBtn.disabled=true;
    genAiLabel.textContent="AI chưa được cài đặt";
  }
}

genAiBtn.addEventListener("click", async () => {
  if (!geminiKey||aiGenerated) return;
  genAiBtn.disabled=true; genAiLabel.textContent="Đang kết nối…";
  aiLoading.classList.remove("hidden");
  try {
    await fetchGeminiReading();
    aiGenerated=true;
    aiTabBtn.disabled=false;
    // Auto-switch to AI tab
    switchReadPane("ai");
    sfxChime();
    updateAiGenArea();
  } catch(e) {
    console.error(e);
    showToast("❌ Không kết nối được AI. Kiểm tra API Key.");
    genAiBtn.disabled=false; genAiLabel.textContent="Thử Lại";
  } finally { aiLoading.classList.add("hidden"); }
});

// Reading tab switch
document.querySelectorAll(".reading-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    switchReadPane(btn.dataset.pane);
  });
});
function switchReadPane(pane) {
  currentReadPane=pane;
  document.querySelectorAll(".reading-tab").forEach(t=>t.classList.toggle("active",t.dataset.pane===pane));
  readingStandard.classList.toggle("hidden", pane!=="standard");
  readingAi.classList.toggle("hidden",       pane!=="ai");
}

// Standard reading (always shown first) with typewriter card-by-card reveal
function generateStandardReading() {
  const name = userInfo.name || "Bạn";
  readingStandard.innerHTML = "";
  sfxChime();

  // Header appears immediately
  const header = document.createElement("div");
  header.innerHTML = `<h3>✦ Thông Điệp Dành Cho ${name}</h3>
    <p>Luận giải ${currentSpread.drawCount} lá bài theo trải bài <em>${currentSpread.name}</em> trong chủ đề <strong>${userInfo.topic}</strong>.</p>`;
  header.style.animation = "fadeInUp 0.6s ease both";
  readingStandard.appendChild(header);

  // Reveal each card block with stagger delay + typewriter on the summary text
  drawnCards.forEach((card, i) => {
    const pos      = currentSpread.positions[i];
    const meanings = card.isReversed ? card.meanings.shadow : card.meanings.light;
    const fortune  = card.fortune_telling ? card.fortune_telling.slice(0,2).join(". ") : "";
    const summary  = (meanings ? meanings.slice(0,2).join(". ") + "." : "") + (fortune ? " " + fortune : "");

    setTimeout(() => {
      const block = document.createElement("div");
      block.className = "reading-card-block";
      block.style.animation = "fadeInUp 0.5s ease both";
      block.innerHTML = `
        <h3>${pos.num}. ${pos.label} — ${card.name}${card.isReversed ? " (Ngược)" : ""}</h3>
        <p><em>${pos.desc}</em></p>
        ${card.isReversed ? `<p class="reversed-note">Lá bài ngược — năng lượng có thể đang ách tắc hoặc cần hướng vào bên trong.</p>` : ""}
        <p><strong>Từ khóa:</strong> ${card.keywords ? card.keywords.join(", ") : ""}</p>
        <p class="reading-summary" id="rsummary-${i}"></p>
      `;
      readingStandard.appendChild(block);
      const summaryEl = document.getElementById(`rsummary-${i}`);
      typewriterEffect(summaryEl, summary, 22, null);
    }, i * 800);
  });

  // Closing mantra after all cards revealed
  const outCard = drawnCards[drawnCards.length - 1];
  const mantras = [
    `Hãy tin vào hành trình của chính bạn — mỗi bước đi đều có ý nghĩa.`,
    `Bạn đã mang đủ sức mạnh bên trong — hãy để nó toả sáng.`,
    `Vũ trụ luôn đứng về phía những ai dũng cảm lắng nghe bản thân.`,
    `Hành trình của bạn là duy nhất — đừng so sánh, hãy tin tưởng.`,
  ];
  const mantra = mantras[Math.floor(Math.random() * mantras.length)];

  setTimeout(() => {
    const closing = document.createElement("div");
    closing.className = "reading-closing";
    closing.style.animation = "fadeInUp 0.6s ease both";
    closing.innerHTML = `
      <h3>✦ Đúc Kết &amp; Lời Nhắn</h3>
      <p>${currentSpread.drawCount} lá bài vừa rồi vẽ nên bức tranh tổng thể về hành trình của bạn trong lĩnh vực <strong>${userInfo.topic}</strong>.
      Hãy tin tưởng vào thông điệp mà lá <strong>${outCard.name}${outCard.isReversed ? " (Ngược)" : ""}</strong> chỉ ra ở cuối hành trình.</p>
      <blockquote class="closing-mantra" id="mantra-quote"></blockquote>
    `;
    readingStandard.appendChild(closing);
    const mantraEl = document.getElementById("mantra-quote");
    typewriterEffect(mantraEl, `✦ ${mantra}`, 30, null);
    sfxChime();
  }, drawnCards.length * 800 + 600);
}


// AI reading via Gemini
async function fetchGeminiReading() {
  const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
  const cardDesc=drawnCards.map((c,i)=>{
    const pos=currentSpread.positions[i];
    const meanings=c.isReversed?c.meanings.shadow:c.meanings.light;
    const fortune=c.fortune_telling?c.fortune_telling.join(". "):"";
    return `Vị trí ${pos.num} "${pos.label}" (${pos.prompt}):\n- Lá bài: "${c.name}" — ${c.isReversed?"Ngược":"Xuôi"}\n- Từ khóa: ${c.keywords?c.keywords.join(", "):""}\n- Ý nghĩa gốc: ${meanings?meanings.join(". "):""}. ${fortune}`;
  }).join("\n\n");

  const prompt=`Bạn là một Tarot Reader cao cấp, tinh tế, thấu cảm. Viết bằng tiếng Việt, giọng văn ấm áp và truyền cảm hứng.

Thông tin người dùng:
- Tên: ${userInfo.name||"Ẩn danh"}
- Ngày sinh: ${userInfo.dob ? userInfo.dob + " (Năm hiện tại là " + new Date().getFullYear() + ", hãy tính tuổi dựa trên năm này)" : "không rõ"}
- Giới tính: ${userInfo.gender||"Không rõ"}
- Chủ đề trải bài: ${userInfo.topic}
- Câu hỏi / Mong muốn: "${userInfo.intent}"

Trải bài "${currentSpread.name}" — ${currentSpread.drawCount} lá:
${cardDesc}

Hãy viết một bài luận giải liền mạch, sâu sắc, được cá nhân hóa theo đúng tên và hoàn cảnh người dùng. Cấu trúc:
1. Lời mở đầu thấu cảm — gọi tên người dùng, kết nối chủ đề và trạng thái hiện tại (1 đoạn ngắn, ấm áp).
2. Luận giải từng lá theo thứ tự — mỗi lá viết 2-3 câu, đặt đúng trong ngữ cảnh vị trí của trải bài.
3. Bức tranh toàn cảnh — kết nối tất cả các lá bài thành một câu chuyện liền mạch có đầu có cuối.
4. Lời khuyên hành động cụ thể và lời kết truyền cảm hứng.

Dùng HTML (<h3>, <p>, <strong>, <em>). Không dùng markdown hay bullet list.`;

  const res=await fetch(url,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})
  });
  if(!res.ok) throw new Error("API "+res.status);
  const data=await res.json();
  const text=data.candidates[0].content.parts[0].text;

  readingAi.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid rgba(212,139,58,0.15);">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D48B3A" stroke-width="1.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
      <span style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;color:#F0AD65;font-weight:500;letter-spacing:0.04em;">AI Enhanced · Gemini</span>
    </div>
    ${text}
  `;
}

// ================================================================
//  CARD LIGHTBOX
// ================================================================
function renderSpread() {
  spreadContainer.className="spread-container " + currentSpread.cssClass;
  spreadContainer.innerHTML="";
  drawnCards.forEach((card,i)=>{
    const pos=currentSpread.positions[i];
    const wrapper=document.createElement("div");
    wrapper.className="tarot-wrapper";
    if(card.isReversed) wrapper.classList.add("card-reversed");

    const cardEl=document.createElement("div");
    cardEl.className="tarot-card";

    const front=document.createElement("div");
    front.className="card-face card-front";

    const revealed=document.createElement("div");
    revealed.className="card-face card-revealed";
    const img=document.createElement("img");
    img.src=IMG_BASE+card.img; img.alt=card.name;
    revealed.appendChild(img);
    cardEl.appendChild(front); cardEl.appendChild(revealed);

    const posNum=document.createElement("div");
    posNum.className="card-pos-num";
    posNum.textContent=pos.num+" · "+pos.label;

    const posTitle=document.createElement("div");
    posTitle.className="card-pos-title";
    posTitle.textContent=pos.desc;

    const nameEl=document.createElement("div");
    nameEl.className="card-name-label";
    nameEl.textContent=card.name;

    wrapper.appendChild(cardEl); wrapper.appendChild(posNum);
    wrapper.appendChild(posTitle); wrapper.appendChild(nameEl);

    if(card.isReversed){
      const badge=document.createElement("div");
      badge.className="card-reversed-badge"; badge.textContent="(Ngược)";
      wrapper.appendChild(badge);
    }

    // Click to zoom lightbox
    wrapper.addEventListener("click",()=>{
      if(!cardEl.classList.contains("flipped")) return;
      openLightbox(card, pos, i);
    });

    spreadContainer.appendChild(wrapper);
    setTimeout(()=>{ cardEl.classList.add("flipped"); sfxFlip(); }, 400+i*350);
  });
}

function openLightbox(card, pos, idx) {
  sfxChime();
  const meanings=(card.isReversed?card.meanings.shadow:card.meanings.light)||[];
  lightboxImg.src=IMG_BASE+card.img;
  lightboxImg.alt=card.name;
  lightboxPos.textContent=pos.num+" · "+pos.label+" — "+pos.desc;
  const reverseLabel = card.isReversed ? `<span style="color:var(--amber-lt); font-style:italic; font-size:0.85em; display:block; margin-top:5px;">(Trạng thái ngược - Năng lượng tiềm ẩn hoặc bị cản trở)</span>` : '';
  lightboxName.innerHTML=`${card.name} ${reverseLabel}`;
  lightboxKw.textContent=card.keywords?"Từ khóa: "+card.keywords.join(", "):"";
  lightboxMeanings.textContent=meanings.slice(0,4).join(". ")+(meanings.length>0?".":"");
  if(card.isReversed) lightboxImg.style.transform="rotate(180deg)";
  else lightboxImg.style.transform="";
  cardLightbox.classList.remove("hidden");
  document.body.style.overflow="hidden";
}
function closeLightbox() {
  cardLightbox.classList.add("hidden");
  document.body.style.overflow="";
}
lightboxClose.addEventListener("click", closeLightbox);
lightboxBackdrop.addEventListener("click", closeLightbox);
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeLightbox(); });

// ================================================================
//  NAVIGATION
// ================================================================
function goToStep(n) {
  [step1,step2,step3].forEach(s=>s.classList.remove("active"));
  document.getElementById(`step-${n}`).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}
restartBtn.addEventListener("click",()=>{ intentInput.value=""; userInfo.intent=""; sfxTransition(); goToStep(1); });
saveResultBtn.addEventListener("click", async () => {
  if (typeof htmlToImage === "undefined") {
    showToast("❌ Chưa tải được thư viện xuất ảnh."); return;
  }
  // Show saving state
  saveResultBtn.disabled = true;
  const origHTML = saveResultBtn.innerHTML;
  saveResultBtn.innerHTML = `<span style="opacity:0.7">Đang xuất ảnh…</span>`;

  try {
    const zone = document.getElementById("capture-zone");
    const bgColor = window.getComputedStyle(document.body).backgroundColor;
    const blob = await htmlToImage.toBlob(zone, {
      backgroundColor: bgColor,
      pixelRatio: 2,
    });

    const filename = `mystic-tarot-${userInfo.name||"reading"}-${new Date().toISOString().slice(0,10)}.png`;

    // Try File System Access API (Chrome/Edge — lets user pick folder)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "PNG Image", accept: { "image/png": [".png"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showToast("✦ Đã lưu kết quả thành công!");
        return;
      } catch(e) {
        if (e.name === "AbortError") { return; } // user cancelled picker
        // fallthrough to <a> download
      }
    }

    // Fallback: trigger browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("✦ Ảnh đã được tải xuống!");
  } catch(e) {
    console.error(e);
    showToast("❌ Không thể xuất ảnh. Thử lại sau.");
  } finally {
    saveResultBtn.disabled = false;
    saveResultBtn.innerHTML = origHTML;
  }
});

// ================================================================
//  TOAST
// ================================================================
function showToast(msg,dur=3000) {
  toast.textContent=msg; toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("show"),10);
  setTimeout(()=>{ toast.classList.remove("show"); setTimeout(()=>toast.classList.add("hidden"),350); },dur);
}

// ================================================================
//  INIT
// ================================================================
async function init() {
  initStars(); loadProfile();
  try {
    const res=await fetch(DATA_URL);
    const json=await res.json();
    tarotData=json.cards;
    // Enable start button after loaded
    const startText = startBtn.querySelector(".btn-text");
    if (startText) startText.textContent = "Bắt Đầu Trải Bài";
    startBtn.disabled = false;
  } catch(e) {
    console.error("Data load failed:",e);
    showToast("❌ Không tải được dữ liệu. Kiểm tra kết nối.");
  }
}
init();
