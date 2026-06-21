import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const port = process.env.PORT || 4000;
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, "../data");
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, "../uploads");
const musicDir = path.join(uploadDir, "music");
const configPath = path.join(dataDir, "config.json");
const guestsPath = path.join(dataDir, "guests.json");
const clientDist = path.join(rootDir, "client/dist");
const adminToken = process.env.ADMIN_TOKEN || "";

const defaultConfig = {
  heroImage: "",
  heroImages: [],
  gallery: [],
  graduateName: "Nguyễn Văn A",
  degree: "Tân cử nhân Công nghệ thông tin",
  school: "Trường Đại học",
  eventTitle: "Lễ tốt nghiệp",
  eventDate: "2026-07-20",
  eventTime: "08:30",
  eventEndTime: "11:00",
  locationName: "Hội trường A",
  locationAddress: "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
  mapUrl: "",
  hostName: "Gia đình Nguyễn",
  musicUrl: "",
  musicTitle: "",
  musicVolume: 0.6,
  openPromptAudioUrl: "",
  openPromptAudioTitle: "",
  introGreetingImage: "",
  hostPortraitImage: "",
  introGreetingTemplate:
    "Chào {quan hệ} {người được mời}, mình gửi bạn một chiếc thiệp nhỏ cho ngày tốt nghiệp thật đặc biệt này.",
  greeting: "Trân trọng kính mời bạn đến chung vui trong ngày lễ tốt nghiệp.",
  message:
    "Sự hiện diện của bạn là niềm vui và niềm vinh hạnh lớn với mình và gia đình.",
  privateMessage:
    "Cảm ơn bạn đã là một phần đặc biệt trong hành trình thanh xuân này.",
  description:
    "Đây là cột mốc đánh dấu hành trình học tập và những kỷ niệm đáng nhớ.",
  dressCode: "Lich su, trang nhã",
  phone: "0900000000",
  rsvpUrl: "",
  notes: [
    "Vui lòng có mặt trước giờ bắt đầu 15 phút.",
    "Trang phục lịch sự, ưu tiên tông màu sáng.",
    "Có thể xác nhận tham dự qua nút bên dưới."
  ],
  memories: [
    {
      title: "Danh hiệu",
      description: "Hoàn thành chương trình học với nhiều nỗ lực đáng nhớ."
    },
    {
      title: "Hoạt động",
      description: "Tham gia câu lạc bộ, workshop và các dự án trong thời gian học."
    },
    {
      title: "Ngoại khóa",
      description: "Những chuyến đi, sự kiện và khoảnh khắc cùng bạn bè."
    }
  ]
};

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(musicDir, { recursive: true });
  try {
    await fs.access(configPath);
  } catch {
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }
  try {
    await fs.access(guestsPath);
  } catch {
    await fs.writeFile(guestsPath, JSON.stringify([], null, 2));
  }
}

async function readConfig() {
  await ensureStorage();
  const raw = await fs.readFile(configPath, "utf8");
  return { ...defaultConfig, ...JSON.parse(raw) };
}

async function writeConfig(config) {
  await ensureStorage();
  const cleanConfig = { ...defaultConfig, ...config };
  await fs.writeFile(configPath, JSON.stringify(cleanConfig, null, 2));
  return cleanConfig;
}

async function readGuests() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(guestsPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeGuests(guests) {
  await ensureStorage();
  await fs.writeFile(guestsPath, JSON.stringify(guests, null, 2));
  return guests;
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  }
});

const audioStorage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(musicDir, { recursive: true });
      cb(null, musicDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "music";
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const allowedAudioExts = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"]);

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!file.mimetype.startsWith("audio/") && !allowedAudioExts.has(ext)) {
      cb(new Error("Only audio files are allowed"));
      return;
    }
    cb(null, true);
  }
});

function musicTitleFromFilename(filename) {
  return path
    .basename(filename, path.extname(filename))
    .replace(/^\d+-/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadDir, { maxAge: "7d" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/config", async (_req, res, next) => {
  try {
    res.json(await readConfig());
  } catch (error) {
    next(error);
  }
});

function requireAdmin(req, res, next) {
  if (!adminToken) {
    next();
    return;
  }
  if (req.header("x-admin-token") === adminToken) {
    next();
    return;
  }
  res.status(401).json({ message: "Invalid admin token" });
}

app.put("/api/config", requireAdmin, async (req, res, next) => {
  try {
    res.json(await writeConfig(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

app.get("/api/music", requireAdmin, async (_req, res, next) => {
  try {
    await ensureStorage();
    const files = await fs.readdir(musicDir);
    res.json(
      files
        .filter((filename) => allowedAudioExts.has(path.extname(filename).toLowerCase()))
        .sort((a, b) => b.localeCompare(a))
        .map((filename) => ({
          filename,
          title: musicTitleFromFilename(filename),
          url: `/uploads/music/${filename}`
        }))
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/upload-audio", requireAdmin, uploadAudio.single("audio"), (req, res) => {
  res.status(201).json({
    url: `/uploads/music/${req.file.filename}`,
    filename: req.file.filename,
    title: musicTitleFromFilename(req.file.filename)
  });
});

// ── Guest management ──────────────────────────────────────────────────────────

// Public: tra cứu thông tin khách theo token (không cần admin)
app.get("/api/guest/:token", async (req, res, next) => {
  try {
    const guests = await readGuests();
    const guest = guests.find((g) => g.token === req.params.token);
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }
    // Chỉ trả về thông tin cần thiết cho trang mời
    res.json({
      name: guest.name,
      relation: guest.relation,
      photoUrl: guest.photoUrl || "",
      privateMessage: guest.privateMessage || ""
    });
  } catch (error) {
    next(error);
  }
});

// Admin: lấy danh sách khách
app.get("/api/guests", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readGuests());
  } catch (error) {
    next(error);
  }
});

// Admin: tạo khách mới
app.post("/api/guests", requireAdmin, async (req, res, next) => {
  try {
    const { name, relation, photoUrl, privateMessage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên khách mời là bắt buộc" });
    }
    const guests = await readGuests();
    const token = randomBytes(12).toString("hex");
    const guest = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      name: name.trim(),
      relation: (relation || "Bạn").trim(),
      photoUrl: (photoUrl || "").trim(),
      privateMessage: (privateMessage || "").trim(),
      token,
      createdAt: new Date().toISOString()
    };
    guests.push(guest);
    await writeGuests(guests);
    res.status(201).json(guest);
  } catch (error) {
    next(error);
  }
});

// Admin: xóa khách
app.delete("/api/guests/:id", requireAdmin, async (req, res, next) => {
  try {
    const guests = await readGuests();
    const filtered = guests.filter((g) => g.id !== req.params.id);
    if (filtered.length === guests.length) {
      return res.status(404).json({ message: "Guest not found" });
    }
    await writeGuests(filtered);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Admin: cập nhật khách mời
app.put("/api/guests/:id", requireAdmin, async (req, res, next) => {
  try {
    const { name, relation, photoUrl, privateMessage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên khách mời là bắt buộc" });
    }
    const guests = await readGuests();
    const index = guests.findIndex((g) => g.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: "Không tìm thấy khách mời" });
    }
    guests[index] = {
      ...guests[index],
      name: name.trim(),
      relation: (relation || "Bạn").trim(),
      photoUrl: (photoUrl !== undefined ? photoUrl : guests[index].photoUrl || "").trim(),
      privateMessage: (privateMessage !== undefined ? privateMessage : guests[index].privateMessage || "").trim(),
      updatedAt: new Date().toISOString()
    };
    await writeGuests(guests);
    res.json(guests[index]);
  } catch (error) {
    next(error);
  }
});

// ── Static ────────────────────────────────────────────────────────────────────

app.use(express.static(clientDist));

app.get("*", (_req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || "Server error" });
});

await ensureStorage();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
