import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Award,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Copy,
  GraduationCap,
  Heart,
  ImagePlus,
  Link2,
  MapPin,
  Medal,
  Music,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users
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
  musicUrl: "",
  musicTitle: "",
  musicVolume: 0.6,
  introGreetingImage: "",
  introGreetingTemplate: "Chào {quan hệ} {người được mời}, mình gửi bạn một chiếc thiệp nhỏ cho ngày tốt nghiệp thật đặc biệt này.",
  greeting: "",
  message: "",
  privateMessage: "",
  description: "",
  dressCode: "",
  phone: "",
  rsvpUrl: "",
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
  ["dressCode", "Dress code"],
  ["rsvpUrl", "Link xác nhận tham dự"]
];

const RELATION_OPTIONS = [
  "Anh", "Chị", "Bạn", "Cô", "Chú", "Bác", "Ông", "Bà",
  "Em", "Thầy", "Cô giáo", "Anh họ", "Chị họ", "Các bạn", "Anh/Chị"
];

function normalizeConfig(data) {
  const heroImages = Array.isArray(data?.heroImages) ? data.heroImages : [];
  const legacyHeroImage = data?.heroImage ? [data.heroImage] : [];

  return {
    ...emptyConfig,
    ...data,
    heroImages: [...new Set([...heroImages, ...legacyHeroImage])],
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

// ── Sound Effect: Mở thiệp ────────────────────────────────────────────────────────

function playOpenSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1️⃣ Tiếng xào xạc giấy (white noise burst)
    const rustleLen = ctx.sampleRate * 0.38;
    const rustleBuffer = ctx.createBuffer(1, rustleLen, ctx.sampleRate);
    const rustleData = rustleBuffer.getChannelData(0);
    for (let i = 0; i < rustleLen; i++) {
      // Envelope: tăng nhanh, giảm dần
      const env = Math.pow(1 - i / rustleLen, 1.8);
      rustleData[i] = (Math.random() * 2 - 1) * env;
    }
    const rustleSource = ctx.createBufferSource();
    rustleSource.buffer = rustleBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1800;
    bandpass.Q.value = 0.6;

    const rustleGain = ctx.createGain();
    rustleGain.gain.setValueAtTime(0.45, now);
    rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    rustleSource.connect(bandpass);
    bandpass.connect(rustleGain);
    rustleGain.connect(ctx.destination);
    rustleSource.start(now);
    rustleSource.stop(now + 0.4);

    // 2️⃣ Tiếng "whoosh" nhẹ (swept noise)
    const whooshLen = ctx.sampleRate * 0.55;
    const whooshBuffer = ctx.createBuffer(1, whooshLen, ctx.sampleRate);
    const whooshData = whooshBuffer.getChannelData(0);
    for (let i = 0; i < whooshLen; i++) {
      const t = i / whooshLen;
      const env = t < 0.3 ? t / 0.3 : Math.pow(1 - (t - 0.3) / 0.7, 2);
      whooshData[i] = (Math.random() * 2 - 1) * env * 0.55;
    }
    const whooshSource = ctx.createBufferSource();
    whooshSource.buffer = whooshBuffer;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(400, now + 0.05);
    highpass.frequency.linearRampToValueAtTime(3200, now + 0.6);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.0, now + 0.05);
    whooshGain.gain.linearRampToValueAtTime(0.35, now + 0.22);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    whooshSource.connect(highpass);
    highpass.connect(whooshGain);
    whooshGain.connect(ctx.destination);
    whooshSource.start(now + 0.05);
    whooshSource.stop(now + 0.65);

    // 3️⃣ Tiếng "ding" mừng (sine bell)
    const bell = ctx.createOscillator();
    bell.type = "sine";
    bell.frequency.setValueAtTime(1047, now + 0.28); // C6
    bell.frequency.exponentialRampToValueAtTime(880, now + 1.0);  // A5

    const bell2 = ctx.createOscillator();
    bell2.type = "sine";
    bell2.frequency.value = 1319; // E6 – harmony

    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(0, now + 0.28);
    bellGain.gain.linearRampToValueAtTime(0.28, now + 0.31);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    const bell2Gain = ctx.createGain();
    bell2Gain.gain.setValueAtTime(0, now + 0.32);
    bell2Gain.gain.linearRampToValueAtTime(0.14, now + 0.35);
    bell2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    bell.connect(bellGain);
    bell2.connect(bell2Gain);
    bellGain.connect(ctx.destination);
    bell2Gain.connect(ctx.destination);

    bell.start(now + 0.28);
    bell.stop(now + 1.2);
    bell2.start(now + 0.32);
    bell2.stop(now + 1.2);

    // 4️⃣ Nốt thứ ba – G5 – chạm đầy đủ âm
    const bell3 = ctx.createOscillator();
    bell3.type = "sine";
    bell3.frequency.value = 784; // G5
    const bell3Gain = ctx.createGain();
    bell3Gain.gain.setValueAtTime(0, now + 0.38);
    bell3Gain.gain.linearRampToValueAtTime(0.1, now + 0.42);
    bell3Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    bell3.connect(bell3Gain);
    bell3Gain.connect(ctx.destination);
    bell3.start(now + 0.38);
    bell3.stop(now + 1.2);

    // Tự đóng context sau khi xong
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch (_e) {
    // Ignore – Web Audio không khả dụng
  }
}

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

function useAutoInvitationScroll(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const sections = Array.from(document.querySelectorAll("[data-autoscroll-section]"));
    if (!sections.length) return undefined;

    let cancelled = false;
    let timeoutId = 0;
    let rafId = 0;
    const scrollElement = document.scrollingElement || document.documentElement;

    const clearActive = () => {
      sections.forEach((section) => section.classList.remove("auto-scroll-active"));
    };

    const cancel = () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      clearActive();
    };

    const animateScrollTo = (targetY, duration) =>
      new Promise((resolve) => {
        const startY = window.scrollY;
        const distance = targetY - startY;
        const startTime = performance.now();

        const step = (now) => {
          if (cancelled) {
            resolve();
            return;
          }

          const progress = Math.min((now - startTime) / duration, 1);
          const eased = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          window.scrollTo(0, startY + distance * eased);

          if (progress < 1) {
            rafId = window.requestAnimationFrame(step);
            return;
          }
          resolve();
        };

        rafId = window.requestAnimationFrame(step);
      });

    const run = async () => {
      for (const section of sections) {
        if (cancelled) break;
        clearActive();
        section.classList.add("auto-scroll-active");

        const rect = section.getBoundingClientRect();
        const maxScroll = scrollElement.scrollHeight - window.innerHeight;
        const targetY = Math.max(
          0,
          Math.min(window.scrollY + rect.top - Math.max(72, (window.innerHeight - rect.height) / 2), maxScroll)
        );
        const distance = Math.abs(targetY - window.scrollY);
        const duration = Math.min(3400, Math.max(1800, distance * 2.8));

        await animateScrollTo(targetY, duration);
        if (cancelled) break;
        await new Promise((resolve) => {
          timeoutId = window.setTimeout(resolve, 1450);
        });
      }
    };

    const startId = window.setTimeout(run, 3200);
    timeoutId = startId;

    window.addEventListener("wheel", cancel, { passive: true, once: true });
    window.addEventListener("touchstart", cancel, { passive: true, once: true });
    window.addEventListener("keydown", cancel, { once: true });

    return () => {
      window.clearTimeout(startId);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("keydown", cancel);
      cancel();
    };
  }, [enabled]);
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
    playOpenSound();
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
        <p className="eyebrow" style={{ color: "rgb(255 246 228 / 80%)" }}>Bạn có một thư mời</p>
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

// ── Invitation ────────────────────────────────────────────────────────────────

function Invitation({ config, isOpened }) {
  const countdown = useCountdown(config);
  const { guest, checked } = useGuestToken();
  useScrollReveal();
  useAutoInvitationScroll(isOpened && checked);

  const photos = useMemo(() => {
    const merged = [...(config.heroImages || []), config.heroImage].filter(Boolean);
    return [...new Set(merged)];
  }, [config.heroImage, config.heroImages]);

  if (!checked) return null;

  return (
    <main className={`invitation-shell${isOpened ? " card-revealed" : ""}`}>
      <section className="hero">
        <FallingGraduationIcons />
        <PhotoCarousel photos={photos} graduateName={config.graduateName} />
        <div className="hero-copy">
          <p className="eyebrow">Thư mời dự tốt nghiệp</p>
          <h1>{config.graduateName}</h1>
          <p>{config.degree}</p>
          <span>{config.school}</span>
        </div>
      </section>

      {/* Banner cá nhân hóa – CHỈ hiển thị khi có khách hợp lệ */}
      {guest && (
        <section className="content-section guest-banner" data-reveal data-autoscroll-section>
          <div className="guest-banner-inner">
            <Heart size={20} className="guest-banner-icon" />
            <p>
              Kính mời <span className="guest-relation">{guest.relation}</span>{" "}
              <strong className="guest-name">{guest.name}</strong>
            </p>
          </div>
        </section>
      )}

      <section className="content-section intro" data-reveal data-autoscroll-section>
        <Sparkles size={22} />
        <p>{config.greeting}</p>
        <strong>{config.message}</strong>
        {config.description && <span>{config.description}</span>}
      </section>

      {config.privateMessage && (
        <section className="content-section private-message" data-reveal data-autoscroll-section>
          <Heart size={22} />
          <div>
            <p className="eyebrow">Lời nhắn gửi riêng</p>
            <strong>{config.privateMessage}</strong>
          </div>
        </section>
      )}

      <section className="countdown-section" data-reveal data-autoscroll-section>
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

      <section className="content-section event-grid" data-reveal data-autoscroll-section>
        <Info icon={<CalendarDays />} label="Ngày" value={formatDate(config.eventDate)} />
        <Info icon={<Clock />} label="Thời gian" value={formatEventTime(config)} />
        <Info icon={<MapPin />} label={config.locationName} value={config.locationAddress} />
      </section>

      {(config.gallery || []).length > 0 && (
        <section className="memory-gallery" data-reveal data-autoscroll-section>
          {(config.gallery || []).slice(0, 5).map((image, index) => (
            <img key={image} src={resolveAsset(image)} alt={`Khoảnh khắc ${index + 1}`} />
          ))}
        </section>
      )}

      <section className="content-section memory-section" data-reveal data-autoscroll-section>
        <div className="section-heading">
          <Medal size={22} />
          <h2>Kỷ niệm đáng nhớ</h2>
        </div>
        <div className="memory-list">
          {(config.memories || []).map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <Award size={20} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section note-section" data-reveal data-autoscroll-section>
        <div className="section-heading">
          <Check size={22} />
          <h2>Lưu ý</h2>
        </div>
        <ul>
          {(config.notes || []).map((note, index) => (
            <li key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="content-section details" data-reveal data-autoscroll-section>
        <p>Dress code: {config.dressCode}</p>
        <p>Trân trọng, {config.hostName}</p>
      </section>

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

function PhotoCarousel({ photos, graduateName }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef(0);
  const touchDelta = useRef(0);
  const hasManyPhotos = photos.length > 1;

  useEffect(() => {
    if (!hasManyPhotos) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % photos.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [hasManyPhotos, photos.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [photos.length]);

  const goTo = (index) => {
    if (!photos.length) return;
    setActiveIndex((index + photos.length) % photos.length);
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

  if (!photos.length) {
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
        {photos.map((image, index) => {
          const framePhotos = [
            image,
            photos[(index + 1) % photos.length],
            photos[(index + 2) % photos.length]
          ].filter((item, itemIndex, items) => item && items.indexOf(item) === itemIndex);

          return (
            <figure className={`carousel-slide photo-count-${framePhotos.length}`} key={`${image}-${index}`}>
              {framePhotos.map((photo, photoIndex) => (
                <img
                  key={`${photo}-${photoIndex}`}
                  src={resolveAsset(photo)}
                  alt={`${graduateName} ${photoIndex + 1}`}
                  className={`photo-card ${photoIndex === 0 ? "main-photo" : "side-photo"}`}
                />
              ))}
            </figure>
          );
        })}
      </div>
      {hasManyPhotos && (
        <div className="carousel-dots" aria-label="Chọn ảnh">
          {photos.map((image, index) => (
            <button
              key={image}
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
  const [activeTab, setActiveTab] = useState("config"); // "config" | "guests"
  const [musicTracks, setMusicTracks] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);

  const updateField = (key, value) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const authHeaders = () => (adminToken ? { "x-admin-token": adminToken } : {});

  const fetchMusicTracks = useCallback(async () => {
    setMusicLoading(true);
    try {
      const res = await fetch("/api/music", { headers: authHeaders() });
      if (!res.ok) throw new Error("Không tải được danh sách nhạc.");
      setMusicTracks(await res.json());
    } catch (musicError) {
      setError(musicError.message);
    } finally {
      setMusicLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (activeTab === "config") {
      fetchMusicTracks();
    }
  }, [activeTab, fetchMusicTracks]);

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

  const uploadMusic = async (files) => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    setError("");
    const formData = new FormData();
    formData.append("audio", file);
    try {
      const res = await fetch("/api/upload-audio", {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });
      if (!res.ok) {
        throw new Error("Không upload được nhạc. Kiểm tra admin token hoặc định dạng file.");
      }
      const track = await res.json();
      setMusicTracks((current) => [track, ...current.filter((item) => item.url !== track.url)]);
      setConfig((current) => ({ ...current, musicUrl: track.url, musicTitle: track.title }));
    } catch (musicError) {
      setError(musicError.message);
    }
  };

  const selectMusic = (url) => {
    const track = musicTracks.find((item) => item.url === url);
    setConfig((current) => ({
      ...current,
      musicUrl: url,
      musicTitle: track?.title || ""
    }));
  };

  const removeHeroImage = (image) => {
    const nextImages = (config.heroImages || []).filter((item) => item !== image);
    setConfig((current) => ({
      ...current,
      heroImages: nextImages,
      heroImage: current.heroImage === image ? nextImages[0] || "" : current.heroImage
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

  const longTextFields = ["message", "greeting", "description", "privateMessage", "introGreetingTemplate"];
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
              {heroImages.map((image) => (
                <div className="image-manager-item" key={image}>
                  <button type="button" onClick={() => setPrimaryHeroImage(image)} title="Đặt làm ảnh chính đầu tiên">
                    <img src={resolveAsset(image)} alt="Ảnh chính" />
                    {config.heroImage === image && <span>Chính</span>}
                  </button>
                  <button type="button" className="delete-image-button" onClick={() => removeHeroImage(image)} title="Xóa ảnh">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
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

          <section className="admin-panel music-panel">
            <PanelTitle icon={<Music size={20} />} title="Nhạc nền" />
            <div className="music-editor">
              <label className="music-select-field">
                <span>Chọn nhạc</span>
                <select value={config.musicUrl || ""} onChange={(e) => selectMusic(e.target.value)}>
                  <option value="">Không phát nhạc</option>
                  {musicTracks.map((track) => (
                    <option key={track.url} value={track.url}>
                      {track.title}
                    </option>
                  ))}
                  {config.musicUrl && !musicTracks.some((track) => track.url === config.musicUrl) && (
                    <option value={config.musicUrl}>{config.musicTitle || config.musicUrl}</option>
                  )}
                </select>
              </label>

              {/* Thanh kéo âm lượng */}
              <label className="music-volume-field">
                <span className="music-volume-label">
                  🔊 Âm lượng: <strong>{Math.round((config.musicVolume ?? 0.6) * 100)}%</strong>
                </span>
                <div className="music-volume-row">
                  <span className="vol-icon">🔇</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={config.musicVolume ?? 0.6}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      updateField("musicVolume", vol);
                      if (audioRef?.current) audioRef.current.volume = vol;
                    }}
                    className="volume-slider"
                  />
                  <span className="vol-icon">🔊</span>
                </div>
              </label>

              <label className="inline-upload">
                <Music size={18} />
                Thêm nhạc
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/aac,audio/flac"
                  onChange={(e) => uploadMusic(e.target.files)}
                />
              </label>
              {musicLoading && <small className="music-note">Đang tải danh sách nhạc...</small>}
              {!musicLoading && musicTracks.length === 0 && (
                <small className="music-note">Chưa có nhạc. Upload file MP3/M4A/WAV/OGG rồi chọn trong danh sách.</small>
              )}
              {config.musicUrl && (
                <audio className="music-preview" controls src={resolveAsset(config.musicUrl)}>
                  Trình duyệt không hỗ trợ phát nhạc.
                </audio>
              )}
            </div>
          </section>

          <section className="admin-panel form-grid">
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
        </>
      )}

      {activeTab === "guests" && (
        <GuestManager authHeaders={authHeaders} />
      )}
    </main>
  );
}

// ── Guest Manager ─────────────────────────────────────────────────────────────

function GuestManager({ authHeaders }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Bạn");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

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

  useEffect(() => {
    fetchGuests();
  }, []);

  const createGuest = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: name.trim(), relation })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Không tạo được khách mời");
      }
      const guest = await res.json();
      setGuests((prev) => [guest, ...prev]);
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteGuest = async (id) => {
    setError("");
    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
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

  return (
    <section className="admin-panel guest-manager">
      <PanelTitle icon={<Users size={20} />} title="Quản lý khách mời" />

      <p className="guest-manager-desc">
        Tạo link cá nhân cho từng khách. Khi khách mở link, trang sẽ hiển thị lời mời có tên và quan hệ riêng.
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
          return (
            <div className="guest-item" key={guest.id}>
              <div className="guest-info">
                <div className="guest-name-row">
                  <span className="guest-badge">{guest.relation}</span>
                  <strong>{guest.name}</strong>
                </div>
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
              <div className="guest-actions">
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
  const audioRef = useRef(null);

  const playMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !config.musicUrl) return;
    audio.volume = typeof config.musicVolume === "number" ? config.musicVolume : 0.6;
    audio.muted = false;
    audio.play().catch(() => {});
  }, [config.musicUrl, config.musicVolume]);

  const handleInvitationOpen = useCallback(() => {
    setIsOpened(true);
    playMusic();
  }, [playMusic]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
  }, [config.musicUrl]);

  useEffect(() => {
    if (!config.musicUrl || isAdmin) return undefined;

    const audio = audioRef.current;
    const timers = [0, 250, 900, 1800].map((delay) => window.setTimeout(playMusic, delay));

    const playAfterInteraction = () => {
      playMusic();
      window.removeEventListener("pointerdown", playAfterInteraction);
      window.removeEventListener("keydown", playAfterInteraction);
      window.removeEventListener("touchstart", playAfterInteraction);
    };

    window.addEventListener("pointerdown", playAfterInteraction, { once: true });
    window.addEventListener("keydown", playAfterInteraction, { once: true });
    window.addEventListener("touchstart", playAfterInteraction, { once: true });
    document.addEventListener("visibilitychange", playMusic);
    audio?.addEventListener("canplay", playMusic);
    audio?.addEventListener("loadeddata", playMusic);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("pointerdown", playAfterInteraction);
      window.removeEventListener("keydown", playAfterInteraction);
      window.removeEventListener("touchstart", playAfterInteraction);
      document.removeEventListener("visibilitychange", playMusic);
      audio?.removeEventListener("canplay", playMusic);
      audio?.removeEventListener("loadeddata", playMusic);
    };
  }, [config.musicUrl, isAdmin, playMusic]);

  const page = useMemo(() => {
    if (loading || !guestChecked) return <div className="loading">Đang tải...</div>;
    if (isAdmin) return <Admin config={config} setConfig={setConfig} />;
    if (!isOpened) {
      return (
        <EnvelopeScreen
          config={config}
          guest={guest}
          onOpen={handleInvitationOpen}
        />
      );
    }
    return <Invitation config={config} isOpened={isOpened} />;
  }, [config, isAdmin, loading, setConfig, isOpened, guest, guestChecked, handleInvitationOpen]);

  return (
    <>
      {config.musicUrl && !isAdmin && (
        <audio
          ref={audioRef}
          src={resolveAsset(config.musicUrl)}
          preload="auto"
          autoPlay
          playsInline
          loop
          onCanPlay={playMusic}
          onLoadedData={playMusic}
        />
      )}
      {page}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
