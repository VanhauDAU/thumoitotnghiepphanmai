import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Award,
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  Clock,
  Copy,
  GraduationCap,
  Heart,
  ImagePlus,
  Link2,
  MapPin,
  Medal,
  MessageCircle,
  Music2,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Users,
  Volume2,
  VolumeX
} from "lucide-react";
import "./styles.css";

const defaultNotes = [
  "Vui lòng có mặt trước giờ bắt đầu 15 phút.",
  "Trang phục lịch sự, ưu tiên tông màu sáng.",
  "Có thể gửi lời chúc hoặc xác nhận tham dự qua nút bên dưới."
];

const defaultMemories = [
  {
    title: "Danh hiệu",
    description: "Sinh viên hoàn thành chương trình học với nhiều nỗ lực đáng nhớ."
  },
  {
    title: "Hoạt động",
    description: "Tham gia câu lạc bộ, workshop và các dự án trong thời gian học."
  },
  {
    title: "Ngoại khóa",
    description: "Những chuyến đi, sự kiện và khoảnh khắc cùng bạn bè."
  }
];

const emptyConfig = {
  heroImage: "",
  heroImages: [],
  heroImageCrops: {},
  gallery: [],
  graduateName: "",
  degree: "",
  school: "",
  eventTitle: "Lễ tốt nghiệp",
  eventDate: "",
  eventTime: "",
  eventEndTime: "",
  locationName: "",
  locationAddress: "",
  mapUrl: "",
  hostName: "",
  introGreetingImage: "",
  introGreetingTemplate: "Chào {quan hệ} {người được mời}, mình gửi bạn một chiếc thiệp nhỏ cho ngày tốt nghiệp thật đặc biệt này.",
  showIntroSection: true,
  greeting: "",
  message: "",
  privateMessage: "",
  description: "",
  thankYouMessage: "",
  phone: "",
  rsvpUrl: "",
  guestbookEnabled: true,
  guestbookTitle: "Sổ lưu bút ngày tốt nghiệp",
  guestbookPrompt: "Gửi một lời chúc nhỏ để mình giữ lại kỷ niệm này nhé.",
  backgroundMusic: "",
  musicVolume: 55,
  notes: defaultNotes,
  memories: defaultMemories
};

const fields = [
  ["graduateName", "Tên người tốt nghiệp"],
  ["degree", "Danh xưng / ngành học"],
  ["school", "Trường"],
  ["eventTitle", "Tên sự kiện"],
  ["eventDate", "Ngày tổ chức", "date"],
  ["eventTime", "Giờ bắt đầu", "time"],
  ["eventEndTime", "Giờ kết thúc", "time"],
  ["locationName", "Địa điểm"],
  ["locationAddress", "Địa chỉ"],
  ["mapUrl", "Link Google Maps"],
  ["hostName", "Người gửi lời mời"],
  ["introGreetingTemplate", "Lời chào mở đầu"],
  ["greeting", "Lời mời ngắn"],
  ["message", "Lời nhắn chính"],
  ["privateMessage", "Lời nhắn gửi riêng"],
  ["description", "Mô tả thêm"],
  ["thankYouMessage", "Lời cảm ơn"],
  ["rsvpUrl", "Link xác nhận tham dự"],
  ["guestbookTitle", "Tiêu đề sổ lưu bút"],
  ["guestbookPrompt", "Gợi ý lời chúc trong sổ lưu bút"]
];

const RELATION_OPTIONS = [
  "Anh", "Chị", "Bạn", "Cô", "Chú", "Bác", "Ông", "Bà",
  "Em", "Thầy", "Cô giáo", "Anh họ", "Chị họ", "Các bạn", "Anh/Chị"
];

function normalizeConfig(data) {
  const heroImages = Array.isArray(data?.heroImages) ? data.heroImages : [];
  const legacyHeroImage = data?.heroImage ? [data.heroImage] : [];
  const heroImageCrops =
    data?.heroImageCrops && typeof data.heroImageCrops === "object" && !Array.isArray(data.heroImageCrops)
      ? data.heroImageCrops
      : {};

  return {
    ...emptyConfig,
    ...data,
    heroImages: [...new Set([...heroImages, ...legacyHeroImage])],
    heroImageCrops,
    gallery: Array.isArray(data?.gallery) ? data.gallery : [],
    notes: Array.isArray(data?.notes) ? data.notes : defaultNotes,
    memories:
      Array.isArray(data?.memories)
        ? data.memories.map((item) =>
            typeof item === "string" ? { title: item, description: "" } : { title: "", description: "", ...item }
          )
        : defaultMemories
  };
}

function resolveAsset(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return url;
}

function getEventDateTime(config) {
  if (!config.eventDate) return null;
  const time = config.eventTime || "00:00";
  const date = new Date(`${config.eventDate}T${time}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatEventTime(config) {
  if (!config.eventTime && !config.eventEndTime) return "";
  if (config.eventTime && config.eventEndTime) {
    return `${config.eventTime} - ${config.eventEndTime}`;
  }
  return config.eventTime || config.eventEndTime;
}

function formatLogTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function applyGreetingTemplate(template, guest) {
  const relation = guest?.relation || "bạn";
  const guestName = guest?.name || "thân mến";
  const fallback = emptyConfig.introGreetingTemplate;
  return (template || fallback)
    .replaceAll("{quan hệ}", relation)
    .replaceAll("{quan he}", relation)
    .replaceAll("{người được mời}", guestName)
    .replaceAll("{nguoi duoc moi}", guestName)
    .replaceAll("{ten}", guestName)
    .replaceAll("{tên}", guestName);
}

function useTypewriter(text, speed = 42) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) {
      setDone(true);
      return undefined;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        window.setTimeout(() => setDone(true), 360);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

function useCountdown(config) {
  const eventDateTime = useMemo(() => getEventDateTime(config), [config.eventDate, config.eventTime]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!eventDateTime) {
    return { expired: false, items: [] };
  }

  const distance = eventDateTime.getTime() - now;
  const safeDistance = Math.max(distance, 0);
  const totalSeconds = Math.floor(safeDistance / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: distance <= 0,
    items: [
      ["Ngày", days],
      ["Giờ", hours],
      ["Phút", minutes],
      ["Giây", seconds]
    ]
  };
}

function useConfig() {
  const [config, setConfig] = useState(emptyConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(normalizeConfig(data)))
      .finally(() => setLoading(false));
  }, []);

  return { config, setConfig, loading };
}

// Hook: lấy thông tin khách từ token trong URL (chỉ dùng ở trang mời)
function useGuestToken() {
  const [guest, setGuest] = useState(null); // null = chưa biết, false = không có token/không tìm thấy
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setGuest(false);
      setChecked(true);
      return;
    }
    fetch(`/api/guest/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setGuest(data))
      .catch(() => setGuest(false))
      .finally(() => setChecked(true));
  }, []);

  return { guest, checked };
}

// ── Confetti Burst ───────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#ffe066", "#ffc940", "#8ecae6", "#a8dbd5",
  "#ffffff", "#f4a261", "#e9c46a", "#90e0ef", "#ffb347",
];

function ConfettiBurst({ active }) {
  const particles = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 90 }, (_, i) => {
      const angle = (i / 90) * 360 + (Math.random() - 0.5) * 22;
      const rad = (angle * Math.PI) / 180;
      const dist = 120 + Math.random() * 230;
      const isRect = Math.random() > 0.45;
      const w = 5 + Math.random() * 6;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w,
        h: isRect ? w * 2.8 : w,
        br: isRect ? 2 : "50%",
        tx: Math.cos(rad) * dist,
        ty: Math.sin(rad) * dist - 80,
        rot: Math.random() * 560 - 280,
        dur: 0.65 + Math.random() * 0.7,
        delay: Math.random() * 0.18,
      };
    });
  }, [active]);

  if (!active) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.br,
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            "--rot": `${p.rot}deg`,
            "--dur": `${p.dur}s`,
            "--delay": `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function Fireworks({ active }) {
  const bursts = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 7 }, (_, burstIndex) => ({
      id: burstIndex,
      x: 14 + Math.random() * 72,
      y: 12 + Math.random() * 46,
      delay: burstIndex * 0.18,
      particles: Array.from({ length: 18 }, (_, particleIndex) => {
        const angle = (particleIndex / 18) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 56 + Math.random() * 48;
        return {
          id: particleIndex,
          tx: Math.cos(rad) * dist,
          ty: Math.sin(rad) * dist,
          color: CONFETTI_COLORS[(burstIndex + particleIndex) % CONFETTI_COLORS.length]
        };
      })
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className="fireworks" aria-hidden="true">
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="firework-burst"
          style={{ left: `${burst.x}%`, top: `${burst.y}%`, animationDelay: `${burst.delay}s` }}
        >
          {burst.particles.map((particle) => (
            <span
              key={particle.id}
              style={{
                "--tx": `${particle.tx}px`,
                "--ty": `${particle.ty}px`,
                "--color": particle.color
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Scroll Reveal hook ────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    });
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);
}

// ── Flip Digit ────────────────────────────────────────────────────────────────

function FlipDigit({ value }) {
  const ref = useRef(null);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current && ref.current) {
      ref.current.classList.remove("digit-flip");
      void ref.current.offsetWidth; // force reflow
      ref.current.classList.add("digit-flip");
      prevRef.current = value;
    }
  }, [value]);

  return (
    <strong ref={ref} className="countdown-digit">
      {String(value).padStart(2, "0")}
    </strong>
  );
}

// ── Shared AudioContext singleton ───────────────────────────────────────────
// iOS Safari tự động suspend AudioContext khi không có user gesture.
// Giải pháp:
//  1. Dùng 1 context chung, KHÔNG BAO GIỜ đóng nó (ctx.close() sẽ khiến lần
//     phát tiếp theo tạo context mới bên ngoài gesture → iOS chặn).
//  2. Unlock context ngay khi có touch/click đầu tiên để ctx.state = "running"
//     trước khi các setTimeout kịp gọi âm thanh.
let _sharedAudioCtx = null;

function getSharedAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_sharedAudioCtx) {
    _sharedAudioCtx = new AC();
  }
  return _sharedAudioCtx;
}

// Gọi hàm này 1 lần trong useEffect để unlock AudioContext sớm nhất có thể
function unlockAudioContextOnce() {
  const unlock = () => {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    // Giải phóng listener sau lần đầu tiên
    window.removeEventListener("touchstart", unlock, true);
    window.removeEventListener("touchend",   unlock, true);
    window.removeEventListener("click",      unlock, true);
  };
  window.addEventListener("touchstart", unlock, { capture: true, once: true });
  window.addEventListener("touchend",   unlock, { capture: true, once: true });
  window.addEventListener("click",      unlock, { capture: true, once: true });
}

// ── Paper Airplane Whoosh Sound ───────────────────────────────────────────────
// Tiếng máy bay giấy "vèoo" — nhẹ, vui, lao vút qua như trong phim hoạt hình
function playAirplaneWhoosh() {
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  // iOS: phải resume() trước khi dùng — đây là nguyên nhân chính gây mất tiếng
  const play = () => {
    const t = ctx.currentTime;
    const dur = 0.85;

  // ── Master gain ─────────────────────────────────────────────────────────────
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0, t);
  master.gain.linearRampToValueAtTime(0.7, t + 0.05);   // bật nhanh
  master.gain.setValueAtTime(0.7, t + 0.30);            // giữ peak khi bay qua
  master.gain.exponentialRampToValueAtTime(0.001, t + dur); // nhỏ dần khi bay đi
  master.connect(ctx.destination);

  // ── Whoosh noise chính — lọc bandpass sweep từ cao xuống thấp ───────────────
  // Tạo buffer noise trắng
  const bufLen = Math.ceil(ctx.sampleRate * (dur + 0.1));
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;

  // Bandpass: bắt đầu ở tần số cao (máy bay đến) → quét xuống thấp (bay đi)
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.setValueAtTime(3800, t);               // cao — đến gần
  filt.frequency.linearRampToValueAtTime(4800, t + 0.12); // đỉnh vèoo
  filt.frequency.exponentialRampToValueAtTime(800, t + dur); // thấp — bay xa
  filt.Q.value = 1.8; // Q cao → âm "sắc" hơn, rõ tiếng vèoo

  const gNoise = ctx.createGain();
  gNoise.gain.setValueAtTime(0.0, t);
  gNoise.gain.linearRampToValueAtTime(0.55, t + 0.06);
  gNoise.gain.setValueAtTime(0.50, t + 0.25);
  gNoise.gain.exponentialRampToValueAtTime(0.001, t + dur);

  src.connect(filt); filt.connect(gNoise); gNoise.connect(master);
  src.start(t); src.stop(t + dur + 0.1);

  // ── Glide tone mỏng — "휙" pitch sweep nghe như tiếng phất ─────────────────
  const glide = ctx.createOscillator();
  const gGlide = ctx.createGain();
  glide.type = "sine";
  glide.frequency.setValueAtTime(1100, t);               // cao khi đến
  glide.frequency.exponentialRampToValueAtTime(260, t + dur); // thấp khi đi
  gGlide.gain.setValueAtTime(0.0, t);
  gGlide.gain.linearRampToValueAtTime(0.12, t + 0.04);
  gGlide.gain.exponentialRampToValueAtTime(0.001, t + dur);
  glide.connect(gGlide); gGlide.connect(master);
  glide.start(t); glide.stop(t + dur + 0.1);

  // ── Tiếng phất phật cánh giấy — noise burst ngắn lúc cất lên ───────────────
  const flapLen = Math.ceil(ctx.sampleRate * 0.12);
  const flapBuf = ctx.createBuffer(1, flapLen, ctx.sampleRate);
  const flapData = flapBuf.getChannelData(0);
  for (let i = 0; i < flapLen; i++) {
    // Envelope hình sin ngắn tạo tiếng "phất" tắt nhanh
    flapData[i] = (Math.random() * 2 - 1) * Math.sin((i / flapLen) * Math.PI);
  }
  const flapSrc = ctx.createBufferSource();
  flapSrc.buffer = flapBuf;
  const flapFilt = ctx.createBiquadFilter();
  flapFilt.type = "highpass";
  flapFilt.frequency.value = 2500;
  const gFlap = ctx.createGain();
  gFlap.gain.value = 0.22;
  flapSrc.connect(flapFilt); flapFilt.connect(gFlap); gFlap.connect(master);
  flapSrc.start(t);

  // Không đóng ctx — giữ sống để lần phát tiếp theo không cần tạo mới
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(play).catch(() => {});
  } else {
    play();
  }
}

function playDefaultOpeningSound() {
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  // iOS: phải resume() trước khi dùng — đây là nguyên nhân chính gây mất tiếng
  const play = () => {
    const t = ctx.currentTime;

  // ── Reverb / Delay tail ───────────────────────────────────────────────────
  // Two feedback delay nodes give a lush "room" feel without a real convolver
  const delay1 = ctx.createDelay(0.5);
  const delay2 = ctx.createDelay(0.34);
  const delayFb1 = ctx.createGain();
  const delayFb2 = ctx.createGain();
  const delayOut = ctx.createGain();
  delay1.delayTime.value = 0.22;
  delay2.delayTime.value = 0.17;
  delayFb1.gain.value = 0.36;
  delayFb2.gain.value = 0.28;
  delayOut.gain.value = 0.38;
  delay1.connect(delayFb1); delayFb1.connect(delay1);
  delay2.connect(delayFb2); delayFb2.connect(delay2);
  delay1.connect(delayOut); delay2.connect(delayOut);
  delayOut.connect(ctx.destination);

  // Master bus
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, t);
  master.gain.exponentialRampToValueAtTime(0.55, t + 0.025);
  master.gain.setValueAtTime(0.55, t + 1.6);
  master.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
  master.connect(ctx.destination);
  master.connect(delay1);
  master.connect(delay2);

  // ── Utility: single oscillator tone ──────────────────────────────────────
  const tone = ({ freq, start, dur, peak = 0.22, type = "sine", detune = 0, freqEnd }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur * 0.8);
    // Snappy attack, gentle decay
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    g.gain.exponentialRampToValueAtTime(peak * 0.6, start + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g); g.connect(master);
    osc.start(start); osc.stop(start + dur + 0.05);
  };

  // ── Utility: noise burst ─────────────────────────────────────────────────
  const noiseBurst = ({ start, dur, peakGain, filterType, filterFreqStart, filterFreqEnd, Q = 1 }) => {
    const bufLen = Math.ceil(ctx.sampleRate * (dur + 0.05));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((i / data.length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buf;
    filt.type = filterType;
    filt.frequency.setValueAtTime(filterFreqStart, start);
    if (filterFreqEnd) filt.frequency.exponentialRampToValueAtTime(filterFreqEnd, start + dur * 0.7);
    filt.Q.setValueAtTime(Q, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peakGain, start + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(start); src.stop(start + dur + 0.06);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 1. PAPER CRINKLE — delicate rustling as the envelope is touched (0s–0.18s)
  // ════════════════════════════════════════════════════════════════════════════
  noiseBurst({ start: t, dur: 0.16, peakGain: 0.12, filterType: "bandpass", filterFreqStart: 1200, filterFreqEnd: 4800, Q: 0.6 });
  noiseBurst({ start: t + 0.07, dur: 0.12, peakGain: 0.08, filterType: "bandpass", filterFreqStart: 2200, filterFreqEnd: 6000, Q: 0.5 });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. WAX SEAL POP — satisfying low thud when the seal breaks (0.10s)
  // ════════════════════════════════════════════════════════════════════════════
  // Sub-bass thud
  tone({ freq: 120, start: t + 0.10, dur: 0.22, peak: 0.45, type: "sine", freqEnd: 45 });
  // Mid crack body
  tone({ freq: 280, start: t + 0.10, dur: 0.14, peak: 0.30, type: "triangle", freqEnd: 90 });
  // Crack transient noise
  noiseBurst({ start: t + 0.09, dur: 0.08, peakGain: 0.28, filterType: "highpass", filterFreqStart: 3000, Q: 0.4 });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. HARP GLISSANDO — 8 notes sweep up like a harp (0.18s–0.72s)
  //    D-major scale: D4 F#4 A4 D5 F#5 A5 D6 F#6
  // ════════════════════════════════════════════════════════════════════════════
  const harpNotes = [293.66, 369.99, 440.00, 587.33, 739.99, 880.00, 1174.66, 1479.98];
  harpNotes.forEach((freq, i) => {
    const start = t + 0.18 + i * 0.068;
    // Main harp pluck (triangle wave — warm & bright)
    tone({ freq, start, dur: 0.9 - i * 0.04, peak: 0.26 - i * 0.015, type: "triangle" });
    // Harmonic shimmer on top (sine, +octave, quieter)
    tone({ freq: freq * 2, start: start + 0.006, dur: 0.55 - i * 0.03, peak: 0.07, type: "sine" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. CRYSTAL BELL MELODY — 5 bright bell tones, pentatonic feel (0.55s–1.3s)
  //    Uses sine + 5th harmonic for that glassy bell timbre
  // ════════════════════════════════════════════════════════════════════════════
  const bellNotes = [
    { freq: 1174.66, start: t + 0.55, dur: 1.0, peak: 0.18 },
    { freq: 1396.91, start: t + 0.70, dur: 0.95, peak: 0.20 },
    { freq: 1567.98, start: t + 0.84, dur: 0.90, peak: 0.22 },
    { freq: 1760.00, start: t + 0.98, dur: 0.85, peak: 0.19 },
    { freq: 2093.00, start: t + 1.10, dur: 0.80, peak: 0.14 },
  ];
  bellNotes.forEach(({ freq, start, dur, peak }) => {
    // Fundamental
    tone({ freq, start, dur, peak, type: "sine" });
    // 5th partial — gives metallic bell character
    tone({ freq: freq * 2.756, start: start + 0.003, dur: dur * 0.4, peak: peak * 0.22, type: "sine" });
    // Sub octave warmth
    tone({ freq: freq * 0.5, start, dur: dur * 0.6, peak: peak * 0.12, type: "sine" });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. FAIRY DUST SHIMMER — high-freq sparkle at the peak (0.80s–1.40s)
  // ════════════════════════════════════════════════════════════════════════════
  noiseBurst({ start: t + 0.80, dur: 0.60, peakGain: 0.06, filterType: "highpass", filterFreqStart: 7000, Q: 0.3 });
  // Tiny glitter pops
  [0.82, 0.90, 0.98, 1.06, 1.14, 1.22].forEach((offset, i) => {
    tone({ freq: 3000 + i * 420, start: t + offset, dur: 0.18, peak: 0.05, type: "sine", detune: (i % 2 === 0 ? 4 : -4) });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. WARM CHORD BLOOM — full major chord swells in at the end (1.2s–2.2s)
  //    D major: D4 F#4 A4 D5
  // ════════════════════════════════════════════════════════════════════════════
  [293.66, 369.99, 440.00, 587.33].forEach((freq, i) => {
    const start = t + 1.22 + i * 0.04;
    tone({ freq, start, dur: 1.0, peak: 0.09, type: "sine", detune: i * 2 });
  });

  // Không đóng ctx — giữ sống để iOS không cần gesture mới khi phát lại
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(play).catch(() => {});
  } else {
    play();
  }
}


// ── Envelope Screen ───────────────────────────────────────────────────────────

function EnvelopeScreen({ config, guest, onOpen }) {
  const [opening, setOpening] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const envelopeRef = useRef(null);
  const wrapRef = useRef(null);
  const greetingText = useMemo(
    () => applyGreetingTemplate(config.introGreetingTemplate, guest),
    [config.introGreetingTemplate, guest]
  );
  const { displayed, done: greetingDone } = useTypewriter(greetingText);

  // Sparkle positions (stable, generated once)
  const sparkles = useMemo(() =>
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      size: 5 + Math.random() * 6,
      x: 8 + Math.random() * 84,
      y: 8 + Math.random() * 84,
      delay: i * 0.32,
      dur: 1.4 + Math.random() * 1.2,
    }))
  , []);

  const handleOpen = () => {
    if (!greetingDone || opening) return;
    playDefaultOpeningSound();
    // ✈️ Delay 1020ms để đồng bộ với animation paperPlaneFlight (CSS delay: 1.02s)
    setTimeout(() => playAirplaneWhoosh(), 1620);
    setOpening(true);
    setConfetti(true);
    setTimeout(() => onOpen(), 2450);
  };

  // 3D mouse tilt
  const onMouseMove = useCallback((e) => {
    if (!envelopeRef.current || opening) return;
    const rect = envelopeRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    envelopeRef.current.style.transform =
      `rotateY(${dx * 16}deg) rotateX(${-dy * 11}deg) scale(1.03)`;
  }, [opening]);

  const onMouseLeave = useCallback(() => {
    if (envelopeRef.current) {
      envelopeRef.current.style.transform = "";
    }
  }, []);

  return (
    <div className={`envelope-screen${opening ? " opening" : ""}${greetingDone ? " greeting-done" : ""}`}>
      {/* Nền rơi icon */}
      <div className="env-bg-icons" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`env-bg-icon env-bg-icon-${i + 1}`}>
            <GraduationCap size={i % 4 === 0 ? 28 : 18} />
          </span>
        ))}
      </div>

      {/* Text tiêu đề phía trên */}
      <div className="env-header">
        <p className="eyebrow" style={{ color: "rgb(255 246 228 / 80%)" }}>Bạn có một thư mời từ</p>
        <h1 className="env-name">{config.graduateName || "Lễ Tốt Nghiệp"}</h1>
        <div className="intro-greeting-card">
          {config.introGreetingImage && (
            <img
              className="intro-greeting-image"
              src={resolveAsset(config.introGreetingImage)}
              alt=""
              aria-hidden="true"
            />
          )}
          <p className="typewriter-greeting">
            {displayed}
            {!greetingDone && <span className="typewriter-caret" aria-hidden="true" />}
          </p>
        </div>
      </div>

      {/* Phong bì với 3D tilt */}
      <div
        className="envelope-wrap"
        ref={wrapRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="envelope"
          ref={envelopeRef}
          role="button"
          tabIndex={greetingDone ? 0 : -1}
          aria-label="Click vào tấm thiệp để mở"
          onClick={handleOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleOpen();
            }
          }}
          style={{ transition: opening ? "transform 0.9s ease" : "transform 0.12s ease" }}
        >
          <div className="letter-card-reveal">
            <p>Thư mời tốt nghiệp</p>
            <strong>{config.graduateName || "Lễ Tốt Nghiệp"}</strong>
            {guest && <span>Gửi {guest.relation} {guest.name}</span>}
          </div>
          {/* Nắp phong bì */}
          <div className="envelope-flap">
            <div className="envelope-flap-inner" />
          </div>
          {/* Thân phong bì */}
          <div className="envelope-body">
            <div className="envelope-seal">
              <GraduationCap size={26} />
            </div>
          </div>
          {/* Thẻ nhỏ bên trong ló ra khi mở */}
          <div className="envelope-card-peek">
            <Sparkles size={14} />
            <span>Thư mời tốt nghiệp</span>
          </div>
          {/* Sparkle dots lung linh */}
          {sparkles.map((s) => (
            <div
              key={s.id}
              className="env-sparkle-dot"
              style={{
                width: s.size,
                height: s.size,
                left: `${s.x}%`,
                top: `${s.y}%`,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              }}
            />
          ))}
        </div>
        {/* Confetti nổ từ giữa phong bì */}
        <ConfettiBurst active={confetti} />
        <div className="flying-paper-plane" aria-hidden="true" />
      </div>
      <Fireworks active={confetti} />

      <p className="env-hint">
        {greetingDone ? "Click vào tấm thiệp để mở" : "Lời chào đang được gửi đến bạn..."}
      </p>
    </div>
  );
}

// ── Background Music Player ───────────────────────────────────────────────────────────────────

function BackgroundMusic({ src, autoPlay }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  // Khi autoPlay bật và có src → cố gắng phát
  useEffect(() => {
    if (!autoPlay || !src || !audioRef.current) return;
    audioRef.current.volume = 0.55;
    audioRef.current.loop = true;
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setStarted(true))
        .catch(() => {
          // Autoplay bị chặn bởi trình duyệt → chờ user tương tác
          const resume = () => {
            audioRef.current?.play().then(() => setStarted(true)).catch(() => {});
            window.removeEventListener("click", resume);
            window.removeEventListener("touchstart", resume);
          };
          window.addEventListener("click", resume, { once: true });
          window.addEventListener("touchstart", resume, { once: true });
        });
    }
  }, [autoPlay, src]);

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (muted) {
      audioRef.current.muted = false;
      setMuted(false);
    } else {
      audioRef.current.muted = true;
      setMuted(true);
    }
  };

  if (!src) return null;

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" />
      <button
        className={`music-toggle-btn${muted ? " muted" : ""}${started ? " playing" : ""}`}
        onClick={toggleMute}
        title={muted ? "Bật nhạc" : "Tắt nhạc"}
        aria-label={muted ? "Bật nhạc nền" : "Tắt nhạc nền"}
      >
        <span className="music-disc" aria-hidden="true">
          <span className="music-disc-ring" />
          {muted ? <VolumeX size={19} /> : <Music2 size={20} />}
        </span>
        <span className="music-note-anim" aria-hidden="true">♪</span>
      </button>
    </>
  );
}

function GuestbookSection({ config, guest, token }) {
  const [wishes, setWishes] = useState([]);
  const [name, setName] = useState(() => (guest ? `${guest.relation} ${guest.name}` : ""));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [celebratingWish, setCelebratingWish] = useState(null);
  const rollingWishes = useMemo(() => (wishes.length ? [...wishes, ...wishes] : []), [wishes]);

  useEffect(() => {
    setName(guest ? `${guest.relation} ${guest.name}` : "");
  }, [guest]);

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch("/api/wishes?limit=12");
      if (!res.ok) throw new Error("Không tải được sổ lưu bút");
      setWishes(await res.json());
    } catch {
      setWishes([]);
    }
  }, []);

  useEffect(() => { fetchWishes(); }, [fetchWishes]);

  const submitWish = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          relation: guest?.relation || "",
          message: message.trim(),
          token
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không gửi được lời chúc");
      setWishes((current) => [data, ...current].slice(0, 12));
      setMessage("");
      setCelebratingWish(data);
      window.setTimeout(() => setCelebratingWish(null), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="content-section guestbook-section" data-reveal>
      <div className="guestbook-glow" aria-hidden="true" />
      {celebratingWish && (
        <div className="wish-flight" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              style={{
                "--x": `${(index % 6 - 2.5) * 22}px`,
                "--y": `${-70 - index * 8}px`,
                "--delay": `${index * 0.045}s`
              }}
            >
              {index % 3 === 0 ? "✦" : index % 3 === 1 ? "♡" : "•"}
            </span>
          ))}
        </div>
      )}

      <div className="section-heading guestbook-heading">
        <MessageCircle size={22} />
        <div>
          <h2>{config.guestbookTitle || "Sổ lưu bút ngày tốt nghiệp"}</h2>
          <p>{config.guestbookPrompt || "Gửi một lời chúc nhỏ để mình giữ lại kỷ niệm này nhé."}</p>
        </div>
      </div>

      <form className="guestbook-form" onSubmit={submitWish}>
        {!guest && (
          <label>
            <span>Tên của bạn</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Minh Anh"
              maxLength={80}
            />
          </label>
        )}
        <label>
          <span>Lời chúc</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Viết một lời chúc thật xinh ở đây..."
            rows={4}
            maxLength={500}
          />
        </label>
        <div className="guestbook-actions">
          <small>{message.trim().length}/500 ký tự</small>
          <button type="submit" disabled={submitting || !message.trim()}>
            <Send size={17} />
            {submitting ? "Đang gửi..." : "Gửi lời chúc"}
          </button>
        </div>
        {error && <p className="guestbook-error">{error}</p>}
        {celebratingWish && <p className="guestbook-success">Lời chúc đã được cất vào sổ lưu bút.</p>}
      </form>

      {wishes.length > 0 && (
        <div className="wish-wall">
          <div className="wish-wall-title">
            <Sparkles size={15} />
            <span>Những lời chúc đang bay qua sổ lưu bút</span>
          </div>
          <div className="wish-marquee" style={{ "--wish-duration": `${Math.max(wishes.length, 3) * 4.8}s` }}>
            <div className="wish-track">
              {rollingWishes.map((wish, index) => (
                <article
                  key={`${wish.id}-${index}`}
                  className={`wish-note wish-note-${(index % 3) + 1}`}
                  aria-hidden={index >= wishes.length}
                >
                  <p>{wish.message}</p>
                  <strong>{wish.relation ? `${wish.relation} ${wish.name}` : wish.name}</strong>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Invitation ────────────────────────────────────────────────────────────────────────────

function Invitation({ config, isOpened }) {
  const countdown = useCountdown(config);
  const { guest, checked } = useGuestToken();
  useScrollReveal();
  const inviteToken = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);

  const photos = useMemo(() => {
    const merged = [...(config.heroImages || []), config.heroImage].filter(Boolean);
    return [...new Set(merged)];
  }, [config.heroImage, config.heroImages]);
  const visibleNotes = useMemo(
    () =>
      (config.notes || [])
        .map((note) => String(note || "").trim())
        .filter(Boolean),
    [config.notes]
  );
  const visibleMemories = useMemo(
    () =>
      (config.memories || [])
        .map((item) => {
          if (typeof item === "string") {
            return { title: item.trim(), description: "" };
          }
          return {
            title: String(item?.title || "").trim(),
            description: String(item?.description || "").trim()
          };
        })
        .filter((item) => item.title || item.description),
    [config.memories]
  );

  if (!checked) return null;

  return (
    <main className={`invitation-shell${isOpened ? " card-revealed" : ""}`}>
      {/* Nhạc nền – chỉ phát khi thiếp đã được mở */}
      {config.backgroundMusic && (
        <BackgroundMusic
          src={config.backgroundMusic}
          autoPlay={isOpened}
          volume={config.musicVolume ?? 55}
        />
      )}
      <section className="hero">
        <FallingGraduationIcons />
        <PhotoCarousel
          photos={photos}
          graduateName={config.graduateName}
          crops={config.heroImageCrops || {}}
          guestPhoto={guest?.photo || ""}
          guestPhotoCrop={guest?.photoCrop || { x: 50, y: 50 }}
          guestPhotos={guest?.photos || []}
          guestPhotoCrops={guest?.photoCrops || []}
        />
        <div className="hero-copy">
          <p className="eyebrow">Thư mời dự tốt nghiệp</p>
          <h1>{config.graduateName}</h1>
          <p>{config.degree}</p>
          <span>{config.school}</span>
        </div>
      </section>

      {/* Banner cá nhân hóa – CHỈ hiển thị khi có khách hợp lệ */}
      {guest && (
        <section className="content-section guest-banner" data-reveal>
          <div className="guest-banner-inner">
            <Heart size={20} className="guest-banner-icon" />
            <p>
              Kính mời {" "}
              <strong className="guest-name">{guest.name}</strong>
            </p>
          </div>
        </section>
      )}

      {config.showIntroSection !== false && (
        <section className="content-section intro" data-reveal>
          <Sparkles size={22} />
          <p>{config.greeting}</p>
          <strong>{config.message}</strong>
          {config.description && <span>{config.description}</span>}
        </section>
      )}

      {/* Lời nhắn riêng: ưu tiên tin nhắn của khách, fallback về config chung */}
      {(guest?.privateMessage || config.privateMessage) && (
        <section className="content-section private-message" data-reveal>
          <Heart size={22} />
          <div>
            <p className="eyebrow">Lời nhắn gửi riêng</p>
            <strong>{guest?.privateMessage || config.privateMessage}</strong>
          </div>
        </section>
      )}

      <section className="countdown-section" data-reveal>
        <div>
          <p className="eyebrow">{config.eventTitle}</p>
          <h2>{countdown.expired ? "Hẹn gặp tại buổi lễ" : "Đếm ngược đến ngày vui"}</h2>
        </div>
        <div className="countdown-grid">
          {countdown.items.map(([label, value]) => (
            <article key={label}>
              <FlipDigit value={value} />
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section event-grid" data-reveal>
        <Info icon={<CalendarDays />} label="Ngày" value={formatDate(config.eventDate)} />
        <Info icon={<Clock />} label="Thời gian" value={formatEventTime(config)} />
        <Info icon={<MapPin />} label={config.locationName} value={config.locationAddress} />
      </section>

      {(config.gallery || []).length > 0 && (
        <section className="memory-gallery" data-reveal>
          {(config.gallery || []).slice(0, 5).map((image, index) => (
            <img key={image} src={resolveAsset(image)} alt={`Khoảnh khắc ${index + 1}`} />
          ))}
        </section>
      )}

      {visibleMemories.length > 0 && (
        <section className="content-section memory-section" data-reveal>
          <div className="section-heading">
            <Medal size={22} />
            <h2>Kỷ niệm đáng nhớ</h2>
          </div>
          <div className="memory-list">
            {visibleMemories.map((item, index) => (
              <article key={`${item.title}-${item.description}-${index}`}>
                <Award size={20} />
                <div>
                  {item.title && <h3>{item.title}</h3>}
                  {item.description && <p>{item.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {visibleNotes.length > 0 && (
        <section className="content-section note-section" data-reveal>
          <div className="section-heading">
            <Check size={22} />
            <h2>Lưu ý</h2>
          </div>
          <ul>
            {visibleNotes.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {config.guestbookEnabled !== false && (
        <GuestbookSection config={config} guest={guest} token={inviteToken} />
      )}

      {config.thankYouMessage && (
        <section className="content-section details thank-you-section" data-reveal>
          <p>{config.thankYouMessage}</p>
        </section>
      )}

      <div className="action-bar">
        {config.mapUrl && (
          <a href={config.mapUrl} target="_blank" rel="noreferrer">
            <MapPin size={18} />
            Chỉ đường
          </a>
        )}
        {config.rsvpUrl && (
          <a href={config.rsvpUrl} target="_blank" rel="noreferrer">
            <Check size={18} />
            Xác nhận
          </a>
        )}
      </div>
    </main>
  );
}

// ── Photo Carousel ─────────────────────────────────────────────────────────────

function PhotoCarousel({ photos, graduateName, crops = {}, guestPhoto = "", guestPhotoCrop = { x: 50, y: 50 }, guestPhotos = [], guestPhotoCrops = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef(0);
  const touchDelta = useRef(0);

  // Khi có guest photos: slide 0 = hero[0] + guest photos (cố định)
  // slide 1+ = như cũ (các ảnh hero ghép cặp)
  const slides = useMemo(() => {
    if (!photos.length) return [];
    
    const gPhotos = Array.isArray(guestPhotos) && guestPhotos.length > 0
      ? guestPhotos.filter(Boolean)
      : (guestPhoto ? [guestPhoto] : []);
    const gCrops = Array.isArray(guestPhotoCrops) ? guestPhotoCrops : [];

    if (gPhotos.length > 0) {
      // Slide 0 riêng: hero[0] + guest photos
      const guestSlide = { type: "guest", heroPhoto: photos[0], guestPhotos: gPhotos, guestPhotoCrops: gCrops };
      // Slide 1+: các ảnh hero còn lại ghép cặp
      const extraSlides = photos.slice(1).map((image, i) => ({
        type: "hero",
        framePhotos: [image, photos[i + 2]].filter(Boolean)
      }));
      return [guestSlide, ...extraSlides];
    }
    // Không có guest photo → giữ nguyên logic cũ
    return photos.map((image, index) => ({
      type: "hero",
      framePhotos: [image, photos[(index + 1) % photos.length]]
        .filter((item, itemIndex, items) => item && items.indexOf(item) === itemIndex)
    }));
  }, [photos, guestPhoto, guestPhotos, guestPhotoCrop, guestPhotoCrops]);

  const hasManySlides = slides.length > 1;

  useEffect(() => {
    if (!hasManySlides) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [hasManySlides, slides.length]);

  useEffect(() => { setActiveIndex(0); }, [photos.length, guestPhoto, guestPhotos]);

  const goTo = (index) => {
    if (!slides.length) return;
    setActiveIndex((index + slides.length) % slides.length);
  };

  const onTouchStart = (event) => {
    touchStart.current = event.touches[0].clientX;
    touchDelta.current = 0;
  };

  const onTouchMove = (event) => {
    touchDelta.current = event.touches[0].clientX - touchStart.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDelta.current) < 42) return;
    goTo(activeIndex + (touchDelta.current < 0 ? 1 : -1));
  };

  if (!slides.length) {
    return (
      <div className="hero-placeholder hero-frame">
        <GraduationCap size={66} />
      </div>
    );
  }

  return (
    <div
      className="hero-carousel"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {slides.map((slide, index) => {
          if (slide.type === "guest") {
            const hasMultiple = slide.guestPhotos.length >= 2;
            if (hasMultiple) {
              return (
                <figure className="carousel-slide photo-guest-multi" key={`guest-slide-${index}`}>
                  <img
                    src={resolveAsset(slide.heroPhoto)}
                    alt={`${graduateName}`}
                    className="photo-card main-photo"
                    style={{ objectPosition: `${crops[slide.heroPhoto]?.x ?? 50}% ${crops[slide.heroPhoto]?.y ?? 50}%` }}
                  />
                  <div className="guest-photos-stack">
                    {slide.guestPhotos.slice(0, 2).map((url, idx) => (
                      <img
                        key={`${url}-${idx}`}
                        src={resolveAsset(url)}
                        alt={`Ảnh khách mời ${idx + 1}`}
                        className="guest-stack-photo"
                        style={{ objectPosition: `${(slide.guestPhotoCrops[idx] || guestPhotoCrop)?.x ?? 50}% ${(slide.guestPhotoCrops[idx] || guestPhotoCrop)?.y ?? 50}%` }}
                      />
                    ))}
                  </div>
                </figure>
              );
            }
            // Slide đặc biệt: hero + 1 guest photo
            return (
              <figure className="carousel-slide photo-count-2" key={`guest-slide-${index}`}>
                <img
                  src={resolveAsset(slide.heroPhoto)}
                  alt={`${graduateName}`}
                  className="photo-card main-photo"
                  style={{ objectPosition: `${crops[slide.heroPhoto]?.x ?? 50}% ${crops[slide.heroPhoto]?.y ?? 50}%` }}
                />
                <img
                  src={resolveAsset(slide.guestPhotos[0])}
                  alt="Ảnh khách mời"
                  className="photo-card side-photo"
                  style={{ objectPosition: `${(slide.guestPhotoCrops[0] || guestPhotoCrop)?.x ?? 50}% ${(slide.guestPhotoCrops[0] || guestPhotoCrop)?.y ?? 50}%` }}
                />
              </figure>
            );
          }
          // Slide bình thường
          return (
            <figure className={`carousel-slide photo-count-${slide.framePhotos.length}`} key={`hero-slide-${index}`}>
              {slide.framePhotos.map((photo, photoIndex) => (
                <img
                  key={`${photo}-${photoIndex}`}
                  src={resolveAsset(photo)}
                  alt={`${graduateName} ${photoIndex + 1}`}
                  className={`photo-card ${photoIndex === 0 ? "main-photo" : "side-photo"}`}
                  style={{ objectPosition: `${crops[photo]?.x ?? 50}% ${crops[photo]?.y ?? 50}%` }}
                />
              ))}
            </figure>
          );
        })}
      </div>
      {hasManySlides && (
        <div className="carousel-dots" aria-label="Chọn ảnh">
          {slides.map((_, index) => (
            <button
              key={index}
              className={activeIndex === index ? "active" : ""}
              onClick={() => goTo(index)}
              aria-label={`Ảnh ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


function FallingGraduationIcons() {
  return (
    <div className="falling-icons" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, index) => (
        <span key={index} className={`falling-icon falling-icon-${index + 1}`}>
          <GraduationCap size={index % 3 === 0 ? 24 : 18} />
        </span>
      ))}
    </div>
  );
}

function Info({ icon, label, value }) {
  return (
    <article className="info-item">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <p>{value}</p>
      </div>
    </article>
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────

function Admin({ config, setConfig }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("config"); // "config" | "guests" | "wishes"

  const updateField = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const authHeaders = () => (adminToken ? { "x-admin-token": adminToken } : {});

  useEffect(() => {
    fetch("/api/admin-visit", {
      method: "POST",
      headers: authHeaders()
    }).catch(() => {});
  }, [adminToken]);

  const uploadOneImage = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });
    if (!res.ok) {
      throw new Error("Không upload được ảnh. Kiểm tra admin token nếu server có cấu hình.");
    }
    return res.json();
  };

  const uploadImages = async (files, target) => {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;
    setError("");
    try {
      const uploaded = await Promise.all(fileList.map((file) => uploadOneImage(file)));
      const urls = uploaded.map((item) => item.url);
      if (target === "heroImages") {
        updateField("heroImages", [...new Set([...(config.heroImages || []), ...urls])]);
        if (!config.heroImage && urls[0]) updateField("heroImage", urls[0]);
      } else if (target === "introGreetingImage") {
        updateField("introGreetingImage", urls[0] || "");
      } else {
        updateField("gallery", [...(config.gallery || []), ...urls]);
      }
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };

  const uploadAudio = async (file, target) => {
    if (!file) return;
    setError("");
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/upload-audio", {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });
      if (!res.ok) throw new Error("Không upload được âm thanh");
      const data = await res.json();
      updateField(target, data.url);
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };

  const removeHeroImage = (image) => {
    const nextImages = (config.heroImages || []).filter((item) => item !== image);
    setConfig((current) => ({
      ...current,
      heroImages: nextImages,
      heroImage: current.heroImage === image ? nextImages[0] || "" : current.heroImage,
      heroImageCrops: Object.fromEntries(
        Object.entries(current.heroImageCrops || {}).filter(([key]) => key !== image)
      )
    }));
  };

  const setPrimaryHeroImage = (image) => {
    setConfig((current) => ({
      ...current,
      heroImage: image,
      heroImages: [image, ...(current.heroImages || []).filter((item) => item !== image)]
    }));
  };

  const removeGalleryImage = (image) => {
    updateField(
      "gallery",
      (config.gallery || []).filter((item) => item !== image)
    );
  };

  const updateHeroImageCrop = (image, axis, value) => {
    const numericValue = Number(value);
    setConfig((current) => ({
      ...current,
      heroImageCrops: {
        ...(current.heroImageCrops || {}),
        [image]: {
          x: current.heroImageCrops?.[image]?.x ?? 50,
          y: current.heroImageCrops?.[image]?.y ?? 50,
          [axis]: numericValue
        }
      }
    }));
  };

  const longTextFields = ["message", "greeting", "description", "privateMessage", "introGreetingTemplate", "thankYouMessage", "guestbookPrompt"];
  const heroImages = config.heroImages || [];

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    localStorage.setItem("adminToken", adminToken);
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(normalizeConfig(config))
    });
    if (!res.ok) {
      setSaving(false);
      setError("Không lưu được. Kiểm tra admin token nếu server có cấu hình.");
      return;
    }
    const data = await res.json();
    setConfig(normalizeConfig(data));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <main className="admin-shell">
      <header>
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1>Cấu hình thư mời</h1>
        </div>
        <div className="admin-header-actions">
          {activeTab === "config" && (
            <button onClick={save} disabled={saving}>
              <Save size={18} />
              {saving ? "Đang lưu" : saved ? "Đã lưu ✓" : "Lưu"}
            </button>
          )}
        </div>
      </header>

      {/* Tab navigation */}
      <div className="admin-tabs">
        <button
          className={activeTab === "config" ? "active" : ""}
          onClick={() => setActiveTab("config")}
        >
          <Save size={16} />
          Cấu hình thư mời
        </button>
        <button
          className={activeTab === "guests" ? "active" : ""}
          onClick={() => setActiveTab("guests")}
        >
          <Users size={16} />
          Quản lý khách mời
        </button>
        <button
          className={activeTab === "logs" ? "active" : ""}
          onClick={() => setActiveTab("logs")}
        >
          <ClipboardList size={16} />
          Nhật ký truy cập
        </button>
        <button
          className={activeTab === "wishes" ? "active" : ""}
          onClick={() => setActiveTab("wishes")}
        >
          <MessageCircle size={16} />
          Sổ lưu bút
        </button>
      </div>

      {/* Token chung */}
      <section className="admin-panel media-panel">
        <label className="token-field">
          <span>Admin token</span>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="Chỉ cần nhập nếu Render có ADMIN_TOKEN"
          />
        </label>
      </section>

      {error && <p className="admin-error">{error}</p>}

      {activeTab === "config" && (
        <>
          <section className="admin-panel media-panel">
            <label className="upload-box">
              <ImagePlus size={24} />
              <span>Ảnh chính của người tốt nghiệp</span>
              <small>Chọn nhiều ảnh để hiển thị trong khung hero</small>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => uploadImages(e.target.files, "heroImages")}
              />
            </label>
            <div className="gallery-manager hero-image-manager">
              {heroImages.map((image) => {
                const crop = config.heroImageCrops?.[image] || { x: 50, y: 50 };

                return (
                  <div className="image-manager-item hero-crop-item" key={image}>
                    <button type="button" onClick={() => setPrimaryHeroImage(image)} title="Đặt làm ảnh chính đầu tiên">
                      <img
                        src={resolveAsset(image)}
                        alt="Ảnh chính"
                        style={{ objectPosition: `${crop.x ?? 50}% ${crop.y ?? 50}%` }}
                      />
                      {config.heroImage === image && <span>Chính</span>}
                    </button>
                    <button type="button" className="delete-image-button" onClick={() => removeHeroImage(image)} title="Xóa ảnh">
                      <Trash2 size={16} />
                    </button>
                    <div className="hero-crop-controls">
                      <label>
                        <small>Ngang</small>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={crop.x ?? 50}
                          onChange={(e) => updateHeroImageCrop(image, "x", e.target.value)}
                        />
                      </label>
                      <label>
                        <small>Dọc</small>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={crop.y ?? 50}
                          onChange={(e) => updateHeroImageCrop(image, "y", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="admin-panel intro-gif-panel">
            <PanelTitle icon={<Sparkles size={20} />} title="Ảnh/GIF lời chào mở đầu" />
            <div className="intro-gif-editor">
              {config.introGreetingImage ? (
                <div className="intro-gif-preview">
                  <img src={resolveAsset(config.introGreetingImage)} alt="Ảnh lời chào mở đầu" />
                  <button
                    type="button"
                    className="delete-image-button"
                    onClick={() => updateField("introGreetingImage", "")}
                    title="Xóa ảnh/GIF lời chào"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="intro-gif-empty">Chưa có ảnh/GIF lời chào</div>
              )}
              <label className="inline-upload">
                <ImagePlus size={18} />
                {config.introGreetingImage ? "Thay ảnh/GIF" : "Thêm ảnh/GIF"}
                <input
                  type="file"
                  accept="image/gif,image/*"
                  onChange={(e) => uploadImages(e.target.files, "introGreetingImage")}
                />
              </label>
            </div>
          </section>

          <section className="admin-panel form-grid">
            <label className="wide checkbox-field">
              <input
                type="checkbox"
                checked={config.showIntroSection !== false}
                onChange={(e) => updateField("showIntroSection", e.target.checked)}
              />
              <span>Hiển thị ô lời mời trong giao diện client</span>
            </label>
            <label className="wide checkbox-field">
              <input
                type="checkbox"
                checked={config.guestbookEnabled !== false}
                onChange={(e) => updateField("guestbookEnabled", e.target.checked)}
              />
              <span>Hiển thị sổ lưu bút online cho khách gửi lời chúc</span>
            </label>
            {fields.map(([key, label, type = "text"]) => (
              <label key={key} className={longTextFields.includes(key) ? "wide" : ""}>
                <span>{label}</span>
                {longTextFields.includes(key) ? (
                  <textarea value={config[key] || ""} onChange={(e) => updateField(key, e.target.value)} rows={3} />
                ) : (
                  <input type={type} value={config[key] || ""} onChange={(e) => updateField(key, e.target.value)} />
                )}
              </label>
            ))}
          </section>

          <section className="admin-panel">
            <PanelTitle icon={<Camera size={20} />} title="Ảnh kỷ niệm bên dưới" />
            <label className="inline-upload">
              <ImagePlus size={18} />
              Thêm ảnh
              <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(e.target.files, "gallery")} />
            </label>
            <div className="gallery-manager">
              {(config.gallery || []).map((image) => (
                <div className="image-manager-item" key={image}>
                  <button type="button" onClick={() => removeGalleryImage(image)} title="Xóa ảnh">
                    <img src={resolveAsset(image)} alt="Ảnh thư viện" />
                  </button>
                  <button type="button" className="delete-image-button" onClick={() => removeGalleryImage(image)} title="Xóa ảnh">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <ListEditor
            title="Lưu ý"
            items={config.notes || []}
            addLabel="Thêm lưu ý"
            onChange={(items) => updateField("notes", items)}
          />

          <MemoryEditor
            items={config.memories || []}
            onChange={(items) => updateField("memories", items)}
          />

          {/* ─ Nhạc nền ─ */}
          <section className="admin-panel music-panel">
            <PanelTitle icon={<Music2 size={20} />} title="Nhạc nền (phát khi mở thiếp)" />
            <div className="music-editor">
              {config.backgroundMusic ? (
                <div className="music-preview">
                  <Music2 size={20} className="music-preview-icon" />
                  <div className="music-preview-info">
                    <span>{config.backgroundMusic.split("/").pop()}</span>
                    <audio controls src={config.backgroundMusic} style={{ width: "100%", marginTop: 6 }} />
                  </div>
                  <button
                    type="button"
                    className="delete-image-button"
                    style={{ position: "static", width: 32, height: 32 }}
                    onClick={() => updateField("backgroundMusic", "")}
                    title="Xóa nhạc"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <div className="music-empty">Chưa có nhạc nền. Tải lên file mp3, wav, m4a...</div>
              )}

              {/* ── Thanh điều chỉnh âm lượng ── */}
              <div className="music-volume-row">
                <label className="music-volume-label" htmlFor="music-volume-slider">
                  {
                    (config.musicVolume ?? 55) === 0
                      ? <VolumeX size={16} />
                      : <Volume2 size={16} />
                  }
                  <span>Âm lượng nhạc</span>
                </label>
                <div className="music-volume-control">
                  <input
                    id="music-volume-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={config.musicVolume ?? 55}
                    onChange={(e) => updateField("musicVolume", Number(e.target.value))}
                    className="music-volume-slider"
                    style={{ "--val": config.musicVolume ?? 55 }}
                  />
                  <span className="music-volume-pct">{config.musicVolume ?? 55}%</span>
                </div>
              </div>

              <label className="inline-upload">
                <Music2 size={18} />
                {config.backgroundMusic ? "Thay nhạc" : "Tải nhạc lên"}
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.ogg,.m4a,.aac"
                  onChange={(e) => uploadAudio(e.target.files?.[0], "backgroundMusic")}
                />
              </label>
            </div>
          </section>
        </>
      )}

      {activeTab === "guests" && (
        <GuestManager authHeaders={authHeaders} />
      )}

      {activeTab === "logs" && (
        <AccessLogPanel authHeaders={authHeaders} />
      )}

      {activeTab === "wishes" && (
        <WishesManager authHeaders={authHeaders} />
      )}
    </main>
  );
}

function AccessLogPanel({ authHeaders }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/access-logs", { headers: authHeaders() });
      if (!res.ok) throw new Error("Không tải được nhật ký truy cập");
      setLogs(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <section className="admin-panel access-log-panel">
      <div className="access-log-header">
        <PanelTitle icon={<ClipboardList size={20} />} title="Nhật ký truy cập" />
        <button type="button" className="secondary-button" onClick={fetchLogs} disabled={loading}>
          {loading ? "Đang tải" : "Tải lại"}
        </button>
      </div>

      <p className="guest-manager-desc">
        Ghi lại admin mở trang quản trị và từng khách mời mở link cá nhân, kèm IP, trình duyệt và loại thiết bị.
      </p>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="guest-loading">Đang tải...</p>}
      {!loading && logs.length === 0 && <p className="guest-empty">Chưa có lượt truy cập nào.</p>}

      {!loading && logs.length > 0 && (
        <div className="access-log-table">
          <div className="access-log-row access-log-row-head">
            <span>Thời gian</span>
            <span>Ai vào</span>
            <span>Máy nào vào</span>
            <span>IP</span>
          </div>
          {logs.map((log) => {
            const device = log.device || {};
            const actor =
              log.type === "admin"
                ? "Admin"
                : `${log.guestRelation ? `${log.guestRelation} ` : ""}${log.guestName || log.actor || "Khách"}`;
            return (
              <div className="access-log-row" key={log.id}>
                <span>{formatLogTime(log.createdAt)}</span>
                <span>
                  <strong>{actor}</strong>
                  <small>{log.type === "admin" ? "Trang quản trị" : "Link khách mời"}</small>
                </span>
                <span>
                  {device.type || "Không rõ"} · {device.platform || "Không rõ"} · {device.browser || "Không rõ"}
                  <small title={log.userAgent}>{log.userAgent || "Không có user-agent"}</small>
                </span>
                <span>{log.ip || "Không rõ"}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Wishes Manager ────────────────────────────────────────────────────────────

function WishesManager({ authHeaders }) {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWishes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/wishes", { headers: authHeaders() });
      if (!res.ok) throw new Error("Không tải được sổ lưu bút");
      setWishes(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWishes(); }, []);

  const deleteWish = async (id) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/wishes/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Không xóa được lời chúc");
      setWishes((current) => current.filter((wish) => wish.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const formatWishTime = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  };

  return (
    <section className="admin-panel wishes-manager">
      <PanelTitle icon={<MessageCircle size={20} />} title="Sổ lưu bút online" />
      <p className="guest-manager-desc">
        Những lời chúc khách gửi từ thiệp sẽ được lưu ở đây. Lời mới nhất nằm trên cùng.
      </p>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="guest-loading">Đang tải lời chúc...</p>}
      {!loading && wishes.length === 0 && (
        <p className="guest-empty">Chưa có lời chúc nào. Khi khách gửi, lời chúc sẽ xuất hiện tại đây.</p>
      )}

      <div className="admin-wish-list">
        {wishes.map((wish) => (
          <article className="admin-wish-item" key={wish.id}>
            <div>
              <p>{wish.message}</p>
              <div className="admin-wish-meta">
                <strong>{wish.relation ? `${wish.relation} ${wish.name}` : wish.name}</strong>
                <span>{formatWishTime(wish.createdAt)}</span>
              </div>
            </div>
            <button type="button" className="delete-guest-btn" onClick={() => deleteWish(wish.id)} title="Xóa lời chúc">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Guest Manager ─────────────────────────────────────────────────────────────

function GuestManager({ authHeaders }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Bạn");
  const [privateMessage, setPrivateMessage] = useState("");
  const [photos, setPhotos] = useState([]);
  const [photoCrops, setPhotoCrops] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const baseUrl = `${window.location.protocol}//${window.location.host}`;

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guests", { headers: authHeaders() });
      if (!res.ok) throw new Error("Không tải được danh sách khách");
      setGuests(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuests(); }, []);

  // Upload ảnh khách mời (dùng chung cho cả form tạo và sửa)
  const uploadGuestPhoto = async (file, onDone) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", headers: authHeaders(), body: fd });
      if (!res.ok) throw new Error("Upload ảnh thất bại");
      const data = await res.json();
      onDone(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const createGuest = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: name.trim(),
          relation,
          privateMessage: privateMessage.trim(),
          photos,
          photoCrops
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Không tạo được khách mời");
      }
      const guest = await res.json();
      setGuests((prev) => [guest, ...prev]);
      setName(""); setPrivateMessage(""); setPhotos([]); setPhotoCrops([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (guest) => {
    setEditingId(guest.id);
    const gPhotos = Array.isArray(guest.photos) && guest.photos.length > 0
      ? guest.photos
      : (guest.photo ? [guest.photo] : []);
    const gCrops = Array.isArray(guest.photoCrops) && guest.photoCrops.length > 0
      ? guest.photoCrops
      : (guest.photoCrop ? [guest.photoCrop] : []);
    setEditDraft({
      name: guest.name,
      relation: guest.relation,
      privateMessage: guest.privateMessage || "",
      photos: gPhotos,
      photoCrops: gCrops
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft({}); };

  const saveEdit = async (id) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(editDraft)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Không lưu được");
      }
      const updated = await res.json();
      setGuests((prev) => prev.map((g) => g.id === id ? updated : g));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGuest = async (id) => {
    setError("");
    try {
      const res = await fetch(`/api/guests/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Không xóa được khách");
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const copyLink = (token) => {
    const link = `${baseUrl}/?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(token);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Sub-component: editor nhiều ảnh khách mời (tối đa 2)
  const GuestPhotosEditor = ({ currentPhotos = [], currentCrops = [], onPhotosChange, onCropsChange }) => {
    const addPhoto = (url) => {
      onPhotosChange([...currentPhotos, url]);
      onCropsChange([...currentCrops, { x: 50, y: 50 }]);
    };
    const removePhoto = (idx) => {
      onPhotosChange(currentPhotos.filter((_, i) => i !== idx));
      onCropsChange(currentCrops.filter((_, i) => i !== idx));
    };
    const updateCrop = (idx, crop) => {
      const next = [...currentCrops];
      next[idx] = crop;
      onCropsChange(next);
    };
    return (
      <div className="guest-photo-editor">
        <span className="guest-form-label">
          📸 Ảnh khách mời
          {currentPhotos.length >= 2 && (
            <span className="guest-photo-badge">
              ✨ 2 ảnh → layout 1 lớn + 2 nhỏ dọc
            </span>
          )}
        </span>

        {/* Danh sách ảnh hiện tại */}
        {currentPhotos.length > 0 && (
          <div className="guest-multi-photos-list">
            {currentPhotos.map((url, idx) => (
              <div className="guest-multi-photo-item" key={`${url}-${idx}`}>
                <div className="guest-multi-photo-preview-row">
                  <img
                    src={resolveAsset(url)}
                    alt={`Ảnh khách ${idx + 1}`}
                    className="guest-photo-thumb"
                    style={{ objectPosition: `${currentCrops[idx]?.x ?? 50}% ${currentCrops[idx]?.y ?? 50}%` }}
                  />
                  <div className="guest-multi-photo-label">
                    <span>Ảnh {idx + 1}{idx === 0 ? " (chính)" : ""}</span>
                    <button
                      type="button"
                      className="guest-photo-remove-btn"
                      onClick={() => removePhoto(idx)}
                      title="Xóa ảnh này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="guest-crop-sliders">
                  <label>
                    <span>Vị trí ngang ({currentCrops[idx]?.x ?? 50}%)</span>
                    <input
                      type="range" min="0" max="100"
                      value={currentCrops[idx]?.x ?? 50}
                      onChange={(e) => updateCrop(idx, { ...currentCrops[idx], x: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    <span>Vị trí dọc ({currentCrops[idx]?.y ?? 50}%)</span>
                    <input
                      type="range" min="0" max="100"
                      value={currentCrops[idx]?.y ?? 50}
                      onChange={(e) => updateCrop(idx, { ...currentCrops[idx], y: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nút thêm ảnh — tối đa 2 */}
        {currentPhotos.length < 2 && (
          <label className="guest-photo-upload-btn">
            <Camera size={15} />
            {uploadingPhoto ? "Đang tải..." : currentPhotos.length === 0 ? "Tải ảnh lên" : "Thêm ảnh thứ 2"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              disabled={uploadingPhoto}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadGuestPhoto(file, addPhoto);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {currentPhotos.length === 0 && (
          <div className="guest-photo-empty" style={{ width: "100%", height: 56 }}>Chưa có ảnh</div>
        )}
      </div>
    );
  };

  return (
    <section className="admin-panel guest-manager">
      <PanelTitle icon={<Users size={20} />} title="Quản lý khách mời" />

      <p className="guest-manager-desc">
        Tạo link cá nhân cho từng khách. Khi khách mở link, trang sẽ hiển thị lời mời có tên, quan hệ, tin nhắn riêng và <strong>ảnh của khách</strong> cạnh ảnh tốt nghiệp.
        Link mặc định (không có token) sẽ <strong>không</strong> hiển thị tên người được mời.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {/* Form tạo khách mới */}
      <form className="guest-form" onSubmit={createGuest}>
        <div className="guest-form-row">
          <label className="guest-form-field">
            <span>Tên khách mời</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              required
            />
          </label>
          <label className="guest-form-field">
            <span>Quan hệ / Xưng hô</span>
            <select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="guest-form-field wide">
          <span>Tin nhắn riêng cho khách này (không bắt buộc)</span>
          <textarea
            value={privateMessage}
            onChange={(e) => setPrivateMessage(e.target.value)}
            placeholder="Ví dụ: Cảm ơn bạn đã luôn đồng hành trong suốt 4 năm học..."
            rows={2}
          />
        </label>
        <GuestPhotosEditor
          currentPhotos={photos}
          currentCrops={photoCrops}
          onPhotosChange={setPhotos}
          onCropsChange={setPhotoCrops}
        />
        <button type="submit" disabled={creating || !name.trim()} className="guest-create-btn">
          <Link2 size={18} />
          {creating ? "Đang tạo..." : "Tạo link mời"}
        </button>
      </form>

      {/* Danh sách khách */}
      <div className="guest-list">
        {loading && <p className="guest-loading">Đang tải...</p>}
        {!loading && guests.length === 0 && (
          <p className="guest-empty">Chưa có khách mời nào. Tạo link đầu tiên bên trên.</p>
        )}
        {guests.map((guest) => {
          const link = `${baseUrl}/?token=${guest.token}`;
          const isEditing = editingId === guest.id;
          return (
            <div className={`guest-item${isEditing ? " guest-item-editing" : ""}`} key={guest.id}>
              {isEditing ? (
                <div className="guest-edit-form">
                  <div className="guest-form-row">
                    <label className="guest-form-field">
                      <span>Tên</span>
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                    </label>
                    <label className="guest-form-field">
                      <span>Quan hệ</span>
                      <select
                        value={editDraft.relation}
                        onChange={(e) => setEditDraft((d) => ({ ...d, relation: e.target.value }))}
                      >
                        {RELATION_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="guest-form-field wide">
                    <span>Tin nhắn riêng</span>
                    <textarea
                      value={editDraft.privateMessage}
                      onChange={(e) => setEditDraft((d) => ({ ...d, privateMessage: e.target.value }))}
                      rows={2}
                      placeholder="Lời nhắn gửi riêng đến khách này..."
                    />
                  </label>
                  <GuestPhotosEditor
                    currentPhotos={editDraft.photos || []}
                    currentCrops={editDraft.photoCrops || []}
                    onPhotosChange={(p) => setEditDraft((d) => ({ ...d, photos: p }))}
                    onCropsChange={(c) => setEditDraft((d) => ({ ...d, photoCrops: c }))}
                  />
                  <div className="guest-edit-actions">
                    <button
                      type="button"
                      className="guest-save-btn"
                      onClick={() => saveEdit(guest.id)}
                      disabled={saving || !editDraft.name?.trim()}
                    >
                      <Save size={15} />
                      {saving ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button type="button" className="guest-cancel-btn" onClick={cancelEdit}>
                      Huỷ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="guest-info">
                  <div className="guest-name-row">
                    {((Array.isArray(guest.photos) && guest.photos.length > 0) || guest.photo) && (
                      <img
                        src={resolveAsset(Array.isArray(guest.photos) && guest.photos.length > 0 ? guest.photos[0] : guest.photo)}
                        alt={guest.name}
                        className="guest-list-photo"
                        style={{
                          objectPosition: `${(Array.isArray(guest.photoCrops) && guest.photoCrops.length > 0 ? guest.photoCrops[0] : guest.photoCrop)?.x ?? 50}% ${(Array.isArray(guest.photoCrops) && guest.photoCrops.length > 0 ? guest.photoCrops[0] : guest.photoCrop)?.y ?? 50}%`
                        }}
                      />
                    )}
                    <div>
                      <span className="guest-badge">{guest.relation}</span>
                      <strong>{guest.name}</strong>
                    </div>
                  </div>
                  {guest.privateMessage && (
                    <p className="guest-private-msg">💬 {guest.privateMessage}</p>
                  )}
                  <a
                    className="guest-link"
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    title="Mở link mời"
                  >
                    {link}
                  </a>
                </div>
              )}
              {!isEditing && (
                <div className="guest-actions">
                  <button
                    type="button"
                    className="edit-guest-btn"
                    onClick={() => startEdit(guest)}
                    title="Sửa thông tin khách"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    type="button"
                    className={`copy-btn ${copiedId === guest.token ? "copied" : ""}`}
                    onClick={() => copyLink(guest.token)}
                    title="Sao chép link"
                  >
                    {copiedId === guest.token ? <Check size={16} /> : <Copy size={16} />}
                    {copiedId === guest.token ? "Đã sao chép" : "Sao chép"}
                  </button>
                  <button
                    type="button"
                    className="delete-guest-btn"
                    onClick={() => deleteGuest(guest.id)}
                    title="Xóa khách"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function PanelTitle({ icon, title }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function ListEditor({ title, items, addLabel, onChange }) {
  const updateItem = (index, value) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  return (
    <section className="admin-panel list-editor">
      <PanelTitle icon={<Check size={20} />} title={title} />
      {items.map((item, index) => (
        <div className="row-editor" key={index}>
          <input value={item} onChange={(e) => updateItem(index, e.target.value)} />
          <button onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} title="Xóa">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button className="secondary-button" onClick={() => onChange([...items, ""])}>
        <Plus size={18} />
        {addLabel}
      </button>
    </section>
  );
}

function MemoryEditor({ items, onChange }) {
  const updateItem = (index, key, value) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  return (
    <section className="admin-panel list-editor">
      <PanelTitle icon={<Medal size={20} />} title="Kỷ niệm đáng nhớ" />
      {items.map((item, index) => (
        <div className="memory-editor" key={index}>
          <input
            value={item.title || ""}
            onChange={(e) => updateItem(index, "title", e.target.value)}
            placeholder="Danh hiệu, hoạt động, ngoại khóa..."
          />
          <textarea
            value={item.description || ""}
            onChange={(e) => updateItem(index, "description", e.target.value)}
            placeholder="Mô tả ngắn"
            rows={2}
          />
          <button onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} title="Xóa">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button className="secondary-button" onClick={() => onChange([...items, { title: "", description: "" }])}>
        <Plus size={18} />
        Thêm kỷ niệm
      </button>
    </section>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const { config, setConfig, loading } = useConfig();
  const { guest, checked: guestChecked } = useGuestToken();
  const isAdmin = window.location.pathname.startsWith("/admin");
  const [isOpened, setIsOpened] = useState(false);

  // Unlock AudioContext sớm nhất khi user chạm/click lần đầu
  // → đảm bảo tiếng mở thiệp phát được kể cả khi gọi từ setTimeout
  useEffect(() => { unlockAudioContextOnce(); }, []);

  const page = useMemo(() => {
    if (loading || !guestChecked) return <div className="loading">Đang tải...</div>;
    if (isAdmin) return <Admin config={config} setConfig={setConfig} />;
    if (!isOpened) {
      return (
        <EnvelopeScreen
          config={config}
          guest={guest}
          onOpen={() => setIsOpened(true)}
        />
      );
    }
    return <Invitation config={config} isOpened={isOpened} />;
  }, [config, isAdmin, loading, setConfig, isOpened, guest, guestChecked]);

  return page;
}

createRoot(document.getElementById("root")).render(<App />);
