// 🚡 דוכן החילוץ — pixel-art order rush about the stuck Haifa cable car
(() => {
  "use strict";

  // ==========================================================================
  //  Canvas: a 384x216 pixel world, scaled 2x onto the screen canvas.
  //  Text is drawn on the 2x layer so Hebrew stays readable but still pixelated.
  // ==========================================================================
  const W = 384, H = 216, S = 2;
  const screen = document.getElementById("screen");
  const sx = screen.getContext("2d");
  const world = document.createElement("canvas");
  world.width = W; world.height = H;
  const x = world.getContext("2d");
  const bg = document.createElement("canvas");
  bg.width = W; bg.height = H;
  const bx = bg.getContext("2d");
  sx.imageSmoothingEnabled = false;
  const $ = (id) => document.getElementById(id);

  // ==========================================================================
  //  Palette (Endesga-ish) + helpers
  // ==========================================================================
  const P = {
    k: "#181425", w: "#ffffff", c: "#c0cbdc", C: "#8b9bb4", s: "#5a6988", S: "#3a4466", z: "#262b44",
    r: "#e43b44", R: "#a22633", o: "#f77622", O: "#feae34", y: "#fee761", Y: "#ead4aa",
    n: "#be4a2f", N: "#733e39", t: "#3e2731", m: "#b86f50", M: "#e4a672", P: "#e8b796", Q: "#c28569",
    g: "#63c74d", G: "#3e8948", d: "#265c42", e: "#193c3e",
    b: "#0099db", B: "#124e89", L: "#2ce8f5", l: "#8de5f0",
    p: "#f6757a", V: "#b55088", v: "#68386c", u: "#5d275d",
  };
  const col = (c) => P[c] || c;
  let ctx = x;
  const px = (X, Y, c, w = 1, h = 1) => { ctx.fillStyle = col(c); ctx.fillRect(Math.round(X), Math.round(Y), w, h); };
  const sprite = (rows, X, Y, flip = false) => {
    X = Math.round(X); Y = Math.round(Y);
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch !== ".") px(flip ? X + r.length - 1 - i : X + i, Y + j, ch); }
    }
  };
  const spriteS = (rows, X, Y, k) => {
    X = Math.round(X); Y = Math.round(Y);
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const ch = rows[j][i]; if (ch !== ".") px(X + i * k, Y + j * k, ch, k, k); }
  };
  const disc = (cx, cy, r, c) => { for (let j = -r; j <= r; j++) { const w = Math.floor(Math.sqrt(r * r - j * j + r * 0.8)); px(cx - w, cy + j, c, w * 2 + 1, 1); } };
  const line = (x0, y0, x1, y1, c) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sxx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), syy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 2000; n++) { px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sxx; } if (e2 <= dx) { err += dx; y0 += syy; } }
  };
  const dither = (X, Y, w, h, a, b) => { ctx.fillStyle = col(a); ctx.fillRect(X, Y, w, h); ctx.fillStyle = col(b); for (let j = 0; j < h; j++) for (let i = (j % 2); i < w; i += 2) ctx.fillRect(X + i, Y + j, 1, 1); };
  const box = (X, Y, w, h, fill, edge = "k") => { px(X + 1, Y, edge, w - 2, 1); px(X + 1, Y + h - 1, edge, w - 2, 1); px(X, Y + 1, edge, 1, h - 2); px(X + w - 1, Y + 1, edge, 1, h - 2); px(X + 1, Y + 1, fill, w - 2, h - 2); };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixHex = (a, b, t) => { const A = hexRGB(col(a)), B = hexRGB(col(b)); return "#" + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, "0")).join(""); };
  const STOPS = [0, 0.45, 0.72, 1];
  const keyed = (arr, d) => { for (let i = 0; i < 3; i++) if (d <= STOPS[i + 1]) return mixHex(arr[i], arr[i + 1], (d - STOPS[i]) / (STOPS[i + 1] - STOPS[i])); return col(arr[3]); };

  // ==========================================================================
  //  Pixel text (cached, thresholded so it's crisp)
  // ==========================================================================
  const textCache = new Map();
  const tcan = document.createElement("canvas"); tcan.width = 600; tcan.height = 40;
  const tctx = tcan.getContext("2d", { willReadFrequently: true });
  function textImg(str, size, color, outline) {
    const key = str + "|" + size + "|" + color + "|" + outline;
    let img = textCache.get(key);
    if (img) return img;
    tctx.clearRect(0, 0, 600, 40);
    tctx.font = `900 ${size}px Rubik, Arial, sans-serif`;
    tctx.direction = "rtl"; tctx.textAlign = "center"; tctx.textBaseline = "middle";
    tctx.fillStyle = "#000"; tctx.fillText(str, 300, 20);
    const d = tctx.getImageData(0, 0, 600, 40).data;
    let minx = 600, maxx = -1, miny = 40, maxy = -1;
    const on = [];
    for (let j = 0; j < 40; j++) for (let i = 0; i < 600; i++) if (d[(j * 600 + i) * 4 + 3] > 115) { on.push(i, j); if (i < minx) minx = i; if (i > maxx) maxx = i; if (j < miny) miny = j; if (j > maxy) maxy = j; }
    const pad = outline ? 1 : 0;
    const c = document.createElement("canvas");
    c.width = Math.max(1, maxx - minx + 1 + pad * 2); c.height = Math.max(1, maxy - miny + 1 + pad * 2);
    const cc = c.getContext("2d");
    if (outline) {
      cc.fillStyle = col(outline);
      for (let k = 0; k < on.length; k += 2) { const i = on[k] - minx + pad, j = on[k + 1] - miny + pad; cc.fillRect(i - 1, j, 3, 1); cc.fillRect(i, j - 1, 1, 3); }
    }
    cc.fillStyle = col(color);
    for (let k = 0; k < on.length; k += 2) cc.fillRect(on[k] - minx + pad, on[k + 1] - miny + pad, 1, 1);
    img = { c, w: c.width, h: c.height };
    textCache.set(key, img);
    return img;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => textCache.clear());
  // queued for the 2x layer: world coords
  let texts = [], textOff = 0;
  const noEmoji = (t) => t.replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, "").replace(/\s+/g, " ").trim();
  function text(str, X, Y, size = 11, color = "w", outline = "k", align = "center") {
    str = noEmoji(str);
    texts.push({ str, X, Y: Y + textOff, size, color, outline, align });
  }
  function textW(str, size = 11, outline = "k") { return textImg(noEmoji(str), size, "w", outline).w / S; }

  // ==========================================================================
  //  Sprites
  // ==========================================================================
  const ICON = {
    coffee:  ["..c..c....", "...c..c...", "..c..c....", ".kkkkkkk..", ".kwwwwwkkk", ".kwNNNwk.k", ".kwNtNwk.k", ".kwwwwwkkk", "..kwwwk...", "...kkk...."],
    battery: ["...kkkk...", "..kkCCkk..", "..kCggCk..", "..kCggCk..", "..kCggCk..", "..kCGGCk..", "..kCGGCk..", "..kCGGCk..", "..kCCCCk..", "..kkkkkk.."],
    water:   ["...kkkk...", "...kbbk...", "...kkkk...", "..kllllk..", ".kllwlllk.", ".kLLwLLLk.", ".kbLLLLbk.", ".kbbbbbbk.", ".kbBbbbbk.", "..kkkkkk.."],
    bamba:   ["..kkkkkk..", ".kyyyyyyk.", ".kyrrrryk.", ".kyrOOryk.", ".kyrOOryk.", ".kyrrrryk.", ".kyyyyyyk.", ".kyBByyyk.", ".kyyyyyyk.", "..kkkkkk.."],
    falafel: ["..........", "...kkk....", "..kMMnk.kk", "..kMnnkkMk", "...kkkkMnk", ".kkk..kkk.", "kMMnk.kkk.", "kMnnkkMnk.", ".kkk.kMnk.", ".....kkk.."],
    blanket: ["..........", ".kkkkkkk..", "kpVpVpVpk.", "kVpVpVpVk.", "kpVpVpVpkk", "kVpVpVpVpk", "kpVpVpVpVk", ".kkkkkkpVk", "......kkkk", ".........."],
    lock:    ["...kkkk...", "..kCCCCk..", "..kC..Ck..", "..kC..Ck..", ".kkkkkkkk.", ".kOOOOOOk.", ".kOOkkOOk.", ".kOOkkOOk.", ".kOOOOOOk.", ".kkkkkkkk."],
    sun:     ["....y....", ".y..y..y.", "..yyyyy..", "..ywwwy..", "yyywwwyyy", "..ywwwy..", "..yyyyy..", ".y..y..y.", "....y...."],
    moon:    ["...yyy...", "..yyy....", ".yyy.....", ".yyy.....", ".yyy.....", ".yyy.....", "..yyy....", "...yyyy..", "....yy..."],
    note:    ["...y.....", "..yy..c..", "yyyy...c.", "yyyy.c.c.", "yyyy.c.c.", "yyyy...c.", "..yy..c..", "...y....."],
    phone:   ["..kkkkkk..", ".kwwwwwwk.", "kwkkwwkkwk", "kk..kk..kk", "....kk....", "...kwwk...", "..kwkkwk..", "..kwwwwk..", "..kkkkkk..", ".........."],
  };
  const ITEMS = [
    { id: "coffee", name: "קפה" }, { id: "battery", name: "מטען" }, { id: "water", name: "מים" },
    { id: "bamba", name: "במבה" }, { id: "falafel", name: "פלאפל" }, { id: "blanket", name: "שמיכה" },
  ];

  // passenger types — who's stuck up there
  const TYPES = {
    student: { skin: ["P", "M", "Q"], hair: ["N", "k", "t", "O", "n"], wants: { coffee: 5, battery: 5, bamba: 2, falafel: 2, water: 1, blanket: 1 }, w: 7 },
    grandma: { skin: ["P"], hair: ["c"], wants: { water: 4, bamba: 3, blanket: 4, coffee: 1, falafel: 1 }, w: 1 },
    soldier: { skin: ["M", "Q"], hair: ["G"], wants: { falafel: 5, battery: 3, coffee: 2, water: 2 }, w: 1 },
    tourist: { skin: ["P"], hair: ["O"], wants: { water: 4, falafel: 4, battery: 2 }, w: 1 },
    dog:     { skin: ["m"], hair: ["N"], wants: { bamba: 6, water: 3 }, w: 0.6 },
  };

  // ==========================================================================
  //  The funny part: what people say
  // ==========================================================================
  const LINES = {
    student: {
      idle: [
        "יש לי מבחן במד״ר בעוד שעה!!", "זה נחשב כמו יום מילואים?", "אפשר לבקש על זה פקטור?",
        "שלחתי למרצה: 'תקוע ברכבלית'", "המרצה בחיים לא יאמין לי", "הרכבלית: 1, אני: 0",
        "זה בדיוק כמו הממוצע שלי. תקוע באמצע", "מתי זה זז? בסמסטר הבא?", "פרויקט גמר: איך יוצאים מרכבלית",
        "בטוח שזה לא תרגיל במכניקה?", "יש קליטה של פס אחד. כמו בפקולטה", "אם לא אחזור – הסיכומים במודל",
        "כבר עדיף היה לטפס ברגל", "מישהו יודע לפתור אינטגרל? יש זמן", "מילא אני, הלפטופ על 3%",
        "החנייה בטכניון עדיין יותר גרועה", "הייתי פה בשביל הנוף. סתם, לא", "אני רואה מפה את הציון שלי יורד",
        "זה נחשב שעות התנדבות?", "סטטיקה: הנדסת עכשיו. אני: סטטי", "תגידו למזכירות שאני בדרך",
        "אוקיי, זה הולך לטיקטוק", "אפשר להגיש את המטלה מפה?",
      ],
      thanks: ["הצלת לי את הסמסטר 🙏", "מגיע לך 100 במבחן", "אתה הפקטור של חיי", "5 כוכבים בגוגל", "אני מוותר על ההרצאה בשבילך", "אוהבים אותך, דוכן"],
      wrong: ["ביקשתי קפה, לא אינטגרל", "זה לא מה שהזמנתי... אבל אוקיי", "אחי, מה זה", "גם זה לא נכון. כמו התרגיל שלי"],
      angry: ["אני כותב על זה בטכניון קונפשנס", "תלונה לדיקן!!", "פותח קבוצת וואטסאפ של מוחים", "זהו, אני עובר לאוניברסיטה"],
      call: ["הלו? המבחן נדחה?", "שלום, אפשר לדבר עם מנהל?", "זה הדיקן? יש לי בקשה", "אפשר להזמין עוד קפה? סתם"],
    },
    grandma: {
      idle: ["40 שנה חיכיתי לרכבלית הזאת", "אכלתם משהו? אתם רזים", "נכד, תצלם אותי עם הים", "בזמני היו מדרגות. והיינו מרוצים"],
      thanks: ["איזה ילד טוב!", "שאלוהים ישמור עליך", "תבוא לארוחת שישי"],
      wrong: ["חמוד, זה לא מה שביקשתי", "אני אוכל הכל, אבל לא את זה"],
      angry: ["אני מתקשרת לבן שלי", "בזמני היו עונים!"],
      call: ["הלו? זה הדוכן? יש לכם מרק?"],
    },
    soldier: {
      idle: ["יש לי חזרה לבסיס ב-8!", "מילואים יותר רגוע מזה", "לפחות פה אין שמירות"],
      thanks: ["תודה אח, מצדיע", "קיבלת צל״ש", "שמעתי, בוצע"],
      wrong: ["זה לא לפי הפקודה"],
      angry: ["מדווח למ״פ!!"],
      call: ["כאן קרון 3, עבור"],
    },
    tourist: {
      idle: ["Is this normal?", "Very nice view! Very long.", "Where is Bahai garden?"],
      thanks: ["Toda raba!!", "Best falafel ever"],
      wrong: ["Ehm... no?"],
      angry: ["I write bad review!"],
      call: ["Hello? Help? Hummus?"],
    },
    dog: {
      idle: ["הב!", "הב הב (= במבה)", "*מסתכל עליך עם עיניים*"],
      thanks: ["הב!!! 💛"],
      wrong: ["...הב?"],
      angry: ["ווווף!!"],
      call: ["הב? הב?"],
    },
  };
  const NO_ANSWER = ["אף אחד לא עונה באינטרקום. כרגיל.", "ניתקו לי. מעולה.", "גם האינטרקום תקוע"];

  // ==========================================================================
  //  Shifts — afternoon to night, Haifa winds
  // ==========================================================================
  const SHIFTS = [
    { title: "אחר הצהריים", from: 16 * 60, to: 17 * 60 + 20, dur: 90, items: 4, active: 2, patience: 24, gust: null,                        call: [14, 20], stars: [70, 120] },
    { title: "שקיעה",       from: 17 * 60 + 20, to: 18 * 60 + 40, dur: 95, items: 5, active: 2, patience: 21, gust: { every: [12, 17], power: 0.85 }, call: [11, 16], stars: [100, 160] },
    { title: "לילה בחיפה",  from: 18 * 60 + 40, to: 20 * 60, dur: 100, items: 6, active: 3, patience: 21, gust: { every: [8, 12], power: 1 },     call: [9, 13], stars: [120, 190] },
  ];
  const UPGRADES = [
    { id: "turbo",  icon: "⚡", name: "קו טורבו", desc: "הסל עולה פי 1.6 מהר יותר", cost: 60 },
    { id: "basket", icon: "🧺", name: "סל נוסף", desc: "שני סלים על הכבל בבת אחת", cost: 80 },
    { id: "radio",  icon: "📻", name: "רדיו רגוע", desc: "מוזיקה מרגיעה: +25% סבלנות", cost: 70 },
  ];

  // ==========================================================================
  //  World geometry
  // ==========================================================================
  const STAND_Y = 114, BG_OFF = 34;  // close-up: big cabins on top, the stand below, Haifa behind
  const CA = { x: -12, y: 12 };
  const cableY = (X) => 12 - X * 0.006 + Math.sin(Math.PI * clamp(X / W, 0, 1)) * 3;
  const groundY = (X) => Math.round(146 - Math.max(0, X - 168) * 0.22);
  const ridgeY = (X) => Math.round(112 - Math.max(0, X - 70) * 0.25 - Math.sin(X / 14) * 2 - Math.sin(X / 37) * 2);
  const CAB_X = [72, 192, 312];
  const CAB_W = 92, CAB_H = 58, CAB_TOP = 30;

  // the stand: three trays on each side, a big basket in the middle
  const TRAY_BG = ["#4a2c28", "#22323f", "#123a5a", "#6a4a1a", "#5a3a22", "#4a2240"];
  const BASKET = { x: 292, y: 162, w: 86, h: 38 };
  const TRASH = { x: 312, y: 204, w: 46, h: 11 };
  const MUTE = { x: 124, y: 123, w: 16, h: 13 };

  // static scenery
  const houses = Array.from({ length: 46 }, (_, i) => { const X = 120 + ((i * 61) % 250); return { X, Y: ridgeY(X) + 3 + ((i * 7) % 16), w: 3 + (i % 3), lit: i % 4 !== 0 }; });
  const stars = Array.from({ length: 70 }, () => ({ X: randi(0, W), Y: randi(2, 90), tw: rand(0, 6) }));
  const clouds = [{ X: 120, Y: 34, w: 30 }, { X: 250, Y: 22, w: 22 }, { X: 330, Y: 48, w: 26 }, { X: 20, Y: 26, w: 18 }];
  const birds = [{ X: 160, Y: 40 }, { X: 170, Y: 36 }, { X: 240, Y: 30 }];

  // ==========================================================================
  //  Audio — little chiptune
  // ==========================================================================
  let ac = null, muted = false, master = null, musicOn = false, musicTimer = null, nextNote = 0, step = 0;
  function audio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === "suspended") ac.resume();
  }
  function beep(f, d = 0.08, type = "square", v = 0.05, t = 0, slide = 0) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + t, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t0 + d);
    g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + d + 0.02);
  }
  function hiss(d = 1, v = 0.04, f = 500) {
    if (!ac || muted) return;
    const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
    const s = ac.createBufferSource(), g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = "bandpass"; fl.frequency.value = f; s.buffer = b; g.gain.value = v;
    s.connect(fl).connect(g).connect(master); s.start();
  }
  const sfx = {
    pick: () => beep(660 + Math.random() * 120, 0.05, "square", 0.035),
    trash: () => beep(200, 0.15, "square", 0.04, 0, -120),
    send: () => { beep(330, 0.08, "square", 0.04); beep(495, 0.12, "square", 0.04, 0.07); },
    coin: () => { beep(988, 0.06, "square", 0.045); beep(1319, 0.16, "square", 0.045, 0.06); },
    wrong: () => { beep(196, 0.12, "square", 0.05); beep(147, 0.22, "square", 0.05, 0.11); },
    angry: () => beep(110, 0.35, "sawtooth", 0.05, 0, -40),
    ring: () => { for (let i = 0; i < 4; i++) beep(i % 2 ? 1175 : 1480, 0.06, "square", 0.03, i * 0.07); },
    answer: () => { beep(784, 0.06, "triangle", 0.06); beep(1046, 0.1, "triangle", 0.06, 0.06); },
    drop: () => beep(800, 0.3, "triangle", 0.04, 0, -600),
    wind: () => hiss(2.4, 0.06, 380),
    order: () => beep(1046, 0.05, "triangle", 0.04),
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => beep(f, 0.12, "square", 0.045, i * 0.09)),
    lose: () => [392, 370, 349, 330].forEach((f, i) => beep(f, 0.22, "square", 0.04, i * 0.2)),
  };
  // a tiny looping tune (bass + arpeggio), quieter at night
  const BASS = [45, 45, 52, 52, 50, 50, 47, 52];
  const ARP = [[69, 73, 76], [69, 73, 76], [71, 76, 79], [71, 76, 79], [69, 74, 78], [69, 74, 78], [68, 71, 76], [71, 76, 80]];
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function startMusic() {
    if (musicOn || !ac) return;
    musicOn = true; nextNote = ac.currentTime + 0.1; step = 0;
    musicTimer = setInterval(() => {
      if (!ac) return;
      while (nextNote < ac.currentTime + 0.25) {
        if (!muted && state === "play") {
          const bar = Math.floor(step / 8) % 8, s = step % 8, tempoV = 0.022 * (1 - dark * 0.4);
          if (s % 4 === 0) note(midi(BASS[bar]), 0.22, "triangle", 0.07, nextNote);
          if (s % 2 === 1) note(midi(ARP[bar][(s >> 1) % 3]), 0.09, "square", tempoV, nextNote);
        }
        nextNote += 0.15; step++;
      }
    }, 60);
  }
  function note(f, d, type, v, t0) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + d + 0.02);
  }

  // ==========================================================================
  //  State
  // ==========================================================================
  let state = "menu";
  let shiftIdx = 0, elapsed = 0, clock = 16 * 60, dark = 0;
  let money = 0, shiftTips = 0, served = 0, strikes = 0, lastServe = -99, combo = 0;
  let owned = new Set();
  let flyers = [], basketLand = [];
  let cabins = [], basket = [], baskets = [], drops = [], parts = [], popups = [], bubbles = [];
  let gust = 0, gustPhase = "calm", gustT = 0, gustP = 0, callT = 0, ring = null;
  let hoverCabin = -1, hoverBin = -1, time = 0, flash = 0, banner = null;
  let endAnim = 0;

  function makePassenger() {
    const types = Object.keys(TYPES);
    const total = types.reduce((s, k) => s + TYPES[k].w, 0);
    let r = Math.random() * total, type = "student";
    for (const k of types) { r -= TYPES[k].w; if (r <= 0) { type = k; break; } }
    const T = TYPES[type];
    const shirt = { student: pick(["#0099db", "#63c74d", "#f6757a", "#feae34", "#b55088", "#2ce8f5", "#5a6988"]), grandma: "#b55088", soldier: "#3e8948", tourist: "#fee761", dog: "#b86f50" }[type];
    return { type, shirt, long: type === "student" && Math.random() < 0.4, skin: pick(T.skin), hair: pick(T.hair), glasses: type === "student" && Math.random() < 0.35, blink: rand(0, 4) };
  }

  function startShift(i) {
    shiftIdx = i;
    const SH = SHIFTS[i];
    elapsed = 0; clock = SH.from; shiftTips = 0; served = 0; strikes = 0; combo = 0; lastServe = -99;
    if (i === 0) money = 0;
    cabins = CAB_X.map((X, k) => {
      const ppl = Array.from({ length: k === 1 ? 3 : randi(2, 3) }, makePassenger);
      if (i === 0 && k === 0) ppl[0].type = "student";
      return { X, ppl, order: null, cool: rand(0.5, 3) + k * 1.2, mood: 0, say: null, phase: rand(0, 6), happy: 0, mad: 0, slow: 0 };
    });
    basket = []; basketLand = []; flyers = []; baskets = []; drops = []; parts = []; popups = []; bubbles = [];
    gust = 0; gustPhase = "calm"; gustT = SH.gust ? rand(8, 11) : Infinity; callT = rand(SH.call[0], SH.call[1]); ring = null;
    state = "play";
    banner = { text: `משמרת ${i + 1} · ${SH.title}`, t: 2.4 };
    audio(); startMusic();
  }

  // ==========================================================================
  //  Orders
  // ==========================================================================
  function weightedPick(wants, pool) {
    const opts = pool.filter((id) => wants[id]);
    const list = opts.length ? opts : pool;
    const tot = list.reduce((s, id) => s + (wants[id] || 1), 0);
    let r = Math.random() * tot;
    for (const id of list) { r -= wants[id] || 1; if (r <= 0) return id; }
    return list[0];
  }
  function makeOrder(c) {
    const SH = SHIFTS[shiftIdx];
    const who = randi(0, c.ppl.length - 1), p = c.ppl[who], T = TYPES[p.type];
    const pool = ITEMS.slice(0, SH.items).map((i) => i.id);
    const maxN = shiftIdx === 0 ? 2 : 3;
    const n = Math.min(randi(1, maxN), pool.length);
    const items = [];
    for (let guard = 0; items.length < n && guard < 50; guard++) { const id = weightedPick(T.wants, pool); if (!items.includes(id)) items.push(id); }
    let max = (SH.patience + items.length * 4) * (owned.has("radio") ? 1.25 : 1) * (c.slow > 0 ? 0.7 : 1);
    c.slow = 0;
    return { items, who, t: max, max, born: time };
  }

  function sameItems(a, b) { return a.length === b.length && a.every((i) => b.includes(i)); }

  function say(c, kind, life = 3.4, force) {
    const who = c.order ? c.order.who : randi(0, c.ppl.length - 1);
    const p = c.ppl[who] || c.ppl[0];
    const pool = LINES[p.type][kind] || LINES.student[kind];
    life = Math.max(life, 3.2);
    c.say = { text: force || pick(pool), t: life, max: life, who };
  }

  // ==========================================================================
  //  Actions
  // ==========================================================================
  function addItem(i) {
    if (state !== "play") return;
    const SH = SHIFTS[shiftIdx];
    if (i >= SH.items) { toastMsg("נפתח במשמרת הבאה 🔒"); return; }
    const id = ITEMS[i].id;
    if (basket.includes(id)) { toastMsg("כבר יש בסל 😉"); return; }
    if (basket.length >= 3) { toastMsg("הסל מלא!"); return; }
    basket.push(id);
    basketLand.push(time + 0.24);
    const tr = trayRect(i);
    flyers.push({ id, sx: tr.x + tr.w / 2 - 10, sy: tr.y - 2, slot: basket.length - 1, t: 0 });
    sfx.pick();
  }
  function trash() {
    if (!basket.length) return;
    basket = []; basketLand = []; flyers = [];
    sfx.trash();
  }
  function maxBaskets() { return owned.has("basket") ? 2 : 1; }
  function send(k) {
    if (state !== "play") return;
    const c = cabins[k];
    if (!c.order) { toastMsg("הקרון הזה עוד לא הזמין"); return; }
    if (baskets.some((b) => b.cabin === k)) { toastMsg("סל כבר בדרך לשם"); return; }
    if (!basket.length) { toastMsg("קודם ממלאים סל ↓"); return; }
    if (baskets.length >= maxBaskets()) { toastMsg("הכבל עסוק – מחכים לסל שיחזור"); return; }
    baskets.push({ cabin: k, items: basket.slice(), X: CA.x, dir: 1, swing: 0, sw: 0 });
    basket = []; basketLand = []; flyers = [];
    sfx.send();
  }
  function answer() {
    if (!ring) return;
    const c = cabins[ring.cabin];
    if (c.order) c.order.t = Math.min(c.order.max, c.order.t + c.order.max * 0.4);
    c.happy = 1.2;
    say(c, "call", 2.6);
    popup("✓ ענית!", c.X, CAB_TOP + 20, "L");
    sfx.answer();
    ring = null;
  }

  function deliver(b) {
    const c = cabins[b.cabin];
    if (!c.order) return;
    const top = CAB_TOP + 26;
    if (sameItems(c.order.items, b.items)) {
      const frac = c.order.t / c.order.max;
      combo = time - lastServe < 6 ? combo + 1 : 1;
      lastServe = time;
      const tip = Math.round((3 + c.order.items.length * 3 + frac * 6) * (1 + 0.5 * (Math.min(combo, 3) - 1)));
      money += tip; shiftTips += tip; served++;
      popup(`+₪${tip}`, c.X, top - 6, "y");
      if (combo > 1) popup(`קומבו ×${Math.min(combo, 3)}`, c.X, top - 18, "L");
      c.order = null; c.cool = rand(1.5, 3.5); c.happy = 1.6;
      say(c, "thanks", 2.4);
      for (let i = 0; i < 16; i++) parts.push({ X: c.X, Y: top + 12, vx: rand(-70, 70), vy: rand(-90, -10), life: rand(0.5, 1), c: pick(["y", "O", "w", "L", "p"]), g: 160 });
      sfx.coin();
    } else {
      c.order.t = Math.max(1.5, c.order.t - c.order.max * 0.35);
      c.mad = 0.8;
      say(c, "wrong", 2.2);
      popup("✗", c.X, top - 6, "r");
      sfx.wrong();
    }
  }

  // ==========================================================================
  //  Update
  // ==========================================================================
  function update(dt) {
    time += dt;
    // menu: let the clock drift for a pretty background
    if (state === "menu") { dark = 0.42 + Math.sin(time * 0.15) * 0.05; }
    clouds.forEach((cl) => { cl.X -= (3 + gust * 30) * dt; if (cl.X < -40) cl.X = W + 10; });
    birds.forEach((b, i) => { b.X -= (8 + i) * dt; if (b.X < -10) b.X = W + 10; });
    parts.forEach((p) => { p.vy += (p.g || 120) * dt; p.X += p.vx * dt; p.Y += p.vy * dt; p.life -= dt; });
    parts = parts.filter((p) => p.life > 0);
    popups.forEach((p) => { p.Y -= 14 * dt; p.t -= dt; });
    popups = popups.filter((p) => p.t > 0);
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
    if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
    flash = Math.max(0, flash - dt * 2);
    flyers.forEach((f) => (f.t += dt / 0.24));
    flyers = flyers.filter((f) => f.t < 1);

    if (state === "finale") {
      endAnim += dt;
      cabins.forEach((c) => { c.phase += dt; c.X += 46 * dt; c.happy = 1; });
      if (Math.random() < 0.5) parts.push({ X: rand(0, W), Y: -4, vx: rand(-20, 20), vy: rand(20, 60), life: 3, c: pick(["y", "O", "L", "p", "g"]), g: 30 });
      if (endAnim > 3.2) { state = "done"; showShiftEnd(true); }
      return;
    }
    if (state !== "play") return;

    const SH = SHIFTS[shiftIdx];
    elapsed += dt;
    clock = lerp(SH.from, SH.to, clamp(elapsed / SH.dur, 0, 1));
    dark = clamp((clock - 16 * 60) / 240, 0, 1);

    updateWind(dt, SH);

    // intercom
    callT -= dt;
    if (!ring && callT <= 0) {
      const k = randi(0, cabins.length - 1);
      ring = { cabin: k, t: 5 };
      sfx.ring();
    }
    if (ring) {
      ring.t -= dt;
      if (Math.floor(ring.t * 2) !== Math.floor((ring.t + dt) * 2)) sfx.ring();
      if (ring.t <= 0) {
        const c = cabins[ring.cabin];
        c.say = { text: pick(NO_ANSWER), t: 3.4, max: 3.4, who: 0 };
        if (c.order) c.order.t = Math.max(1, c.order.t - c.order.max * 0.25); else c.slow = 1;
        c.mad = 0.6;
        ring = null;
      }
      if (!ring) callT = rand(SH.call[0], SH.call[1]);
    }

    // cabins & orders
    const activeN = cabins.filter((c) => c.order).length;
    for (const c of cabins) {
      c.phase += dt; c.happy = Math.max(0, c.happy - dt); c.mad = Math.max(0, c.mad - dt);
      if (c.say) { c.say.t -= dt; if (c.say.t <= 0) c.say = null; }
      if (!c.order) {
        c.cool -= dt;
        if (c.cool <= 0 && activeN < SH.active && !cabins.some((o) => o !== c && o.order && time - o.order.born < 1.2)) {
          c.order = makeOrder(c);
          sfx.order();
          if (Math.random() < 0.6) say(c, "idle", 3.4);
        } else if (!c.say && Math.random() < dt * 0.12) say(c, "idle", 3.4);
        continue;
      }
      c.order.t -= dt;
      if (!c.say && Math.random() < dt * 0.05) say(c, "idle", 3.4);
      if (c.order.t <= 0) {
        strikes++;
        c.mad = 1.4; flash = 1;
        say(c, "angry", 2.8);
        popup("!!!", c.X, CAB_TOP + 20, "r");
        sfx.angry();
        c.order = null; c.cool = rand(3, 5); combo = 0;
        if (strikes >= 3) return failShift();
      }
    }

    // baskets on the cable
    const speed = owned.has("turbo") ? 160 : 100;
    for (const b of baskets) {
      const tx = cabins[b.cabin].X;
      b.sw += dt * 6;
      b.swing = Math.sin(b.sw) * (0.5 + gust * 3);
      if (b.dir > 0) {
        b.X += speed * dt;
        // wind shakes items out
        if (gust > 0.55 && b.items.length && Math.random() < dt * gust * 1.1) {
          const lost = b.items.splice(randi(0, b.items.length - 1), 1)[0];
          drops.push({ id: lost, X: b.X + b.swing, Y: cableY(b.X) + 12, vx: -gust * 30, vy: -20, r: 0 });
          popup("אופס!", b.X, cableY(b.X) + 22, "O");
          sfx.drop();
        }
        if (b.X >= tx) { b.X = tx; deliver(b); b.dir = -1; b.items = []; }
      } else {
        b.X -= speed * 2.2 * dt;
        if (b.X <= CA.x) b.done = true;
      }
    }
    baskets = baskets.filter((b) => !b.done);
    drops.forEach((d) => { d.vy += 200 * dt; d.X += d.vx * dt; d.Y += d.vy * dt; d.r += dt * 8; });
    drops = drops.filter((d) => d.Y < STAND_Y);

    if (elapsed >= SH.dur) endShift();
  }

  function updateWind(dt, SH) {
    if (!SH.gust) { gust = 0; return; }
    gustT -= dt;
    if (gustPhase === "calm" && gustT <= 0) { gustPhase = "warn"; gustP = 0; sfx.wind(); }
    else if (gustPhase === "warn") { gustP += dt / 1.6; gust = 0.15 * gustP; if (gustP >= 1) { gustPhase = "blow"; gustP = 0; } }
    else if (gustPhase === "blow") {
      gustP += dt / 3.2;
      gust = Math.sin(Math.PI * Math.min(1, gustP)) * SH.gust.power;
      if (gustP >= 1) { gustPhase = "calm"; gust = 0; gustT = rand(SH.gust.every[0], SH.gust.every[1]); }
    }
    if (gust > 0.3 && Math.random() < dt * 30 * gust) parts.push({ X: W + 2, Y: rand(10, 150), vx: -rand(160, 260) * gust, vy: 0, life: 2.5, c: "w", g: 0, streak: true });
  }

  function failShift() {
    state = "fail";
    sfx.lose();
    setTimeout(() => showShiftEnd(false), 700);
  }
  function endShift() {
    if (shiftIdx === SHIFTS.length - 1) {
      state = "finale"; endAnim = 0;
      banner = { text: "20:00 · הרכבלית חזרה לפעול!", t: 3.2 };
      ring = null; baskets = [];
      cabins.forEach((c) => { c.order = null; c.say = null; });
      say(cabins[0], "idle", 3, "יאללה לטכניון!!! 🎓");
      say(cabins[2], "idle", 3, "רגע, עכשיו אני מאחר רשמית");
      sfx.win();
      return;
    }
    state = "done";
    sfx.win();
    setTimeout(() => showShiftEnd(true), 400);
  }

  // ==========================================================================
  //  Between shifts: stars, stats and the shop
  // ==========================================================================
  function showShiftEnd(ok) {
    const SH = SHIFTS[shiftIdx];
    const last = shiftIdx === SHIFTS.length - 1;
    const stars = ok ? 1 + (shiftTips >= SH.stars[0] ? 1 : 0) + (shiftTips >= SH.stars[1] && strikes === 0 ? 1 : 0) : 0;
    $("seTag").textContent = `משמרת ${shiftIdx + 1} · ${SH.title}`;
    $("seStars").innerHTML = ok ? [0, 1, 2].map((i) => `<span style="animation-delay:${0.2 + i * 0.2}s">${i < stars ? "⭐" : "☆"}</span>`).join("") : "";
    $("seStats").innerHTML = `<div>סלים שהגיעו<b>${served}</b></div><div>טיפים<b>₪${shiftTips}</b></div><div>בקופה<b>₪${money}</b></div>`;
    const shop = $("shop");
    shop.innerHTML = "";
    if (!ok) {
      $("seTitle").textContent = "הקרונות התמרדו 😵";
      $("seText").textContent = "שלושה נוסעים עצבניים מדי. כבר פתחו על זה קבוצת וואטסאפ. ננסה שוב?";
      $("seNext").textContent = "לנסות שוב ↻";
    } else if (last) {
      $("seTitle").textContent = "הרכבלית זזה! 🎉";
      $("seText").textContent = `20:00, כולם בדרך לטכניון (באיחור רשמי). הרווחת ₪${money} ו-0 תואר. אבל הסטודנטים זוכרים.`;
      $("seNext").textContent = "עוד ערב בחיפה ↻";
    } else {
      $("seTitle").textContent = shiftIdx === 0 ? "השמש מתחילה לשקוע" : "כבר לילה בחיפה";
      $("seText").textContent = shiftIdx === 0
        ? "עכשיו מגיעה הרוח מהים 💨 כשהשרוול על הגג מתנפח – לא שולחים סלים. נפתח בדוכן: 🧆 פלאפל"
        : "קר בלילה, אז נפתחה 🧣 שמיכה. והרוח? רק מתחזקת.";
      $("seNext").textContent = "למשמרת הבאה ▶";
      UPGRADES.forEach((u) => {
        const has = owned.has(u.id);
        const el = document.createElement("div");
        el.className = "item" + (has ? " owned" : "");
        el.innerHTML = `<span class="ic">${u.icon}</span><span class="txt"><b>${u.name}</b>${u.desc}</span>`;
        const btn = document.createElement("button");
        btn.className = "px-btn";
        btn.textContent = has ? "יש ✓" : `₪${u.cost}`;
        btn.disabled = has || money < u.cost;
        btn.addEventListener("click", () => { if (money >= u.cost && !owned.has(u.id)) { money -= u.cost; owned.add(u.id); sfx.coin(); showShiftEnd(true); } });
        el.appendChild(btn);
        shop.appendChild(el);
      });
    }
    $("shiftEnd").classList.add("show");
    $("shiftEnd").dataset.ok = ok ? "1" : "0";
  }
  $("seNext").addEventListener("click", () => {
    $("shiftEnd").classList.remove("show");
    const ok = $("shiftEnd").dataset.ok === "1";
    if (!ok) return startShift(shiftIdx);
    if (shiftIdx === SHIFTS.length - 1) { owned = new Set(); return startShift(0); }
    startShift(shiftIdx + 1);
  });
  $("startBtn").addEventListener("click", () => { audio(); $("menu").classList.remove("show"); startShift(0); });

  // ==========================================================================
  //  Drawing — background (cached per time of day)
  // ==========================================================================
  const SKY = [
    ["#1e6fc4", "#2b8fe0", "#45a9ef", "#73c7f5", "#a5dff5", "#d8f2f0"],
    ["#3b4fb0", "#6a5fc4", "#b55088", "#f6757a", "#f77622", "#feae34"],
    ["#1d2152", "#2d2766", "#4d2660", "#7a3468", "#b0496a", "#d9725f"],
    ["#0b0a1e", "#100f2c", "#15143a", "#1b1b48", "#222456", "#2a2d63"],
  ];
  const tod = (k) => keyed(k, dark);
  let bgDark = -1;
  function drawBackground() {
    if (Math.abs(bgDark - dark) < 0.004) return;
    bgDark = dark;
    ctx = bx;
    const d = dark;
    // sky bands with dithered seams
    const bands = SKY[0].map((_, i) => keyed([SKY[0][i], SKY[1][i], SKY[2][i], SKY[3][i]], d));
    const bh = [24, 22, 20, 18, 16, 14];
    let y = 0;
    bands.forEach((c, i) => {
      px(0, y, c, W, i === bands.length - 1 ? 112 - y : bh[i]);
      if (i) dither(0, y, W, 3, c, bands[i - 1]);
      y += bh[i];
    });
    // far Carmel ridge
    const ridge = tod(["#8aa3c4", "#a85a8a", "#4a3470", "#1a1840"]), ridgeTop = tod(["#b3c6dd", "#d77f9f", "#6a4a8a", "#2a2654"]);
    for (let X = 0; X < W; X++) { const t = ridgeY(X); px(X, t, ridge, 1, 150 - t); px(X, t, ridgeTop); }
    // houses
    const lit = clamp((d - 0.3) / 0.35, 0, 1);
    for (const h of houses) {
      px(h.X, h.Y, tod(["#ead4aa", "#e8b796", "#7d6a9a", "#2f2c5c"]), h.w, 3);
      if (h.lit) px(h.X + 1, h.Y + 1, lit > 0.2 ? mixHex("#7d6a9a", "#fee761", lit) : tod(["#3a4466", "#5a4a7a", "#3a3466", "#1b1b48"]), 1, 1);
    }
    // sea
    const seaTop = tod(["#2b8fe0", "#7a5fbf", "#3a2f73", "#141238"]), seaBot = tod(["#124e89", "#3b3f9a", "#221d55", "#0b0a22"]);
    px(0, 112, seaTop, 200, 34);
    dither(0, 112, 200, 2, seaTop, tod(["#8de5f0", "#f6a07a", "#8a4a7a", "#2a2d63"]));
    px(0, 124, seaBot, 200, 22); dither(0, 124, 200, 2, seaBot, seaTop);
    // port cranes
    const crane = tod(["#3a4466", "#3a2f5a", "#1f1a3e", "#0d0c22"]);
    [[100, 14], [118, 19], [86, 10]].forEach(([cx, h]) => {
      px(cx, 112 - h, crane, 2, h); px(cx + 6, 112 - h, crane, 2, h);
      px(cx - 8, 112 - h, crane, 24, 2);
      line(cx + 4, 112 - h - 5, cx - 8, 112 - h, crane); line(cx + 4, 112 - h - 5, cx + 15, 112 - h, crane);
      px(cx + 12, 112 - h + 2, crane, 1, 6); px(cx + 10, 112 - h + 8, tod(["#f77622", "#be4a2f", "#5a2a3a", "#2a1a2a"]), 4, 3);
    });
    // near hill
    const hill = tod(["#3e8948", "#3f6a52", "#26404a", "#121a33"]), hillTop = tod(["#63c74d", "#6f9a5a", "#3f5a55", "#1e2a45"]);
    for (let X = 0; X < W; X++) { const g = groundY(X); px(X, g, hill, 1, 150 - g); px(X, g, hillTop); }
    // Bahá'í terraces + dome
    const glow = clamp((d - 0.35) / 0.4, 0, 1);
    for (let i = 0; i < 10; i++) {
      const X = 232 + i * 5, Y = groundY(X) + 3;
      px(X - 9, Y, tod(["#7fd36a", "#8fb06a", "#4a6a5a", "#22324a"]), 21 - i, 1);
      px(X - 8, Y + 1, glow > 0 ? mixHex("#feae34", "#fee761", glow) : "#feae34", 19 - i, 1);
    }
    const dX = 254, dY = groundY(254) + 1;
    px(dX - 5, dY - 6, tod(["#ead4aa", "#e8b796", "#8a7a9a", "#4a4a6a"]), 11, 7);
    disc(dX, dY - 7, 3, glow > 0.3 ? "#fee761" : "#feae34"); px(dX, dY - 12, "y");
    // trees
    [[178, 0], [196, 1], [214, 0], [292, 1], [312, 0], [352, 1]].forEach(([X, k]) => {
      const g = groundY(X);
      px(X, g - 3, tod(["#733e39", "#5a3a3a", "#3a2a3a", "#1a1426"]), 1, 3);
      disc(X, g - 6, 3, tod(k ? ["#265c42", "#2a4a40", "#1a3038", "#0f1a2a"] : ["#3e8948", "#3a6a4a", "#22404a", "#121c30"]));
      px(X - 1, g - 9, tod(["#63c74d", "#6f9a5a", "#3f5a55", "#1e2a45"]), 2, 1);
    });
    // Technion building on the top right
    const tw = tod(["#c0cbdc", "#d8b0b8", "#6a6a8a", "#2a2a4a"]);
    const TY = groundY(372) - 16;
    px(362, TY, tw, 22, 18); px(362, TY, tod(["#ffffff", "#ffd8c8", "#8a8aaa", "#3a3a5a"]), 22, 2);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) px(365 + i * 5, TY + 4 + j * 4, glow > 0.2 ? mixHex("#124e89", "#fee761", glow) : "#124e89", 3, 2);
    // the bottom station (לב המפרץ)
    const wall = tod(["#c0cbdc", "#d8b8c0", "#5a5a7a", "#2a2a4a"]), wallHi = tod(["#ffffff", "#ffe0d0", "#7a7a9a", "#3a3a5a"]);
    px(0, 96, wall, 52, 54); px(0, 96, wallHi, 52, 2); px(51, 96, tod(["#8b9bb4", "#9a7a8a", "#3a3a5a", "#1a1a32"]), 1, 54);
    px(4, 116, "#3a4466", 16, 34); px(5, 117, tod(["#8de5f0", "#f6a07a", "#5a4a7a", "#2a2a4a"]), 14, 12);
    px(26, 112, "#181425", 20, 12); px(27, 113, glow > 0.1 ? mixHex("#ead4aa", "#fee761", glow) : "#ead4aa", 18, 10);
    // sign
    px(0, 84, "#a22633", 54, 13); px(0, 84, "#e43b44", 54, 11); px(0, 84, "#f6757a", 54, 1);
    ctx = x;
  }

  // ==========================================================================
  //  Drawing — everything that moves
  // ==========================================================================
  function render() {
    texts = [];
    ctx = x;
    drawBackground();
    // the Haifa backdrop, pushed up so the stand can take the bottom
    x.save();
    x.translate(0, -BG_OFF);
    textOff = -BG_OFF;
    x.drawImage(bg, 0, 0);
    const d = dark;
    const sa = clamp((d - 0.55) / 0.3, 0, 1);
    if (sa > 0) for (const s of stars) if ((Math.sin(time * 2 + s.tw) + 1) / 2 < sa) px(s.X, s.Y + BG_OFF * 0.6, s.tw > 3 ? "w" : "c");
    const sunY = lerp(48, 120, clamp(d / 0.6, 0, 1));
    if (d < 0.62) {
      disc(84, Math.round(sunY), 11, d < 0.3 ? "y" : "O");
      disc(84, Math.round(sunY), 8, d < 0.3 ? "w" : "y");
      if (sunY > 100) { const st = tod(["#2b8fe0", "#7a5fbf", "#3a2f73", "#141238"]); px(60, 112, st, 50, 12); }
    }
    if (d > 0.6) {
      const my = Math.round(lerp(80, 44, clamp((d - 0.6) / 0.35, 0, 1)));
      disc(258, my, 7, "#fff6d5"); px(255, my - 2, "#e8dcb8", 2, 2); px(260, my + 2, "#e8dcb8", 3, 2);
    }
    const cw = tod(["#ffffff", "#ffd0c0", "#8a6a9a", "#2a2a50"]), cs = tod(["#c0cbdc", "#f0a0a0", "#6a4a7a", "#1e1e40"]);
    for (const cl of clouds) { px(cl.X, cl.Y + 30, cw, cl.w, 4); px(cl.X + 4, cl.Y + 27, cw, cl.w * 0.55, 3); px(cl.X + 2, cl.Y + 34, cs, cl.w - 4, 2); }
    if (d < 0.7) for (const b of birds) { const f = Math.floor(time * 4 + b.X) % 2, by = b.Y + 34; px(b.X, by + f, "k"); px(b.X + 1, by - 1 + f * 2, "k"); px(b.X + 2, by, "k"); px(b.X + 3, by - 1 + f * 2, "k"); px(b.X + 4, by + f, "k"); }
    const glit = d < 0.6 ? "y" : "c";
    for (let i = 0; i < 6; i++) { const w = 10 - i, gx = 84 - w / 2 + Math.round(Math.sin(time * 2 + i) * 2); px(gx, 115 + i * 4, glit, w, 1); }
    for (let i = 0; i < 8; i++) { const X = (i * 29 + Math.floor(time * (6 + gust * 30))) % 200; px(X, 118 + (i % 4) * 6, tod(["#8de5f0", "#f6a07a", "#6a4a8a", "#2a2d63"]), 4, 1); }
    const lamp = clamp((d - 0.4) / 0.3, 0, 1);
    if (lamp > 0 && Math.sin(time * 3) > 0) { px(101, 96, "r"); px(119, 91, "r"); }
    x.restore();
    textOff = 0;

    // the main cable, close up
    const cc = d > 0.6 ? "#8b9bb4" : "#181425";
    for (let X = 0; X < W; X++) { const y = Math.round(cableY(X)); px(X, y, cc); px(X, y + 1, d > 0.6 ? "#5a6988" : "#3a4466"); }

    for (const b of baskets) drawBasketOnCable(b);
    for (const dr of drops) spriteS(ICON[dr.id], dr.X - 10, dr.Y - 10, 2);

    cabins.forEach((c, k) => drawCabin(c, k));
    cabins.forEach((c, k) => drawTicket(c, k));
    cabins.forEach((c) => drawSpeech(c));

    for (const p of parts) {
      if (p.streak) { px(p.X, p.Y, mixHex("#ffffff", tod(["#73c7f5", "#f6757a", "#4d2660", "#1b1b48"]), 0.4), 8, 1); continue; }
      px(p.X, p.Y, p.c, 2, 2);
    }
    for (const p of popups) text(p.text, p.X, p.Y, 15, p.c, "k");

    drawCounter();

    if (banner) {
      const a = Math.min(1, banner.t * 2);
      if (a > 0.1) { const w = textW(banner.text, 18) + 18; box(Math.round(W / 2 - w / 2), 44, Math.round(w), 20, "#262b44"); text(banner.text, W / 2, 54, 18, "y", "k"); }
    }
    if (toast) { const w = textW(toast.text, 13) + 14; box(Math.round(W / 2 - w / 2), 98, Math.round(w), 14, "#ffffff"); text(toast.text, W / 2, 105, 13, "k", null); }
    if (gustPhase !== "calm" && state === "play") {
      const on = Math.floor(time * 4) % 2 === 0 || gustPhase === "blow";
      if (on) { const w = textW("רוח מהים! מחכים רגע", 13) + 14; box(Math.round(W / 2 - w / 2), 98, Math.round(w), 14, "#2ce8f5"); text("רוח מהים! מחכים רגע", W / 2, 105, 13, "k", null); }
    }
    if (flash > 0) { x.globalAlpha = flash * 0.25; px(0, 0, "r", W, H); x.globalAlpha = 1; }

    sx.imageSmoothingEnabled = false;
    sx.drawImage(world, 0, 0, W * S, H * S);
    for (const t of texts) {
      const img = textImg(t.str, t.size, t.color, t.outline);
      let X = Math.round(t.X * S), Y = Math.round(t.Y * S - img.h / 2);
      if (t.align === "center") X -= Math.round(img.w / 2); else if (t.align === "right") X -= img.w;
      sx.drawImage(img.c, X, Y);
    }
  }

  function cabinSway(c) { return Math.round(Math.sin(c.phase * 1.5) * (0.5 + gust * 3)); }
  function seatX(i, n) { return n === 1 ? 0 : n === 2 ? (i ? 15 : -15) : (i - 1) * 27; }

  function drawCabin(c, k) {
    const sw = cabinSway(c);
    const cx = Math.round(c.X + sw), top = Math.round(cableY(c.X));
    const X0 = cx - CAB_W / 2, Y0 = CAB_TOP;
    const night = clamp((dark - 0.4) / 0.3, 0, 1);
    // wheel on the cable + hanger arm
    px(c.X - 6, top - 3, "#181425", 12, 4); px(c.X - 5, top - 2, "#5a6988", 10, 2);
    line(c.X, top + 1, cx, Y0 - 4, "#181425"); line(c.X + 1, top + 1, cx + 1, Y0 - 4, "#3a4466");
    px(cx - 14, Y0 - 4, "#181425", 29, 4); px(cx - 13, Y0 - 3, "#5a6988", 27, 2);
    // hover glow when a basket is ready
    if (state === "play" && hoverCabin === k && c.order && basket.length) box(X0 - 3, Y0 - 3, CAB_W + 6, CAB_H + 6, "y", "y");
    // body
    box(X0, Y0, CAB_W, CAB_H, "#e43b44");
    px(X0 + 1, Y0 + 1, "#f6757a", CAB_W - 2, 3);
    px(X0 + 1, Y0 + CAB_H - 8, "#a22633", CAB_W - 2, 7);
    px(X0 + 1, Y0 + CAB_H - 9, "#181425", CAB_W - 2, 1);
    // big window
    const wx = X0 + 5, wy = Y0 + 7, ww = CAB_W - 10, wh = 42;
    px(wx - 1, wy - 1, "#181425", ww + 2, wh + 2);
    px(wx, wy, night > 0 ? mixHex("#bfeffa", "#ffe2a0", night) : "#bfeffa", ww, wh);
    px(wx, wy + wh - 12, night > 0 ? mixHex("#8de5f0", "#e8c080", night) : "#8de5f0", ww, 12);
    // passengers, big
    const n = c.ppl.length;
    const mood = c.mad > 0 ? "mad" : c.happy > 0 ? "happy" : (c.order && c.order.t / c.order.max < 0.3) || gust > 0.5 ? "panic" : "calm";
    c.ppl.forEach((p, i) => {
      const hx = cx + seatX(i, n) - 10;
      const isWho = c.order && c.order.who === i;
      const m = mood === "panic" && !isWho && !(gust > 0.5) ? "calm" : mood;
      const bob = m === "panic" ? (Math.floor(time * 10 + i) % 2) : m === "happy" ? -(Math.floor(time * 6 + i) % 2) : 0;
      drawFace(p, hx, wy + 16 + bob, m);
    });
    // glass shine
    px(wx + 2, wy + 2, "#ffffff", 6, 1); px(wx + 2, wy + 3, "#ffffff", 1, 4);
    px(wx + ww - 12, wy + 2, "#ffffff", 3, 1);
    // door seam + number
    px(cx, Y0 + CAB_H - 8, "#181425", 1, 7);
    box(X0 + 4, Y0 + CAB_H - 7, 12, 6, "#ffffff");
    text(String(k + 1), X0 + 10, Y0 + CAB_H - 4, 9, "k", null);
    // patience meter (vertical, on the side)
    if (c.order) {
      const f = clamp(c.order.t / c.order.max, 0, 1), mh = CAB_H - 4;
      const mx = X0 + CAB_W + 3;
      box(mx, Y0 + 2, 7, mh, "#262b44");
      const fill = Math.round((mh - 2) * f);
      px(mx + 1, Y0 + 3 + (mh - 2 - fill), f > 0.6 ? "g" : f > 0.3 ? "O" : "r", 5, fill);
      for (let j = 1; j < 4; j++) px(mx + 1, Y0 + 2 + Math.round(mh * j / 4), "#181425", 5, 1);
    }
    // ringing intercom
    if (ring && ring.cabin === k) {
      const shake = Math.floor(time * 16) % 2;
      const ix = X0 + 7 + shake, iy = Y0 + 9;
      box(ix - 1, iy - 1, 24, 23, "#ffffff");
      spriteS(ICON.phone, ix + 1, iy + 1, 2);
      px(ix + 23, iy - 4, "r", 2, 6); px(ix + 23, iy + 4, "r", 2, 2);
      px(ix - 1, iy + 23, "#181425", 24, 3);
      px(ix, iy + 24, "r", Math.round(22 * ring.t / 5), 1);
    }
  }

  function drawTicket(c, k) {
    if (!c.order) return;
    const o = c.order, n = o.items.length;
    const w = n * 22 + 6, h = 24;
    const cx = Math.round(c.X + cabinSway(c));
    const X0 = cx - Math.round(w / 2), Y0 = CAB_TOP + CAB_H + 2;
    const age = time - o.born;
    const drop = age < 0.25 ? -Math.round((0.25 - age) * 30) : 0;
    const urgent = o.t / o.max < 0.3, sh = urgent ? (Math.floor(time * 14) % 2) : 0;
    px(cx - 8, CAB_TOP + CAB_H, "#181425", 1, 3 + drop); px(cx + 8, CAB_TOP + CAB_H, "#181425", 1, 3 + drop);
    const busy = baskets.some((b) => b.cabin === k);
    box(X0 + sh, Y0 + drop, w, h, busy ? "#c0cbdc" : "#fff8e0");
    px(X0 + 1 + sh, Y0 + 1 + drop, busy ? "#8b9bb4" : "#ead4aa", w - 2, 1);
    o.items.forEach((id, i) => spriteS(ICON[id], X0 + w - 24 - i * 22 + sh, Y0 + 2 + drop, 2));
  }

  function wrapText(str, maxW, size) {
    const words = noEmoji(str).split(" "), lines = [];
    let cur = "";
    for (const wd of words) {
      const t = cur ? cur + " " + wd : wd;
      if (textW(t, size, null) > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
  }

  function drawSpeech(c) {
    if (!c.say || c.say.t * 3 < 0.3) return;
    const size = 13;
    const lines = wrapText(c.say.text, 104, size);
    const lw = Math.max(...lines.map((l) => textW(l, size, null)));
    const w = Math.round(lw + 10), h = lines.length * 8 + 5;
    const cx = Math.round(c.X + cabinSway(c));
    const X0 = clamp(cx - Math.round(w / 2), 2, W - w - 2), Y0 = CAB_TOP - 6 - h;
    box(X0, Y0, w, h, "#ffffff");
    px(X0 + 1, Y0 + h - 2, "#c0cbdc", w - 2, 1);
    const who = c.say.who != null ? c.say.who : c.order ? c.order.who : 0;
    const tx = clamp(cx + seatX(who, c.ppl.length), X0 + 4, X0 + w - 5);
    px(tx - 2, Y0 + h - 1, "#ffffff", 5, 1); px(tx - 1, Y0 + h, "#ffffff", 3, 1); px(tx, Y0 + h + 1, "#ffffff", 1, 1);
    px(tx - 3, Y0 + h - 1, "#181425"); px(tx + 3, Y0 + h - 1, "#181425"); px(tx - 2, Y0 + h, "#181425"); px(tx + 2, Y0 + h, "#181425"); px(tx - 1, Y0 + h + 1, "#181425"); px(tx + 1, Y0 + h + 1, "#181425"); px(tx, Y0 + h + 2, "#181425");
    lines.forEach((l, i) => text(l, X0 + w / 2, Y0 + 6.5 + i * 8, size, "k", null));
  }

  function drawBasketOnCable(b) {
    const Y = Math.round(cableY(b.X));
    const off = Math.round(b.swing);
    px(b.X - 3, Y - 2, "#feae34", 6, 3);
    line(b.X, Y + 1, b.X + off, Y + 8, "#181425");
    const X0 = Math.round(b.X + off - 9), Y0 = Y + 8;
    b.items.forEach((id, i) => sprite(ICON[id], X0 + i * 5 - (b.items.length - 1) * 2, Y0 - 3 - i));
    sprite(["kkkkkkkkkkkkkkkkkk", "kMmMmMmMmMmMmMmMmk", "kmMmMmMmMmMmMmMmMk", ".kMmMmMmMmMmMmMmk.", "..kkkkkkkkkkkkkk.."], X0, Y0 + 5);
  }

  // ---------------------------------------------------------------- the stand
  function drawCounter() {
    const night = clamp((dark - 0.4) / 0.3, 0, 1);
    // awning
    for (let i = 0; i < W; i += 16) { const c = (i / 16) % 2 ? "w" : "r"; px(i, STAND_Y, c, 16, 6); }
    for (let i = 0; i < W; i += 16) { const c = (i / 16) % 2 ? "w" : "r"; disc(i + 8, STAND_Y + 6, 3, c); }
    px(0, STAND_Y, "#181425", W, 1);
    // header board
    px(0, 122, "#3e2731", W, 15); px(0, 136, "#181425", W, 1);
    for (let i = 0; i < W; i += 16) { const c = (i / 16) % 2 ? "w" : "r"; disc(i + 8, STAND_Y + 6, 3, c); }
    drawHUD();
    // steel counter
    const steel = mixHex("#a8b4c8", "#6a7490", night), steelHi = mixHex("#d8e0ec", "#8a94b0", night), steelLo = mixHex("#7a869e", "#4a5470", night);
    px(0, 137, steel, W, 79);
    px(0, 137, steelHi, W, 2);
    for (let i = 0; i < W; i += 48) px(i, 139, steelLo, 1, 66);
    px(0, 204, "#181425", W, 1); px(0, 205, steelLo, W, 11); px(0, 205, steelHi, W, 1);
    if (night > 0) { x.globalAlpha = 0.18 * night; px(0, 137, "O", W, 70); x.globalAlpha = 1; }
    // trays
    for (let i = 0; i < ITEMS.length; i++) drawTray(i);
    drawBasket();
    for (const f of flyers) {
      const tgt = slotPos(f.slot, basket.length), t = clamp(f.t, 0, 1);
      spriteS(ICON[f.id], lerp(f.sx, tgt.X, t), lerp(f.sy, tgt.Y, t) - Math.sin(Math.PI * t) * 22, 2);
    }
  }

  function trayRect(i) {
    const back = i < 3, col = i % 3;
    return back ? { x: [196, 104, 12][col], y: 141, w: 84, h: 26, inset: 6 } : { x: [192, 98, 4][col], y: 171, w: 90, h: 30, inset: 5 };
  }

  function trap(r, inset, c) {
    for (let j = 0; j < r.h; j++) { const s = Math.round(inset * (1 - j / (r.h - 1))); px(r.x + s, r.y + j, c, r.w - s * 2, 1); }
  }

  function drawTray(i) {
    const it = ITEMS[i], r = trayRect(i), locked = i >= SHIFTS[shiftIdx].items;
    const hover = hoverBin === i && !locked && state === "play";
    if (hover) trap({ x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 }, r.inset, "#fee761");
    trap(r, r.inset, "#181425");
    trap({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 }, r.inset, locked ? "#5a6988" : "#e8eef6");
    const inner = { x: r.x + 4, y: r.y + 3, w: r.w - 8, h: r.h - 6 };
    trap(inner, r.inset - 1, locked ? "#3a4466" : TRAY_BG[i]);
    if (locked) {
      spriteS(ICON.lock, r.x + r.w / 2 - 10, r.y + r.h / 2 - 10, 2);
      return;
    }
    // a heaped pile of the thing
    const big = r.h > 28;
    const cols = 6, rows = big ? 2 : 1;
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
      const X = inner.x + 3 + cc * ((inner.w - 14) / (cols - 1)) + (rr % 2 ? 5 : 0);
      sprite(ICON[it.id], X, inner.y + 1 + rr * 9);
    }
    spriteS(ICON[it.id], r.x + r.w / 2 - 22, r.y - 4 + (big ? 6 : 0), 2);
    spriteS(ICON[it.id], r.x + r.w / 2 + 2, r.y - 6 + (big ? 6 : 0), 2);
    // tag on a stick with the name
    const tagW = Math.round(textW(it.name, 12, null) + 14);
    const tx = r.x + r.w - tagW - 4, ty = r.y + r.h - 10;
    px(tx + tagW - 4, ty - 4, "#181425", 1, 5);
    box(tx, ty, tagW, 11, "#ffffff");
    px(tx + 1, ty + 1, "#2ce8f5", 3, 9);
    text(it.name, tx + tagW / 2 + 2, ty + 5.5, 12, "k", null);
    text(String(i + 1), tx + 2.5, ty + 5.5, 8, "k", null);
  }

  function slotPos(i, n) {
    const cx = BASKET.x + BASKET.w / 2;
    return { X: cx - (Math.max(n, 1) * 24) / 2 + i * 24 + 2, Y: BASKET.y - 9 };
  }

  function drawBasket() {
    const B = BASKET, cx = B.x + B.w / 2;
    // spare baskets stacked behind (like a stack of pitas)
    for (let s = 0; s < 3; s++) {
      const y = 140 + s * 4;
      px(B.x + 8, y, "#181425", B.w - 16, 4); px(B.x + 9, y + 1, s % 2 ? "#c98a55" : "#e4a672", B.w - 18, 2);
    }
    const fy = B.y + 11;
    px(B.x + 4, B.y + 4, "#7a4a2a", B.w - 8, 8);
    basket.forEach((id, i) => {
      const land = basketLand[i] || 0;
      if (time < land) return;
      const age = time - land;
      const bounce = age < 0.25 ? -Math.round(Math.sin((age / 0.25) * Math.PI) * 4) : 0;
      const p = slotPos(i, basket.length);
      spriteS(ICON[id], p.X, p.Y + bounce, 2);
    });
    box(B.x, fy, B.w, B.h - 11, "#e4a672");
    for (let j = fy + 3; j < B.y + B.h - 2; j += 4) px(B.x + 2, j, "#b86f50", B.w - 4, 1);
    for (let i = B.x + 4; i < B.x + B.w - 3; i += 6) for (let j = fy + 2; j < B.y + B.h - 3; j += 8) px(i + ((j / 4) % 2 ? 3 : 0), j, "#c98a55", 2, 3);
    px(B.x - 2, fy - 2, "#181425", B.w + 4, 1); px(B.x - 1, fy - 1, "#ead4aa", B.w + 2, 3); px(B.x - 1, fy + 2, "#b86f50", B.w + 2, 1);
    px(B.x - 4, fy, "#181425", 3, 10); px(B.x + B.w + 1, fy, "#181425", 3, 10);
    const ready = basket.length > 0, blink = ready && Math.floor(time * 3) % 2 === 0;
    box(cx - 38, fy + 9, 76, 13, ready ? "#262b44" : "#c98a55", ready ? "#181425" : "#b86f50");
    text(ready ? "לחצו על הקרון" : "הסל שלך", cx + (ready ? 4 : 0), fy + 15.5, 12, ready ? (blink ? "y" : "w") : "#5a3a22", null);
    if (ready) { const ac = blink ? "y" : "w", ax = cx - 33, ay = fy + 11 - (blink ? 1 : 0); for (let r = 0; r < 4; r++) px(ax + 3 - r, ay + r, ac, r * 2 + 1, 1); px(ax + 2, ay + 4, ac, 3, 4); }
    // trash
    const T = TRASH, can = basket.length > 0;
    box(T.x, T.y, T.w, T.h, can ? "#e43b44" : "#5a6988");
    px(T.x + 1, T.y + 1, can ? "#f6757a" : "#8b9bb4", T.w - 2, 1);
    text("לפח ✕", T.x + T.w / 2, T.y + 5.5, 11, "w", null);
  }

  function drawHUD() {
    const hh = Math.floor(clock / 60), mm = Math.floor(clock % 60);
    box(4, 123, 56, 13, "#262b44");
    sprite(dark < 0.6 ? ICON.sun : ICON.moon, 48, 125);
    text(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, 25, 129.5, 12, "y", null);
    box(64, 123, 56, 13, "#262b44");
    text("רוח", 110, 129.5, 10, "w", null);
    px(68, 128, "#181425", 30, 4);
    const wv = SHIFTS[shiftIdx].gust ? Math.round(28 * Math.max(gust, 0.08 + Math.sin(time) * 0.04)) : 2;
    px(69, 129, gust > 0.55 ? "r" : gust > 0.25 ? "O" : "L", Math.max(1, wv), 2);
    box(MUTE.x, MUTE.y, MUTE.w, MUTE.h, "#262b44");
    sprite(ICON.note, MUTE.x + 4, MUTE.y + 3);
    if (muted) line(MUTE.x + 2, MUTE.y + 11, MUTE.x + 14, MUTE.y + 2, "r");
    box(144, 123, 50, 13, "#262b44");
    text(`₪${money}`, 169, 129.5, 12, "y", null);
    text("דוכן החילוץ", 246, 129.5, 14, "y", "R");
    box(W - 86, 123, 82, 13, "#262b44");
    text(`משמרת ${shiftIdx + 1}`, W - 28, 129.5, 11, "w", null);
    for (let i = 0; i < 3; i++) {
      const X = W - 81 + i * 8, used = i < strikes;
      px(X, 126, used ? "r" : "g", 6, 6); px(X + 1, 128, "k"); px(X + 4, 128, "k"); px(X + 1, 130, "k", 4, 1);
    }
  }

  // big, expressive pixel faces for the close-up cabins (drawn at 2x)
  function faceRows(p, mood, blink) {
    const set = (rows, r, c, ch) => { rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); };
    if (p.type === "dog") {
      const R = ["hh.ssss.hh", "hhsssssshh", "hhskwskwhh", "hhsssssshh", ".hsYYYYsh.", "..YYkkYY..", "..YYYYYY..", "...YYYY...", "...rrrr...", ".........."];
      if (blink) { R[2] = "hhskksskkh".slice(0, 10); }
      if (mood === "happy") R[6] = "..YYppYY..";
      if (mood === "panic" || mood === "mad") R[6] = "..YkkkkY..";
      return R;
    }
    const R = [
      "..hhhhhh..",
      ".hhhhhhhh.",
      "hhsssssshh",
      "hssssssssh",
      "ssssssssss",
      "ssssssssss",
      "scssnnsscs",
      ".ssssssss.",
      "..ssssss..",
      "...ssss...",
      ".XXXwwXXX.",
      "XXXXXXXXXX",
      "XXXXXXXXXX",
    ];
    if (p.long) { for (let r = 2; r < 8; r++) { set(R, r, 0, "h"); set(R, r, 9, "h"); } }
    // eyes
    if (blink || mood === "happy") {
      [2, 3, 6, 7].forEach((c) => set(R, 5, c, "k"));
      if (mood === "happy") { set(R, 4, 2, "k"); set(R, 4, 7, "k"); set(R, 5, 2, "s"); set(R, 5, 7, "s"); }
    } else if (mood === "panic") {
      [2, 3, 6, 7].forEach((c) => { set(R, 3, c, "w"); set(R, 4, c, "w"); });
      [2, 3, 6, 7].forEach((c) => set(R, 5, c, "k"));
    } else {
      set(R, 4, 2, "k"); set(R, 4, 3, "w"); set(R, 4, 6, "k"); set(R, 4, 7, "w");
      [2, 3, 6, 7].forEach((c) => set(R, 5, c, "k"));
    }
    // brows
    if (mood === "mad") { set(R, 3, 1, "b"); set(R, 3, 2, "b"); set(R, 4, 3, "b"); set(R, 4, 6, "b"); set(R, 3, 7, "b"); set(R, 3, 8, "b"); }
    else if (mood === "panic") { set(R, 2, 2, "b"); set(R, 2, 3, "b"); set(R, 2, 6, "b"); set(R, 2, 7, "b"); }
    // mouth
    if (mood === "happy") { R[7] = ".smttttms."; R[8] = "..smmmms.."; }
    else if (mood === "panic") { set(R, 7, 4, "m"); set(R, 7, 5, "m"); set(R, 8, 4, "m"); set(R, 8, 5, "m"); set(R, 3, 9, "d"); set(R, 4, 9, "d"); }
    else if (mood === "mad") { [3, 4, 5, 6].forEach((c) => set(R, 7, c, "m")); set(R, 8, 2, "m"); set(R, 8, 7, "m"); }
    else { set(R, 7, 4, "m"); set(R, 7, 5, "m"); set(R, 7, 3, "Q"); set(R, 7, 6, "Q"); }
    // glasses
    if (p.glasses) { [1, 4, 5, 8].forEach((c) => set(R, 4, c, "g")); [1, 2, 3, 4, 5, 6, 7, 8].forEach((c) => { if (R[3][c] === "s") set(R, 3, c, "g"); }); }
    // hats & hair by type
    if (p.type === "grandma") { R.unshift("...hhhh..."); for (let r = 3; r < 7; r++) { set(R, r, 0, "h"); set(R, r, 9, "h"); } set(R, 11, 3, "w"); set(R, 11, 6, "w"); set(R, 11, 4, "w"); set(R, 11, 5, "w"); }
    if (p.type === "soldier") { R[0] = "..GGGGGGG."; R[1] = ".GGGGGGGyG"; R[2] = "hhsssssshh".replace(/h/g, "G"); }
    if (p.type === "tourist") { R[0] = "..OOOOOO.."; R[1] = "OOOOOOOOOO"; set(R, 11, 4, "k"); set(R, 11, 5, "k"); set(R, 10, 4, "k"); set(R, 10, 5, "k"); }
    return R;
  }

  function drawFace(p, X, Y, mood) {
    const blink = (time * 1.3 + p.blink) % 5 < 0.14;
    const R = faceRows(p, mood, blink);
    const skin = mood === "mad" ? mixHex(col(p.skin), "#e43b44", 0.4) : col(p.skin);
    const hair = col(p.hair);
    const map = { h: hair, s: skin, w: "#ffffff", k: "#181425", b: "#181425", n: col("Q"), c: "#f6757a", m: "#6a1a2a", t: "#ffffff", d: "#2ce8f5", g: "#181425", X: col(p.shirt || "s"), Y: "#ead4aa", r: "#e43b44", p: "#f6757a", G: "#3e8948", O: "#feae34", y: "#fee761", Q: col("Q") };
    const top = Y - (R.length - 13) * 2;
    for (let j = 0; j < R.length; j++) {
      const row = R[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === ".") continue;
        ctx.fillStyle = map[ch] || col(ch);
        ctx.fillRect(Math.round(X + i * 2), Math.round(top + j * 2), 2, 2);
      }
    }
  }

  function drawHead(p, X, Y, mood) {
    const blink = (Math.floor(time * 1.3 + p.blink) % 5 === 0) && (time * 1.3 + p.blink) % 1 < 0.15;
    if (p.type === "dog") {
      px(X, Y + 1, p.skin, 4, 4); px(X - 1, Y, p.hair, 2, 3); px(X + 3, Y, p.hair, 2, 3);
      px(X + 1, Y + 2, "k"); px(X + 3, Y + 2, "k"); px(X + 2, Y + 3, "k");
      if (mood === "happy") px(X + 2, Y + 4, "p");
      return;
    }
    const skin = mood === "mad" ? mixHex(col(p.skin), "#e43b44", 0.45) : p.skin;
    px(X, Y + 1, skin, 4, 4);
    // hair / hats
    if (p.type === "grandma") { px(X - 1, Y, "c", 6, 2); px(X - 1, Y + 1, "c", 1, 2); px(X + 4, Y + 1, "c", 1, 2); }
    else if (p.type === "soldier") { px(X - 1, Y, "G", 5, 2); px(X + 3, Y - 1, "G", 2, 1); }
    else if (p.type === "tourist") { px(X - 1, Y, "O", 6, 1); px(X, Y - 1, "O", 4, 1); }
    else { px(X, Y, p.hair, 4, 1); px(X - (p.hair === "O" ? 1 : 0), Y + 1, p.hair, 1, 2); }
    // eyes
    if (p.glasses) { px(X, Y + 2, "k", 4, 1); px(X, Y + 2, "w"); px(X + 3, Y + 2, "w"); }
    if (!blink) { px(X, Y + 2, "k"); px(X + 3, Y + 2, "k"); }
    if (mood === "happy") { px(X + 1, Y + 4, "k", 2, 1); px(X, Y + 3, "p"); px(X + 3, Y + 3, "p"); }
    else if (mood === "panic") { px(X + 1, Y + 3, "k", 2, 2); px(X + 4, Y + 1, "l"); }
    else if (mood === "mad") { px(X + 1, Y + 4, "k", 2, 1); px(X, Y + 1, "k"); px(X + 3, Y + 1, "k"); }
    else { px(X + 1, Y + 4, "Q", 2, 1); }
  }

  // ==========================================================================
  //  Input
  // ==========================================================================
  let toast = null;
  function toastMsg(t) { toast = { text: t, t: 1.6 }; }
  function popup(text, X, Y, c) { popups.push({ text, X, Y, c, t: 1.2 }); }

  function toWorld(e) {
    const r = screen.getBoundingClientRect();
    return { X: (e.clientX - r.left) / r.width * W, Y: (e.clientY - r.top) / r.height * H };
  }
  function cabinAt(p) {
    if (p.Y > STAND_Y) return -1;
    for (let k = 0; k < cabins.length; k++) {
      const c = cabins[k];
      if (Math.abs(p.X - c.X) <= CAB_W / 2 + 10 && p.Y >= CAB_TOP - 30) return k;
    }
    return -1;
  }
  function binAt(p) {
    for (let i = 0; i < ITEMS.length; i++) {
      const r = trayRect(i);
      if (p.X >= r.x - 2 && p.X <= r.x + r.w + 2 && p.Y >= r.y - 8 && p.Y <= r.y + r.h + 1) return i;
    }
    return -1;
  }
  function onRing(p) {
    if (!ring) return false;
    const c = cabins[ring.cabin], X0 = c.X - CAB_W / 2;
    return p.X > X0 + 3 && p.X < X0 + 34 && p.Y > CAB_TOP + 5 && p.Y < CAB_TOP + 38;
  }
  screen.addEventListener("pointerdown", (e) => {
    audio();
    const p = toWorld(e);
    if (p.X >= MUTE.x && p.X <= MUTE.x + MUTE.w && p.Y >= MUTE.y && p.Y <= MUTE.y + MUTE.h) { muted = !muted; return; }
    if (state !== "play") return;
    if (onRing(p)) return answer();
    const b = binAt(p);
    if (b >= 0) return addItem(b);
    if (p.X >= TRASH.x - 2 && p.X <= TRASH.x + TRASH.w + 2 && p.Y >= TRASH.y - 2 && p.Y <= TRASH.y + TRASH.h + 2) return trash();
    if (p.X >= BASKET.x && p.X <= BASKET.x + BASKET.w && p.Y > BASKET.y - 22 && p.Y < BASKET.y + BASKET.h) {
      toastMsg(basket.length ? "עכשיו לחצו על הקרון שהזמין" : "לחצו על המגשים כדי למלא את הסל");
      return;
    }
    const k = cabinAt(p);
    if (k >= 0) send(k);
  });
  screen.addEventListener("pointermove", (e) => {
    const p = toWorld(e);
    hoverCabin = basket.length ? cabinAt(p) : -1;
    hoverBin = binAt(p);
    screen.style.cursor = hoverCabin >= 0 || hoverBin >= 0 || onRing(p) ? "pointer" : "default";
  });
  window.addEventListener("keydown", (e) => {
    if (state !== "play") return;
    if (e.key >= "1" && e.key <= "6") addItem(+e.key - 1);
    const ck = { q: 0, w: 1, e: 2, "/": 0, "'": 1, "ק": 2 }[e.key.toLowerCase()];
    if (ck !== undefined) send(ck);
    if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); trash(); }
    if (e.key === " ") { e.preventDefault(); answer(); }
  });

  // ==========================================================================
  //  Loop
  // ==========================================================================
  // pretty idle scene behind the menu
  cabins = CAB_X.map((X) => ({ X, ppl: Array.from({ length: randi(2, 3) }, makePassenger), order: null, cool: 99, phase: rand(0, 6), happy: 0, mad: 0, say: null }));
  cabins[1].say = { text: "יש לי מבחן במד״ר בעוד שעה!!", t: 1e9, max: 1e9 };

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
