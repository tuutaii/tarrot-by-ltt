/* ============================================================
   MYSTIC TAROT — App Logic v3.1
   • Soft ambient sounds (Web Audio)
   • Standard reading + AI tab switcher
   • Card lightbox on click
   ============================================================ */

// ── SPREAD POSITIONS ─────────────────────────────────────────
const POSITIONS = [
  { num:"I",   label:"Năng Lượng Hiện Tại", desc:"Trạng thái & năng lượng của bạn lúc này",         prompt:"Năng lượng hiện tại của người dùng trong vấn đề này là gì?" },
  { num:"II",  label:"Gốc Rễ Quá Khứ",     desc:"Nguyên nhân sâu xa từ quá khứ",                    prompt:"Gốc rễ / nguyên nhân sâu xa từ quá khứ dẫn đến tình trạng hiện tại." },
  { num:"III", label:"Bóng Tối Ẩn Giấu",   desc:"Điều bạn chưa nhìn nhận rõ ràng",                  prompt:"Điều người dùng đang vô tình che giấu hoặc chưa nhìn nhận rõ ràng." },
  { num:"IV",  label:"Thử Thách",           desc:"Trở ngại lớn nhất phải đối mặt",                   prompt:"Thử thách / chướng ngại lớn nhất người dùng phải đối mặt lúc này." },
  { num:"V",   label:"Lời Khuyên",          desc:"Hành động nên thực hiện ngay",                     prompt:"Lời khuyên / hành động người dùng nên thực hiện ngay để cải thiện tình huống." },
  { num:"VI",  label:"Kết Quả Tiềm Năng",  desc:"Điều có thể xảy ra nếu bạn hành động đúng đắn",   prompt:"Kết quả tiềm năng nếu người dùng áp dụng lời khuyên trên." },
];

// ── CONSTANTS ────────────────────────────────────────────────
const DATA_URL    = "https://raw.githubusercontent.com/jordantwells42/tarot/master/public/tarot-images.json";
const IMG_BASE    = "https://raw.githubusercontent.com/jordantwells42/tarot/master/public/cards/";
const STORAGE_KEY = "mystic_tarot_profile";
const DRAW_COUNT  = 6;

// ── STATE ────────────────────────────────────────────────────
let tarotData       = null;
let selectedIdxs    = [];
let drawnCards      = [];
let userInfo        = { name: "", dob: "", gender: "Không rõ", topic: "Tình yêu", intent: "" };
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
const genderPills   = document.querySelectorAll("#gender-pills .pill");
const startBtn      = $("start-btn");

const shuffleIntro  = $("shuffle-intro");
const shuffleBtn    = $("shuffle-btn");
const spreadPreview = $("spread-preview");
const spreadSlots   = $("spread-slots");
const deckContainer = $("deck-container");
const progressPips  = document.querySelectorAll("#progress-pips .pip");
const drawCounter   = $("draw-counter");
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

// Soft sine with smooth attack/release envelope — no clicks
function softTone(freq, dur, vol=0.06, attack=0.04, delay=0) {
  if (!soundEnabled) return;
  try {
    const ctx  = getAudio();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.01);
  } catch(e) {}
}

// Crystal bowl: sine + slight frequency shimmer (very ambient)
function crystalBowl(freq, vol=0.07, delay=0) {
  softTone(freq,      1.2, vol,     0.08, delay);
  softTone(freq*2.01, 0.8, vol*0.4, 0.1,  delay+0.02); // subtle overtone
}

// sfxHover: barely audible high sine, like distant wind chime
function sfxHover() {
  softTone(1318, 0.18, 0.025, 0.03);
}

// sfxSelect: crystal triad — soft, ascending, ethereal
function sfxSelect() {
  crystalBowl(523.25, 0.055, 0);
  crystalBowl(659.25, 0.04,  0.12);
  crystalBowl(783.99, 0.035, 0.26);
}

// sfxShuffle: soft white-noise simulation via rapid detuned sines
function sfxShuffle() {
  if (!soundEnabled) return;
  try {
    const ctx  = getAudio();
    const buf  = ctx.createBuffer(1, ctx.sampleRate*0.4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * 0.04;
    const src  = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filt.type = "bandpass"; filt.frequency.value = 2000; filt.Q.value = 0.5;
    src.buffer = buf;
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime+0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.35);
    src.start(); src.stop(ctx.currentTime+0.4);
  } catch(e) {}
}

// sfxTransition: soft pentatonic ascend
function sfxTransition() {
  const notes = [392, 493.88, 587.33, 783.99];
  notes.forEach((f,i) => softTone(f, 0.7, 0.055, 0.06, i*0.1));
}

// sfxFlip: single soft crystal tap
function sfxFlip() {
  softTone(880, 0.25, 0.04, 0.02);
  softTone(1108.73, 0.2, 0.025, 0.025, 0.03);
}

// sfxChime: pentatonic crystal bowl chord — warm, ambient
function sfxChime() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f,i) => crystalBowl(f, 0.055-i*0.008, i*0.18));
}

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
    if (d.geminiKey)          { geminiKey=d.geminiKey; apiKeyInput.value=d.geminiKey; }
    if (d.soundEnabled!=null) { soundEnabled=d.soundEnabled; soundToggle.checked=soundEnabled; }
  } catch(e) {}
}
function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name:userInfo.name, dob:userInfo.dob, gender:userInfo.gender, topic:userInfo.topic, geminiKey, soundEnabled
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
if (genderPills) {
  genderPills.forEach(pill => {
    pill.addEventListener("click", () => {
      genderPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active"); userInfo.gender=pill.dataset.value; sfxHover();
    });
  });
}
startBtn.addEventListener("click", () => {
  if (!tarotData) { showToast("⏳ Đang tải dữ liệu..."); return; }
  userInfo.name   = userNameInput.value.trim();
  userInfo.dob    = dobInput.value;
  userInfo.intent = intentInput.value.trim() || "Xin lời khuyên tổng quan";
  saveProfile(); sfxTransition(); goToStep(2); resetStep2();
});

// ================================================================
//  STEP 2: SHUFFLE FLOW
// ================================================================
function resetStep2() {
  selectedIdxs=[]; deckReady=false;
  updateCounter(); progressPips.forEach(p=>p.classList.remove("done"));
  shuffleIntro.classList.remove("hidden");
  spreadPreview.classList.add("hidden");
  deckContainer.classList.add("hidden");
  deckContainer.innerHTML="";
  revealBtn.classList.add("hidden");
  buildSpreadSlots();
}
function buildSpreadSlots() {
  spreadSlots.innerHTML="";
  POSITIONS.forEach((pos,i) => {
    const slot=document.createElement("div");
    slot.className="spread-slot"; slot.id="slot-"+i;
    slot.innerHTML=`<div class="slot-num">${pos.num}</div><div class="slot-name">${pos.label}</div><span class="slot-check">✓</span>`;
    spreadSlots.appendChild(slot);
  });
}
shuffleBtn.addEventListener("click", () => { sfxShuffle(); animateShuffle(); });

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
function buildDeck() {
  deckContainer.innerHTML="";
  for (let i=0; i<78; i++) {
    const card=document.createElement("div");
    card.className="card-back"; card.dataset.index=i;
    const rot=(Math.random()-0.5)*7;
    card.style.setProperty("--base-transform",`rotate(${rot}deg)`);
    card.style.transform=`rotate(${rot}deg)`;
    card.style.animationDelay=(i*7)+"ms";
    card.addEventListener("mouseenter",()=>{ if(!card.classList.contains("selected")) sfxHover(); });
    card.addEventListener("click",()=>selectCard(card,i));
    deckContainer.appendChild(card);
  }
}
function selectCard(el,idx) {
  if (!deckReady||selectedIdxs.length>=DRAW_COUNT||el.classList.contains("selected")) return;
  el.classList.add("selected"); selectedIdxs.push(idx); sfxSelect();
  const n=selectedIdxs.length;
  if (progressPips[n-1]) progressPips[n-1].classList.add("done");
  const slot=$("slot-"+(n-1)); if(slot) slot.classList.add("filled");
  updateCounter();
  if (n===DRAW_COUNT) setTimeout(()=>{ revealBtn.classList.remove("hidden"); sfxChime(); },300);
}
function updateCounter() {
  const left=DRAW_COUNT-selectedIdxs.length;
  drawCounter.textContent=left>0?left:"✓";
}
revealBtn.addEventListener("click",()=>{ sfxTransition(); goToStep(3); prepareReading(); });

// ================================================================
//  STEP 3: READING
// ================================================================
function prepareReading() {
  aiGenerated=false; currentReadPane="standard";
  const name=userInfo.name||"Bạn";
  resultTitle.textContent=`Dành Cho ${name}`;
  userInfoSummary.textContent=`${userInfo.topic} · "${userInfo.intent}"`;

  const shuffled=[...tarotData].sort(()=>0.5-Math.random());
  drawnCards=shuffled.slice(0,DRAW_COUNT).map(c=>({...c,isReversed:Math.random()>0.5}));

  renderSpread();
  // Reset reading tabs
  readingStandard.innerHTML=""; readingAi.innerHTML="";
  readingStandard.classList.remove("hidden"); readingAi.classList.add("hidden");
  document.querySelectorAll(".reading-tab").forEach(t=>t.classList.remove("active"));
  document.querySelector('.reading-tab[data-pane="standard"]').classList.add("active");
  aiTabBtn.disabled=true;
  updateAiGenArea();

  // Generate standard reading after cards flip
  setTimeout(generateStandardReading, DRAW_COUNT*350+800);
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

// Standard reading (always shown first)
function generateStandardReading() {
  const name=userInfo.name||"Bạn";
  let html=`<h3>✦ Thông Điệp Dành Cho ${name}</h3>
  <p>Luận giải 6 lá bài theo trải bài <em>Chân Dung Vấn Đề</em> trong chủ đề <strong>${userInfo.topic}</strong>.</p>`;
  drawnCards.forEach((card,i)=>{
    const pos=POSITIONS[i];
    const meanings=card.isReversed?card.meanings.shadow:card.meanings.light;
    const fortune=card.fortune_telling?card.fortune_telling.slice(0,2).join(". "):"";
    html+=`
      <h3>${pos.num}. ${pos.label} — ${card.name}${card.isReversed?" (Ngược)":""}</h3>
      <p><em>${pos.desc}</em></p>
      <p><strong>Từ khóa:</strong> ${card.keywords?card.keywords.join(", "):""}</p>
      <p>${meanings?meanings.slice(0,3).join(". ")+".":""} ${fortune}</p>
    `;
  });
  html+=`<h3>✦ Đúc Kết & Lời Nhắn</h3>
  <p>6 lá bài vừa rồi vẽ nên bức chân dung rõ nét về hành trình của bạn trong lĩnh vực <strong>${userInfo.topic}</strong>.
  Vũ trụ khuyên bạn lắng nghe trực giác, hành động theo lời khuyên ở lá <strong>V</strong>, và tin tưởng vào tiềm năng lá <strong>VI</strong> đã chỉ ra. Bạn có sức mạnh để thay đổi — chúc bình an.</p>`;
  readingStandard.innerHTML=html; sfxChime();
}

// AI reading via Gemini
async function fetchGeminiReading() {
  const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
  const cardDesc=drawnCards.map((c,i)=>{
    const pos=POSITIONS[i];
    const meanings=c.isReversed?c.meanings.shadow:c.meanings.light;
    const fortune=c.fortune_telling?c.fortune_telling.join(". "):"";
    return `Vị trí ${pos.num} "${pos.label}" (${pos.prompt}):\n- Lá bài: "${c.name}" — ${c.isReversed?"Ngược":"Xuôi"}\n- Từ khóa: ${c.keywords?c.keywords.join(", "):""}\n- Ý nghĩa gốc: ${meanings?meanings.join(". "):""}. ${fortune}`;
  }).join("\n\n");

  const prompt=`Bạn là một Tarot Reader cao cấp, tinh tế, thấu cảm. Viết bằng tiếng Việt, giọng văn ấm áp và truyền cảm hứng.

Thông tin người dùng:
- Tên: ${userInfo.name||"Ẩn danh"}
- Ngày sinh: ${userInfo.dob||"không rõ"}
- Giới tính: ${userInfo.gender||"Không rõ"}
- Chủ đề trải bài: ${userInfo.topic}
- Câu hỏi / Mong muốn: "${userInfo.intent}"

Trải bài "Chân Dung Vấn Đề" — 6 lá:
${cardDesc}

Hãy viết một bài luận giải liền mạch, sâu sắc, được cá nhân hóa theo đúng tên và hoàn cảnh người dùng. Cấu trúc:
1. Lời mở đầu thấu cảm — gọi tên người dùng, kết nối chủ đề và trạng thái hiện tại (1 đoạn ngắn, ấm áp).
2. Luận giải từng lá theo thứ tự I → VI — mỗi lá viết 2-3 câu, đặt đúng trong ngữ cảnh vị trí.
3. Bức tranh toàn cảnh — kết nối cả 6 lá thành một câu chuyện liền mạch có đầu có cuối.
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
  spreadContainer.innerHTML="";
  drawnCards.forEach((card,i)=>{
    const pos=POSITIONS[i];
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
  lightboxName.textContent=card.name+(card.isReversed?" (Ngược)":"");
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
saveResultBtn.addEventListener("click",()=>showToast("📸 Dùng chức năng chụp màn hình của thiết bị."));

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
  } catch(e) {
    console.error("Data load failed:",e);
    showToast("❌ Không tải được dữ liệu. Kiểm tra kết nối.");
  }
}
init();
