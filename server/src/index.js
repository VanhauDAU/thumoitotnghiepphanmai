import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const port = process.env.PORT || 4000;
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, "../data");
const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, "../uploads");
const configPath = path.join(dataDir, "config.json");
const guestsPath = path.join(dataDir, "guests.json");
const clientDist = path.join(rootDir, "client/dist");
const adminToken = process.env.ADMIN_TOKEN || "";

const defaultConfig = {
  heroImage: "",
  heroImages: [],
  heroImageCrops: {},
  gallery: [],
  graduateName: "Nguyen Van A",
  degree: "Tan cu nhan Cong nghe thong tin",
  school: "Truong Dai hoc",
  eventTitle: "Le tot nghiep",
  eventDate: "2026-07-20",
  eventTime: "08:30",
  locationName: "Hoi truong A",
  locationAddress: "123 Duong Le Loi, Quan 1, TP. Ho Chi Minh",
  mapUrl: "",
  hostName: "Gia dinh Nguyen",
  showIntroSection: true,
  greeting: "Tran trong kinh moi ban den chung vui trong ngay le tot nghiep.",
  message:
    "Su hien dien cua ban la niem vui va niem vinh hanh lon voi minh va gia dinh.",
  privateMessage:
    "Cam on ban da la mot phan dac biet trong hanh trinh thanh xuan nay.",
  description:
    "Day la cot moc danh dau hanh trinh hoc tap va nhung ky niem dang nho.",
  thankYouMessage: "Cam on ban da dong hanh cung minh.",
  phone: "0900000000",
  rsvpUrl: "",
  backgroundMusic: "",
  notes: [
    "Vui long co mat truoc gio bat dau 15 phut.",
    "Trang phuc lich su, uu tien tong mau sang.",
    "Co the xac nhan tham du qua nut ben duoi."
  ],
  memories: [
    {
      title: "Danh hieu",
      description: "Hoan thanh chuong trinh hoc voi nhieu no luc dang nho."
    },
    {
      title: "Hoat dong",
      description: "Tham gia cau lac bo, workshop va cac du an trong thoi gian hoc."
    },
    {
      title: "Ngoai khoa",
      description: "Nhung chuyen di, su kien va khoanh khac cung ban be."
    }
  ]
};

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });
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

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadDir, { maxAge: "7d" }));

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

const audioUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"];
    if (!allowed.includes(file.mimetype) && !file.originalname.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      cb(new Error("Chỉ chấp nhận file âm thanh (mp3, wav, ogg, m4a, aac)"));
      return;
    }
    cb(null, true);
  }
});

app.post("/api/upload-audio", requireAdmin, audioUpload.single("audio"), (req, res) => {
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// ── Guest API ────────────────────────────────────────────────────────────────

// GET /api/guests — list all guests (admin)
app.get("/api/guests", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readGuests());
  } catch (error) {
    next(error);
  }
});

// POST /api/guests — create a new guest
app.post("/api/guests", requireAdmin, async (req, res, next) => {
  try {
    const { name, relation, privateMessage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên khách mời không được để trống" });
    }
    const guests = await readGuests();
    const guest = {
      id: randomUUID(),
      token: randomUUID(),
      name: name.trim(),
      relation: relation || "Bạn",
      privateMessage: privateMessage || "",
      createdAt: new Date().toISOString()
    };
    guests.unshift(guest);
    await writeGuests(guests);
    res.status(201).json(guest);
  } catch (error) {
    next(error);
  }
});

// PUT /api/guests/:id — update a guest
app.put("/api/guests/:id", requireAdmin, async (req, res, next) => {
  try {
    const guests = await readGuests();
    const index = guests.findIndex((g) => g.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: "Không tìm thấy khách" });
    const { name, relation, privateMessage } = req.body;
    guests[index] = {
      ...guests[index],
      name: name !== undefined ? name.trim() : guests[index].name,
      relation: relation !== undefined ? relation : guests[index].relation,
      privateMessage: privateMessage !== undefined ? privateMessage : guests[index].privateMessage
    };
    await writeGuests(guests);
    res.json(guests[index]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/guests/:id — delete a guest
app.delete("/api/guests/:id", requireAdmin, async (req, res, next) => {
  try {
    const guests = await readGuests();
    const filtered = guests.filter((g) => g.id !== req.params.id);
    if (filtered.length === guests.length) {
      return res.status(404).json({ message: "Không tìm thấy khách" });
    }
    await writeGuests(filtered);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/guest/:token — public: get guest by invite token
app.get("/api/guest/:token", async (req, res, next) => {
  try {
    const guests = await readGuests();
    const guest = guests.find((g) => g.token === req.params.token);
    if (!guest) return res.status(404).json({ message: "Không tìm thấy" });
    // Chỉ trả về thông tin cần thiết cho trang mời (không expose id nội bộ)
    res.json({
      name: guest.name,
      relation: guest.relation,
      privateMessage: guest.privateMessage || ""
    });
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
