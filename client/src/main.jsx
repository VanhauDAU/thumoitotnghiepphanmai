import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Award,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Copy,
  Edit2,
  GraduationCap,
  Heart,
  ImagePlus,
  Link2,
  MapPin,
  Medal,
  MessageCircle,
  Mic,
  Music,
  Plus,
  Save,
  Send,
  Sparkles,
  Square,
  Trash2,
  Users,
  X
} from "lucide-react";
import "./styles.css";

const defaultNotes = [
  "Vui lòng có mặt trước giờ bắt đầu 15 phút.",
  "Trang phục lịch sự, ưu tiên tông màu sáng.",
  "Có thể gửi lời chúc hoặc xác nhận tham dự qua nút bên dưới."
];

const defaultMemories = [
  {
    date: "2019-10-06",
    image: "",
    title: "Ngày đầu tiên lạc lối",
    description: "Bước chân vào cánh cổng đại học, cảm thấy vừa hồi hộp vừa choáng ngợp. Cả nhóm bạn bây giờ đã gặp nhau trong buổi học định hướng đầu tiên, ai nấy đều ngơ ngác và lạc đường tìm phòng học, tạo nên tràng cười đầu tiên, báo hiệu một hành trình đầy thú vị!"
  },
  {
    date: "2022-05-18",
    image: "",
    title: "Những ngày thật chăm chỉ",
    description: "Từng bài học, từng dự án và từng lần cố gắng đã tạo nên hành trình đáng nhớ."
  },
  {
    date: "2026-07-20",
    image: "",
    title: "Khoảnh khắc tốt nghiệp",
    description: "Một dấu mốc khép lại thanh xuân rực rỡ và mở ra chặng đường mới."
  }
];

const emptyConfig = {
  heroImage: "",
  heroImages: [],
  gallery: [],
  schoolLogo: "",
  sashImage: "",
  gateCapImage: "",
  gateDiplomaImage: "",
  showcaseCaption: "",
  graduateName: "",
  degree: "",
  school: "",
  schoolSubtitle: "",
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
  introVoiceUrl: "",
  introVoiceTitle: "",
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
  ["schoolSubtitle", "Tên trường phụ / tiếng Anh"],
  ["showcaseCaption", "Dòng chữ dưới ảnh và sash"],
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
            typeof item === "string" ? { date: "", image: "", title: item, description: "" } : { date: "", image: "", title: "", description: "", ...item }
          )
        : defaultMemories
  };
}

function resolveAsset(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return url;
}

async function readApiError(res, fallback) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return "Server chưa cập nhật API lời chúc. Hãy restart backend hoặc deploy lại.";
  }

  try {
    const data = await res.json();
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

async function readJsonResponse(res, fallback) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server chưa cập nhật API lời chúc. Hãy restart backend hoặc deploy lại.");
  }

  try {
    return await res.json();
  } catch {
    throw new Error(fallback);
  }
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

function formatTimelineDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
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

function getEventYear(config) {
  const eventDate = getEventDateTime(config);
  return eventDate?.getFullYear() || new Date().getFullYear();
}

function getMapQuery(config) {
  return [config.locationName, config.locationAddress].filter(Boolean).join(", ");
}

function getMapOpenUrl(config) {
  if (config.mapUrl) return config.mapUrl;
  const query = getMapQuery(config);
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function getMapEmbedUrl(config) {
  const query = getMapQuery(config) || config.mapUrl;
  return query ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : "";
}

function getMonthTitle(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric"
  }).format(date);
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

function getIntroPhotos(config, guest) {
  const heroPhotos = [...new Set([...(config.heroImages || []), config.heroImage].filter(Boolean))];
  return {
    guestPhoto: guest?.avatar || heroPhotos[1] || heroPhotos[0] || "",
    hostPhoto: heroPhotos[0] || ""
  };
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
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    setToken(token || "");
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

  return { guest, checked, token };
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

function useScrollReveal(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("revealed"));
      return undefined;
    }

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
      document.querySelectorAll("[data-reveal]").forEach((el, index) => {
        el.style.setProperty("--reveal-order", index % 6);
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.94) {
          el.classList.add("revealed");
          return;
        }
        observer.observe(el);
      });
    });
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
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

function IntroPortrait({ image, label, name, className = "" }) {
  return (
    <figure className={`intro-portrait ${className}`}>
      <div className="intro-portrait-frame">
        {image ? (
          <img src={resolveAsset(image)} alt={name || label} />
        ) : (
          <div className="intro-portrait-empty">
            <GraduationCap size={34} />
          </div>
        )}
      </div>
    </figure>
  );
}

function EnvelopeScreen({ config, guest, onOpen }) {
  const [opening, setOpening] = useState(false);
  const envelopeRef = useRef(null);
  const introVoicePlayedRef = useRef(false);
  const greetingText = useMemo(
    () => applyGreetingTemplate(config.introGreetingTemplate, guest),
    [config.introGreetingTemplate, guest]
  );
  const { displayed, done: greetingDone } = useTypewriter(greetingText);
  const { guestPhoto, hostPhoto } = useMemo(() => getIntroPhotos(config, guest), [config, guest]);
  const inviterName = config.graduateName || config.hostName || "Người mời";
  const graduateName = config.graduateName || "Lễ Tốt Nghiệp";
  const guestName = guest?.name || "Khách mời";

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
    setTimeout(() => onOpen(), 4300);
  };

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

  const playIntroVoice = useCallback(() => {
    if (!config.introVoiceUrl || introVoicePlayedRef.current) return;
    introVoicePlayedRef.current = true;
    const audio = new Audio(resolveAsset(config.introVoiceUrl));
    audio.volume = 1;
    audio.play().catch(() => {
      introVoicePlayedRef.current = false;
    });
  }, [config.introVoiceUrl]);

  useEffect(() => {
    introVoicePlayedRef.current = false;
  }, [config.introVoiceUrl]);

  useEffect(() => {
    if (!greetingDone || opening) return undefined;

    const timer = window.setTimeout(playIntroVoice, 140);
    const playAfterInteraction = () => playIntroVoice();

    window.addEventListener("pointerdown", playAfterInteraction, { once: true });
    window.addEventListener("keydown", playAfterInteraction, { once: true });
    window.addEventListener("touchstart", playAfterInteraction, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", playAfterInteraction);
      window.removeEventListener("keydown", playAfterInteraction);
      window.removeEventListener("touchstart", playAfterInteraction);
    };
  }, [greetingDone, opening, playIntroVoice]);

  return (
    <div className={`envelope-screen${opening ? " opening" : ""}${greetingDone ? " greeting-done" : ""}`}>
      <div className="env-bg-icons" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`env-bg-icon env-bg-icon-${i + 1}`}>
            <GraduationCap size={i % 4 === 0 ? 28 : 18} />
          </span>
        ))}
      </div>

      <header className="env-header">
        <p className="env-kicker">Bạn có một thiệp mời từ</p>
        <h1 className="env-name">{inviterName}</h1>
        <div className="intro-greeting-card">
          <span className="intro-greeting-icon" aria-hidden="true">
            <GraduationCap size={34} />
          </span>
          <p className="typewriter-greeting">
            {displayed}
            {!greetingDone && <span className="typewriter-caret" aria-hidden="true" />}
          </p>
        </div>
      </header>

      <section className="env-photo-stage" aria-label="Ảnh khách mời và người mời">
        <IntroPortrait
          image={guestPhoto}
          label="Khách mời"
          name={guestName}
          className="intro-portrait-guest"
        />
        <IntroPortrait
          image={hostPhoto}
          label="Người mời"
          name={graduateName}
          className="intro-portrait-host"
        />
      </section>

      <div className="env-envelope-row">
        {config.introGreetingImage && (
          <img
            className="env-mascot-gif"
            src={resolveAsset(config.introGreetingImage)}
            alt=""
            aria-hidden="true"
          />
        )}

        <div
          className="envelope-wrap"
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
              <strong>{graduateName}</strong>
              {guest && <span>Gửi {guest.relation} {guest.name}</span>}
            </div>
            <div className="envelope-flap">
              <div className="envelope-flap-inner" />
            </div>
            <div className="envelope-body">
              <div className="envelope-seal">
                <GraduationCap size={26} />
              </div>
            </div>
            <div className="envelope-card-peek">
              <Sparkles size={14} />
              <span>Thư mời tốt nghiệp</span>
            </div>
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
        </div>
      </div>

      <div className="graduation-gate-effect" aria-hidden="true">
        <div className="gate-panel gate-panel-left" />
        <div className="gate-panel gate-panel-right" />
        {(config.gateCapImage || config.gateDiplomaImage) && (
          <div className="gate-graduation-props">
            {config.gateCapImage && (
              <img className="gate-prop-image gate-cap-image" src={resolveAsset(config.gateCapImage)} alt="" />
            )}
            {config.gateDiplomaImage && (
              <img className="gate-prop-image gate-diploma-image" src={resolveAsset(config.gateDiplomaImage)} alt="" />
            )}
          </div>
        )}
        <Fireworks active={opening} />
      </div>

      <p className="env-hint">
        {greetingDone ? "Click vào tấm thiệp để mở" : "Lời chào đang được gửi đến bạn..."}
      </p>
    </div>
  );
}

// ── Invitation ────────────────────────────────────────────────────────────────

function useWishes(enabled) {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadWishes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wishes?limit=40");
      if (!res.ok) throw new Error(await readApiError(res, "Không tải được lời chúc."));
      setWishes(await readJsonResponse(res, "Không tải được lời chúc."));
      setError("");
  } catch (wishError) {
      setError("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadWishes();
  }, [enabled, loadWishes]);

  const sendWish = useCallback(async ({ token, message }) => {
    const res = await fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message })
    });
    if (!res.ok) throw new Error(await readApiError(res, "Không gửi được lời chúc."));
    const wish = await readJsonResponse(res, "Không gửi được lời chúc.");
    setWishes((current) => [wish, ...current.filter((item) => item.id !== wish.id)].slice(0, 40));
    return wish;
  }, []);

  return { wishes, loading, error, sendWish };
}

function shuffleWishes(wishes) {
  const shuffled = [...wishes];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function WishBubbles({ wishes }) {
  const [queue, setQueue] = useState([]);
  const [page, setPage] = useState(0);
  const pageSize = 2;

  useEffect(() => {
    const nextQueue = shuffleWishes(wishes || []);
    setQueue(nextQueue);
    setPage(0);
  }, [wishes]);

  useEffect(() => {
    if (queue.length <= pageSize) return undefined;
    const timer = window.setInterval(() => {
      setPage((current) => (current + 1) % Math.ceil(queue.length / pageSize));
    }, 4300);
    return () => window.clearInterval(timer);
  }, [queue.length]);

  const visibleWishes = queue.slice(page * pageSize, page * pageSize + pageSize);
  if (!visibleWishes.length) return null;

  return (
    <div className="wish-bubbles" aria-label="Lời chúc từ khách mời" key={`${page}-${queue.map((wish) => wish.id).join("-")}`}>
      {visibleWishes.map((wish, index) => (
        <article className={`wish-bubble wish-bubble-${index + 1}`} key={wish.id}>
          <strong>{wish.name}:</strong> {wish.message}
        </article>
      ))}
    </div>
  );
}

function WishComposer({ guest, token, recipientName, onSend }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!sent && !localError) return undefined;
    const timer = window.setTimeout(() => {
      setSent(false);
      setLocalError("");
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [sent, localError]);

  const submitWish = async (event) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (!cleanMessage || sending) return;

    setSending(true);
    setLocalError("");
    setSent(false);
    try {
      await onSend({ token, message: cleanMessage });
      setMessage("");
      setSent(true);
    } catch (wishError) {
      setLocalError(
        wishError.message.includes("Server chưa cập nhật")
          ? "Chưa gửi được lời chúc. Vui lòng thử lại sau khi server cập nhật."
          : wishError.message
      );
    } finally {
      setSending(false);
    }
  };

  if (!guest || !token) return null;

  return (
    <section className={`wish-composer${localError ? " has-error" : ""}${sent ? " has-success" : ""}`} aria-label="Gửi lời chúc">
      <form onSubmit={submitWish}>
        <MessageCircle size={18} aria-hidden="true" />
        <input
          value={message}
          onChange={(event) => {
            setMessage(event.target.value.slice(0, 180));
            setSent(false);
          }}
          placeholder={`Chúc mừng ${recipientName || "người mời"}...`}
          maxLength={180}
        />
        <button type="submit" disabled={sending || !message.trim()} title="Gửi lời chúc">
          <Send size={17} />
          <span>{sending ? "Đang gửi" : "Gửi"}</span>
        </button>
      </form>
      {localError && <p className="wish-status error">{localError}</p>}
      {sent && <p className="wish-status">Đã gửi lời chúc.</p>}
    </section>
  );
}

function InvitationCardHero({ config, guest }) {
  const ceremonyYear = getEventYear(config);
  const recipientName = guest ? [guest.relation, guest.name].filter(Boolean).join(" ") : "thân mến";
  const relation = guest?.relation ? `${guest.relation} ` : "";
  const schoolName = config.school || "Trường Đại học";
  const schoolSubtitle = config.schoolSubtitle || "Graduation Ceremony";
  const graduateName = config.graduateName || "Lễ Tốt Nghiệp";

  return (
    <section className="ceremony-card-hero" aria-label="Thiệp mời tốt nghiệp">
      <div className="ceremony-card">
        <div className="school-brand">
          <div className="school-logo">
            {config.schoolLogo ? (
              <img src={resolveAsset(config.schoolLogo)} alt={`Logo ${schoolName}`} />
            ) : (
              <GraduationCap size={34} />
            )}
          </div>
          <div>
            <strong>{schoolName}</strong>
            <span>{schoolSubtitle}</span>
          </div>
        </div>

        <div className="dear-line">
          <span>Dear</span>
          <strong>{recipientName}</strong>
        </div>

        <p className="ceremony-invite">
          Thân mời {relation}đến dự
        </p>
        <p className="ceremony-owner">{graduateName}'s</p>
        <h1>
          Graduation
          <span>Ceremony {ceremonyYear}</span>
        </h1>
      </div>
    </section>
  );
}

function getRollingPhotoFrames(photos, frameSize = 4) {
  if (!photos.length) return [];
  return photos.map((_, startIndex) =>
    Array.from({ length: frameSize }, (_item, offset) => photos[(startIndex + offset) % photos.length])
  );
}

function renderQuotedBoldText(text) {
  if (!text) return null;
  return text.split(/(".*?")/g).filter(Boolean).map((part, index) => {
    const quoted = part.startsWith("\"") && part.endsWith("\"");
    const content = quoted ? part.slice(1, -1) : part;
    return quoted ? <strong key={`${part}-${index}`}>{content}</strong> : <span key={`${part}-${index}`}>{content}</span>;
  });
}

function GraduateShowcase({ config }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const photos = useMemo(() => {
    const merged = [...(config.heroImages || []), config.heroImage].filter(Boolean);
    return [...new Set(merged)];
  }, [config.heroImage, config.heroImages]);
  const frames = useMemo(() => getRollingPhotoFrames(photos), [photos]);
  const hasManyFrames = frames.length > 1;
  const showcaseCaption = config.showcaseCaption || "";

  useEffect(() => {
    if (!hasManyFrames) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % frames.length);
    }, 2900);
    return () => window.clearInterval(timer);
  }, [frames.length, hasManyFrames]);

  useEffect(() => {
    setActiveIndex(0);
  }, [frames.length]);

  return (
    <section className="graduate-showcase" data-reveal aria-label="Ảnh người tốt nghiệp và sash">
      <div className="graduate-photo-carousel">
        {frames.length ? (
          <>
            <div className="graduate-photo-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
              {frames.map((framePhotos, frameIndex) => (
                <div
                  className={`graduate-photo-slide${frameIndex === activeIndex ? " active" : ""}`}
                  key={`${framePhotos.join("-")}-${frameIndex}`}
                  aria-hidden={frameIndex !== activeIndex}
                >
                  {framePhotos.map((photo, photoIndex) => (
                    <img
                      key={`${photo}-${photoIndex}`}
                      src={resolveAsset(photo)}
                      alt={`${config.graduateName || "Người tốt nghiệp"} ${photoIndex + 1}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            {hasManyFrames && <span className="graduate-photo-progress" key={activeIndex} aria-hidden="true" />}
          </>
        ) : (
          <div className="graduate-photo-empty">
            <GraduationCap size={32} />
          </div>
        )}
      </div>

      <aside className="sash-card">
        {config.sashImage ? (
          <img src={resolveAsset(config.sashImage)} alt="Sash tốt nghiệp" />
        ) : (
          <div className="sash-empty">
            <Medal size={28} />
            <span>Sash</span>
          </div>
        )}
      </aside>
      {showcaseCaption && (
        <p className="graduate-showcase-caption">
          {renderQuotedBoldText(showcaseCaption)}
        </p>
      )}
    </section>
  );
}

function EventCalendar({ config }) {
  const eventDate = getEventDateTime(config);
  if (!eventDate) return null;

  const year = eventDate.getFullYear();
  const month = eventDate.getMonth();
  const eventDay = eventDate.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const leadingEmptyDays = (firstDay + 6) % 7;
  const calendarDays = [
    ...Array.from({ length: leadingEmptyDays }, (_item, index) => ({ key: `empty-${index}`, empty: true })),
    ...Array.from({ length: daysInMonth }, (_item, index) => ({ key: `day-${index + 1}`, day: index + 1 }))
  ];

  return (
    <section className="event-calendar-card" data-reveal aria-label="Lịch ngày tốt nghiệp">
      <Sparkles className="calendar-sparkle calendar-sparkle-1" size={16} aria-hidden="true" />
      <Sparkles className="calendar-sparkle calendar-sparkle-2" size={14} aria-hidden="true" />
      <h2>Congratulations</h2>
      <p>{getMonthTitle(eventDate)}</p>
      <div className="calendar-weekdays" aria-hidden="true">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarDays.map((item) => (
          item.empty ? (
            <span className="calendar-day empty" key={item.key} />
          ) : (
            <span className={`calendar-day${item.day === eventDay ? " event-day" : ""}`} key={item.key}>
              {item.day}
            </span>
          )
        ))}
      </div>
    </section>
  );
}

function MapSection({ config }) {
  const embedUrl = getMapEmbedUrl(config);
  const openUrl = getMapOpenUrl(config);
  if (!embedUrl && !openUrl) return null;

  return (
    <section className="map-section" data-reveal aria-label="Bản đồ địa điểm tổ chức">
      <Sparkles className="map-sparkle map-sparkle-1" size={14} aria-hidden="true" />
      <Sparkles className="map-sparkle map-sparkle-2" size={12} aria-hidden="true" />
      <div className="map-heading">
        <h2>{config.eventTitle || "Lễ tốt nghiệp"}</h2>
        {config.message && <p>{config.message}</p>}
      </div>
      <div className="map-location">
        {config.locationName && <strong>{config.locationName}</strong>}
        {config.locationAddress && <span>{config.locationAddress}</span>}
      </div>
      {embedUrl && (
        <div className="map-frame">
          <iframe
            title="Bản đồ địa điểm tổ chức"
            src={embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      {openUrl && (
        <a className="map-open-button" href={openUrl} target="_blank" rel="noreferrer">
          <MapPin size={18} />
          Mở Google Maps
        </a>
      )}
    </section>
  );
}

function TypewriterTimelineText({ title = "", description = "" }) {
  return (
    <p className="timeline-typewriter">
      {title && <strong>{title}{description ? ": " : ""}</strong>}
      {description && <span>{description}</span>}
    </p>
  );
}

function TimelineSection({ items = [], config }) {
  const fallbackPhotos = useMemo(() => {
    const merged = [
      ...(config.gallery || []),
      ...(config.heroImages || []),
      config.heroImage
    ].filter(Boolean);
    return [...new Set(merged)];
  }, [config.gallery, config.heroImage, config.heroImages]);

  const timelineItems = (items || []).filter((item) => item?.title || item?.description || item?.image || item?.date);
  if (!timelineItems.length) return null;

  return (
    <section className="timeline-section" data-reveal>
      <span className="timeline-doodle timeline-doodle-1" aria-hidden="true">✦</span>
      <span className="timeline-doodle timeline-doodle-2" aria-hidden="true">♡</span>
      <span className="timeline-doodle timeline-doodle-3" aria-hidden="true">✧</span>
      <h2>Dòng thời gian</h2>
      <div className="timeline-list">
        {timelineItems.map((item, index) => {
          const image = item.image || fallbackPhotos[index % Math.max(fallbackPhotos.length, 1)] || "";
          const date = formatTimelineDate(item.date);

          return (
            <article
              className={`timeline-card${image ? "" : " timeline-card--no-photo"}`}
              key={`${item.title || item.description}-${index}`}
              style={{ "--timeline-card-index": index }}
            >
              {image && (
                <div className="timeline-photo">
                  <img src={resolveAsset(image)} alt={item.title || `Dòng thời gian ${index + 1}`} />
                </div>
              )}
              {date && <span className="timeline-date">{date}</span>}
              <div className="timeline-copy">
                <TypewriterTimelineText title={item.title || ""} description={item.description || ""} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MemoryGallery({ images = [] }) {
  const galleryImages = images.slice(0, 8);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);

  const updateActiveSlide = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelector(".memory-gallery-slide");
    if (!slide) return;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || "0");
    const slideStep = slide.getBoundingClientRect().width + gap;
    const nextIndex = Math.round(track.scrollLeft / slideStep);
    setActiveIndex(Math.max(0, Math.min(galleryImages.length - 1, nextIndex)));
  }, [galleryImages.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [galleryImages.length]);

  if (!galleryImages.length) return null;

  return (
    <section className="memory-gallery" data-reveal aria-label="Ảnh kỷ niệm">
      <div className="memory-gallery-track" ref={trackRef} onScroll={updateActiveSlide}>
        {galleryImages.map((image, index) => (
          <figure className="memory-gallery-slide" key={image}>
            <img src={resolveAsset(image)} alt={`Khoảnh khắc ${index + 1}`} />
          </figure>
        ))}
      </div>
      {galleryImages.length > 1 && (
        <div className="memory-gallery-dots" aria-hidden="true">
          {galleryImages.map((image, index) => (
            <span className={index === activeIndex ? "active" : ""} key={`${image}-dot`} />
          ))}
        </div>
      )}
    </section>
  );
}

function Invitation({ config, isOpened }) {
  const countdown = useCountdown(config);
  const { guest, checked, token } = useGuestToken();
  const { wishes, sendWish } = useWishes(isOpened && checked);
  useScrollReveal(checked);

  if (!checked) return null;

  return (
    <>
      <FallingGraduationIcons />
      <main className={`invitation-shell${isOpened ? " card-revealed" : ""}`}>
        <InvitationCardHero config={config} guest={guest} />
        <GraduateShowcase config={config} />
        <EventCalendar config={config} />

        <section className="content-section intro" data-reveal>
          <Sparkles size={22} />
          <p>{config.greeting}</p>
          <strong>{config.message}</strong>
          {config.description && <span>{config.description}</span>}
        </section>

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
        <MapSection config={config} />

        <MemoryGallery images={config.gallery || []} />

        <TimelineSection items={config.memories || []} config={config} />

        <section className="content-section note-section" data-reveal>
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

        <section className="content-section details" data-reveal>
          <p>Dress code: {config.dressCode}</p>
          <p>Trân trọng, {config.hostName}</p>
        </section>

        <section className="closing-note" data-reveal>
          <Sparkles size={18} aria-hidden="true" />
          <p>Hẹn mọi người tại buổi lễ nhé</p>
        </section>

        <div className="action-bar">
          {config.rsvpUrl && (
            <a href={config.rsvpUrl} target="_blank" rel="noreferrer">
              <Check size={18} />
              Xác nhận
            </a>
          )}
        </div>
      </main>

      <WishBubbles wishes={wishes} />
      <WishComposer
        guest={guest}
        token={token}
        recipientName={config.graduateName || config.hostName}
        onSend={sendWish}
      />
    </>
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
      {Array.from({ length: 24 }).map((_, index) => (
        <span
          key={index}
          className={`falling-icon falling-icon-${index + 1} ${index % 2 === 0 ? "cap-icon" : "grade-icon"}`}
        >
          {index % 2 === 0 ? <GraduationCap size={index % 4 === 0 ? 24 : 19} /> : "A+"}
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
  const [recordingIntroVoice, setRecordingIntroVoice] = useState(false);
  const [introVoiceStatus, setIntroVoiceStatus] = useState("");
  const introRecorderRef = useRef(null);
  const introRecordingChunksRef = useRef([]);

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

  useEffect(() => () => {
    const recorder = introRecorderRef.current;
    if (recorder?.stream) {
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

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
      throw new Error(await readApiError(res, "Không upload được ảnh. Kiểm tra admin token hoặc dung lượng ảnh."));
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
      } else if (target === "schoolLogo") {
        updateField("schoolLogo", urls[0] || "");
      } else if (target === "sashImage") {
        updateField("sashImage", urls[0] || "");
      } else if (target === "introGreetingImage") {
        updateField("introGreetingImage", urls[0] || "");
      } else if (target === "gateCapImage") {
        updateField("gateCapImage", urls[0] || "");
      } else if (target === "gateDiplomaImage") {
        updateField("gateDiplomaImage", urls[0] || "");
      } else {
        updateField("gallery", [...(config.gallery || []), ...urls]);
      }
    } catch (uploadError) {
      setError(uploadError.message);
    }
  };

  const uploadAudioFile = async (file) => {
    const formData = new FormData();
    formData.append("audio", file);
    const res = await fetch("/api/upload-audio", {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });
    if (!res.ok) {
      throw new Error(await readApiError(res, "Không upload được âm thanh. Kiểm tra admin token hoặc định dạng file."));
    }
    return res.json();
  };

  const uploadMusic = async (files) => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    setError("");
    try {
      const track = await uploadAudioFile(file);
      setMusicTracks((current) => [track, ...current.filter((item) => item.url !== track.url)]);
      setConfig((current) => ({ ...current, musicUrl: track.url, musicTitle: track.title }));
    } catch (musicError) {
      setError(musicError.message);
    }
  };

  const getRecordingFileExtension = (mimeType) => {
    if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  };

  const startIntroVoiceRecording = async () => {
    setError("");
    setIntroVoiceStatus("");

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Trình duyệt này chưa hỗ trợ ghi âm trực tiếp.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      introRecordingChunksRef.current = [];
      introRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          introRecordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecordingIntroVoice(false);

        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(introRecordingChunksRef.current, { type: mimeType });
        if (!blob.size) {
          setError("Không ghi được âm thanh. Hãy thử lại và cho phép micro.");
          return;
        }

        setIntroVoiceStatus("Đang upload đoạn ghi âm...");
        try {
          const extension = getRecordingFileExtension(mimeType);
          const file = new File([blob], `loi-nhac-mo-thiep.${extension}`, { type: mimeType });
          const track = await uploadAudioFile(file);
          setConfig((current) => ({
            ...current,
            introVoiceUrl: track.url,
            introVoiceTitle: track.title || "Lời nhắc mở thiệp"
          }));
          setIntroVoiceStatus("Đã ghi âm. Nhớ bấm Lưu để áp dụng.");
        } catch (recordError) {
          setError(recordError.message);
          setIntroVoiceStatus("");
        }
      };

      recorder.start();
      setRecordingIntroVoice(true);
      setIntroVoiceStatus("Đang ghi âm...");
    } catch {
      setError("Không thể mở micro. Hãy kiểm tra quyền micro của trình duyệt.");
      setRecordingIntroVoice(false);
    }
  };

  const stopIntroVoiceRecording = () => {
    const recorder = introRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  };

  const clearIntroVoice = () => {
    updateField("introVoiceUrl", "");
    updateField("introVoiceTitle", "");
    setIntroVoiceStatus("");
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

  const longTextFields = ["message", "greeting", "description", "privateMessage", "introGreetingTemplate", "showcaseCaption"];
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

          <section className="admin-panel school-logo-panel">
            <PanelTitle icon={<Medal size={20} />} title="Logo trường" />
            <div className="school-logo-editor">
              {config.schoolLogo ? (
                <div className="school-logo-preview-admin">
                  <img src={resolveAsset(config.schoolLogo)} alt="Logo trường" />
                  <button
                    type="button"
                    className="delete-image-button"
                    onClick={() => updateField("schoolLogo", "")}
                    title="Xóa logo trường"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="school-logo-empty">
                  <GraduationCap size={26} />
                  <span>Chưa có logo trường</span>
                </div>
              )}
              <label className="inline-upload">
                <ImagePlus size={18} />
                {config.schoolLogo ? "Thay logo" : "Thêm logo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImages(e.target.files, "schoolLogo")}
                />
              </label>
            </div>
          </section>

          <section className="admin-panel sash-image-panel">
            <PanelTitle icon={<Medal size={20} />} title="Ảnh sash" />
            <div className="sash-image-editor">
              {config.sashImage ? (
                <div className="sash-image-preview-admin">
                  <img src={resolveAsset(config.sashImage)} alt="Ảnh sash" />
                  <button
                    type="button"
                    className="delete-image-button"
                    onClick={() => updateField("sashImage", "")}
                    title="Xóa ảnh sash"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="sash-image-empty">
                  <Medal size={26} />
                  <span>Chưa có ảnh sash</span>
                </div>
              )}
              <label className="inline-upload">
                <ImagePlus size={18} />
                {config.sashImage ? "Thay sash" : "Thêm sash"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImages(e.target.files, "sashImage")}
                />
              </label>
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

          <section className="admin-panel gate-assets-panel">
            <PanelTitle icon={<GraduationCap size={20} />} title="Ảnh hiệu ứng mở cổng" />
            <div className="gate-assets-editor">
              {[
                ["gateCapImage", "Ảnh mũ tốt nghiệp"],
                ["gateDiplomaImage", "Ảnh bằng tốt nghiệp"]
              ].map(([key, label]) => (
                <div className="gate-asset-item" key={key}>
                  <span>{label}</span>
                  {config[key] ? (
                    <div className="gate-asset-preview">
                      <img src={resolveAsset(config[key])} alt={label} />
                      <button
                        type="button"
                        className="delete-image-button"
                        onClick={() => updateField(key, "")}
                        title={`Xóa ${label.toLowerCase()}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="gate-asset-empty">Chưa có ảnh</div>
                  )}
                  <label className="inline-upload">
                    <ImagePlus size={18} />
                    {config[key] ? "Thay ảnh" : "Thêm ảnh"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadImages(e.target.files, key)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel voice-panel">
            <PanelTitle icon={<Mic size={20} />} title="Ghi âm lời nhắc mở thiệp" />
            <div className="voice-recorder">
              <div className="voice-actions">
                {!recordingIntroVoice ? (
                  <button type="button" className="secondary-button" onClick={startIntroVoiceRecording}>
                    <Mic size={18} />
                    Bắt đầu ghi
                  </button>
                ) : (
                  <button type="button" className="secondary-button recording-button" onClick={stopIntroVoiceRecording}>
                    <Square size={18} />
                    Dừng ghi
                  </button>
                )}
                {config.introVoiceUrl && (
                  <button type="button" className="secondary-button" onClick={clearIntroVoice}>
                    <Trash2 size={18} />
                    Xóa ghi âm
                  </button>
                )}
              </div>
              {introVoiceStatus && <small className="music-note">{introVoiceStatus}</small>}
              {config.introVoiceUrl ? (
                <audio className="music-preview" controls src={resolveAsset(config.introVoiceUrl)}>
                  Trình duyệt không hỗ trợ phát ghi âm.
                </audio>
              ) : (
                <small className="music-note">
                  Đoạn ghi âm này sẽ tự phát một lần khi GIF vừa xuất hiện để nhắc khách mời mở thiệp.
                </small>
              )}
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
            onUploadImage={async (file) => {
              setError("");
              try {
                const uploaded = await uploadOneImage(file);
                return uploaded.url;
              } catch (uploadError) {
                setError(uploadError.message);
                throw uploadError;
              }
            }}
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
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Form tạo mới
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("Bạn");
  const [newPrivateMessage, setNewPrivateMessage] = useState("");
  const [newAvatar, setNewAvatar] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadingNew, setUploadingNew] = useState(false);

  const baseUrl = `${window.location.protocol}//${window.location.host}`;

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guests", { headers: authHeaders() });
      if (!res.ok) throw new Error(await readApiError(res, "Không tải được danh sách khách."));
      setGuests(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuests(); }, []);

  const uploadAvatar = async (file) => {
    if (!file) return "";
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: authHeaders(),
      body: formData
    });
    if (!res.ok) {
      throw new Error(await readApiError(res, "Không upload được ảnh. Kiểm tra admin token hoặc dung lượng ảnh."));
    }
    const data = await res.json();
    return data.url;
  };

  const handleNewAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNew(true);
    setError("");
    try {
      const url = await uploadAvatar(file);
      setNewAvatar(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingNew(false);
      e.target.value = "";
    }
  };

  const createGuest = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: newName.trim(),
          relation: newRelation,
          avatar: newAvatar,
          privateMessage: newPrivateMessage.trim()
        })
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Không tạo được khách mời."));
      }
      const guest = await res.json();
      setGuests((prev) => [guest, ...prev]);
      setNewName("");
      setNewPrivateMessage("");
      setNewAvatar("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteGuest = async (id) => {
    if (!window.confirm("Xóa khách mời này?")) return;
    setError("");
    try {
      const res = await fetch(`/api/guests/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (!res.ok) throw new Error(await readApiError(res, "Không xóa được khách."));
      setGuests((prev) => prev.filter((g) => g.id !== id));
      if (editingId === id) setEditingId(null);
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
        Tạo link cá nhân cho từng khách. Khách mở link sẽ thấy ảnh đại diện, tên và lời nhắn riêng.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {/* Form tạo khách mới */}
      <form className="guest-form" onSubmit={createGuest}>
        <div className="guest-form-row">
          <label className="guest-form-field">
            <span>Tên khách mời</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              required
            />
          </label>
          <label className="guest-form-field">
            <span>Quan hệ / Xưng hô</span>
            <select value={newRelation} onChange={(e) => setNewRelation(e.target.value)}>
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="guest-form-field wide">
          <span>Lời nhắn riêng (tuỳ chọn)</span>
          <textarea
            value={newPrivateMessage}
            onChange={(e) => setNewPrivateMessage(e.target.value)}
            placeholder="Lời nhắn đặc biệt chỉ khách này thấy..."
            rows={2}
          />
        </label>
        <div className="guest-avatar-upload-row">
          <div className="guest-avatar-preview-wrap">
            {newAvatar ? (
              <div className="guest-avatar-preview">
                <img src={resolveAsset(newAvatar)} alt="Ảnh xem trước" />
                <button type="button" className="remove-avatar-btn" onClick={() => setNewAvatar("")} title="Xóa ảnh">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="guest-avatar-empty">
                <Camera size={22} />
              </div>
            )}
          </div>
          <label className="inline-upload">
            <ImagePlus size={16} />
            {uploadingNew ? "Đang upload..." : newAvatar ? "Thay ảnh" : "Ảnh đại diện"}
            <input
              type="file"
              accept="image/*"
              onChange={handleNewAvatarChange}
              disabled={uploadingNew}
            />
          </label>
        </div>
        <button type="submit" disabled={creating || !newName.trim() || uploadingNew} className="guest-create-btn">
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
        {guests.map((guest) => (
          <GuestItem
            key={guest.id}
            guest={guest}
            baseUrl={baseUrl}
            copiedId={copiedId}
            editingId={editingId}
            onEdit={() => setEditingId(editingId === guest.id ? null : guest.id)}
            onSave={(updated) => {
              setGuests((prev) => prev.map((g) => g.id === updated.id ? updated : g));
              setEditingId(null);
            }}
            onDelete={() => deleteGuest(guest.id)}
            onCopy={() => copyLink(guest.token)}
            authHeaders={authHeaders}
            uploadAvatar={uploadAvatar}
            onError={setError}
          />
        ))}
      </div>
    </section>
  );
}

// ── Guest Item (có inline edit) ────────────────────────────────────────────────

function GuestItem({ guest, baseUrl, copiedId, editingId, onEdit, onSave, onDelete, onCopy, authHeaders, uploadAvatar, onError }) {
  const isEditing = editingId === guest.id;
  const [editName, setEditName] = useState(guest.name);
  const [editRelation, setEditRelation] = useState(guest.relation);
  const [editPrivateMessage, setEditPrivateMessage] = useState(guest.privateMessage || "");
  const [editAvatar, setEditAvatar] = useState(guest.avatar || "");
  const [saving, setSaving] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditName(guest.name);
      setEditRelation(guest.relation);
      setEditPrivateMessage(guest.privateMessage || "");
      setEditAvatar(guest.avatar || "");
    }
  }, [isEditing, guest]);

  const handleEditAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEdit(true);
    try {
      const url = await uploadAvatar(file);
      setEditAvatar(url);
    } catch (err) {
      onError(err.message);
    } finally {
      setUploadingEdit(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guests/${guest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: editName.trim(),
          relation: editRelation,
          avatar: editAvatar,
          privateMessage: editPrivateMessage.trim()
        })
      });
      if (!res.ok) throw new Error(await readApiError(res, "Không lưu được thông tin khách."));
      const updated = await res.json();
      onSave(updated);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const link = `${baseUrl}/?token=${guest.token}`;

  return (
    <div className={`guest-item${isEditing ? " guest-item--editing" : ""}`}>
      <div className="guest-item-main">
        {/* Avatar */}
        <div className="guest-avatar-thumb">
          {guest.avatar ? (
            <img src={resolveAsset(guest.avatar)} alt={guest.name} />
          ) : (
            <div className="guest-avatar-placeholder">
              {guest.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="guest-info">
          <div className="guest-name-row">
            <span className="guest-badge">{guest.relation}</span>
            <strong>{guest.name}</strong>
            {guest.privateMessage && (
              <span className="guest-has-msg" title="Có lời nhắn riêng">💬</span>
            )}
          </div>
          <a className="guest-link" href={link} target="_blank" rel="noreferrer" title="Mở link mời">
            {link}
          </a>
          {guest.privateMessage && (
            <p className="guest-private-msg-preview">"{guest.privateMessage}"</p>
          )}
        </div>

        <div className="guest-actions">
          <button
            type="button"
            className={`copy-btn ${copiedId === guest.token ? "copied" : ""}`}
            onClick={onCopy}
            title="Sao chép link"
          >
            {copiedId === guest.token ? <Check size={16} /> : <Copy size={16} />}
            {copiedId === guest.token ? "Đã sao chép" : "Sao chép"}
          </button>
          <button
            type="button"
            className={`edit-guest-btn${isEditing ? " active" : ""}`}
            onClick={onEdit}
            title="Sửa thông tin"
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            className="delete-guest-btn"
            onClick={onDelete}
            title="Xóa khách"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Inline Edit Form */}
      {isEditing && (
        <div className="guest-edit-form">
          <div className="guest-edit-avatar-row">
            <div className="guest-avatar-preview-wrap">
              {editAvatar ? (
                <div className="guest-avatar-preview">
                  <img src={resolveAsset(editAvatar)} alt="Ảnh xem trước" />
                  <button type="button" className="remove-avatar-btn" onClick={() => setEditAvatar("")} title="Xóa ảnh">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="guest-avatar-empty">
                  <Camera size={22} />
                </div>
              )}
            </div>
            <label className="inline-upload">
              <ImagePlus size={16} />
              {uploadingEdit ? "Đang upload..." : editAvatar ? "Thay ảnh" : "Ảnh đại diện"}
              <input type="file" accept="image/*" onChange={handleEditAvatarChange} disabled={uploadingEdit} />
            </label>
          </div>
          <div className="guest-edit-fields">
            <label className="guest-form-field">
              <span>Tên</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Tên khách mời"
              />
            </label>
            <label className="guest-form-field">
              <span>Quan hệ</span>
              <select value={editRelation} onChange={(e) => setEditRelation(e.target.value)}>
                {RELATION_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="guest-form-field wide">
            <span>Lời nhắn riêng</span>
            <textarea
              value={editPrivateMessage}
              onChange={(e) => setEditPrivateMessage(e.target.value)}
              placeholder="Lời nhắn đặc biệt chỉ khách này thấy..."
              rows={2}
            />
          </label>
          <div className="guest-edit-actions">
            <button
              type="button"
              className="guest-save-btn"
              onClick={handleSave}
              disabled={saving || !editName.trim() || uploadingEdit}
            >
              <Save size={16} />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button type="button" className="guest-cancel-btn" onClick={onEdit}>
              <X size={16} />
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
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

function MemoryEditor({ items, onChange, onUploadImage }) {
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const updateItem = (index, key, value) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  };

  const uploadItemImage = async (index, files) => {
    const file = files?.[0];
    if (!file || !onUploadImage) return;
    setUploadingIndex(index);
    try {
      const imageUrl = await onUploadImage(file);
      if (imageUrl) updateItem(index, "image", imageUrl);
    } catch {
      // Error message is surfaced by the admin upload handler.
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <section className="admin-panel list-editor">
      <PanelTitle icon={<CalendarDays size={20} />} title="Dòng thời gian" />
      {items.map((item, index) => (
        <div className="timeline-editor" key={index}>
          <div className="timeline-editor-fields">
            <label>
              <span>Ngày</span>
              <input
                type="date"
                value={item.date || ""}
                onChange={(e) => updateItem(index, "date", e.target.value)}
              />
            </label>
            <label>
              <span>Tiêu đề</span>
              <input
                value={item.title || ""}
                onChange={(e) => updateItem(index, "title", e.target.value)}
                placeholder="Ngày đầu tiên lạc lối..."
              />
            </label>
          </div>
          <div className="timeline-editor-image">
            {item.image ? (
              <div className="timeline-editor-preview">
                <img src={resolveAsset(item.image)} alt={`Ảnh dòng thời gian ${index + 1}`} />
                <button type="button" onClick={() => updateItem(index, "image", "")} title="Xóa ảnh">
                  <Trash2 size={15} />
                </button>
              </div>
            ) : (
              <div className="timeline-editor-empty">Chưa có ảnh</div>
            )}
            <label className="inline-upload">
              <ImagePlus size={16} />
              {uploadingIndex === index ? "Đang tải..." : item.image ? "Thay ảnh" : "Thêm ảnh"}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingIndex === index}
                onChange={(e) => {
                  uploadItemImage(index, e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <textarea
            value={item.description || ""}
            onChange={(e) => updateItem(index, "description", e.target.value)}
            placeholder="Viết lại câu chuyện, cảm xúc hoặc dấu mốc đáng nhớ..."
            rows={4}
          />
          <button type="button" className="timeline-editor-delete" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} title="Xóa">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      <button className="secondary-button" onClick={() => onChange([...items, { date: "", image: "", title: "", description: "" }])}>
        <Plus size={18} />
        Thêm mốc thời gian
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
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef(null);

  const playMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !config.musicUrl || !musicEnabled) return;
    audio.volume = typeof config.musicVolume === "number" ? config.musicVolume : 0.6;
    audio.muted = false;
    audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
  }, [config.musicUrl, config.musicVolume, musicEnabled]);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !config.musicUrl) return;

    if (musicEnabled) {
      setMusicEnabled(false);
      audio.pause();
      audio.muted = true;
      setMusicPlaying(false);
      return;
    }

    setMusicEnabled(true);
    audio.volume = typeof config.musicVolume === "number" ? config.musicVolume : 0.6;
    audio.muted = false;
    audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
  }, [config.musicUrl, config.musicVolume, musicEnabled]);

  const handleInvitationOpen = useCallback(() => {
    setIsOpened(true);
    playMusic();
  }, [playMusic]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
    setMusicEnabled(true);
    setMusicPlaying(false);
  }, [config.musicUrl]);

  useEffect(() => {
    if (!config.musicUrl || isAdmin || !musicEnabled) return undefined;

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
  }, [config.musicUrl, isAdmin, musicEnabled, playMusic]);

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
          onPlay={() => setMusicPlaying(true)}
          onPause={() => setMusicPlaying(false)}
        />
      )}
      {config.musicUrl && !isAdmin && isOpened && (
        <button
          type="button"
          className={`music-float-button${musicEnabled && musicPlaying ? " playing" : ""}`}
          onClick={toggleMusic}
          aria-label={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
          title={musicEnabled ? "Tắt nhạc" : "Bật nhạc"}
        >
          <Music size={19} />
          {!musicEnabled && <span aria-hidden="true" />}
        </button>
      )}
      {page}
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
