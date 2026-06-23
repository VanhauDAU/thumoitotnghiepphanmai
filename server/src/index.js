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
const accessLogsPath = path.join(dataDir, "access-logs.json");
const wishesPath = path.join(dataDir, "wishes.json");
const clientDist = path.join(rootDir, "client/dist");
const adminToken = process.env.ADMIN_TOKEN || "";
const maxAccessLogs = 500;

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
  guestbookEnabled: true,
  guestbookTitle: "So luu but ngay tot nghiep",
  guestbookPrompt: "Gui mot loi chuc nho de minh giu lai ky niem nay nhe.",
  backgroundMusic: "",
  musicVolume: 55,
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
  try {
    await fs.access(accessLogsPath);
  } catch {
    await fs.writeFile(accessLogsPath, JSON.stringify([], null, 2));
  }
  try {
    await fs.access(wishesPath);
  } catch {
    await fs.writeFile(wishesPath, JSON.stringify([], null, 2));
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

async function readAccessLogs() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(accessLogsPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function readWishes() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(wishesPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAccessLogs(logs) {
  await ensureStorage();
  const trimmedLogs = logs.slice(0, maxAccessLogs);
  await fs.writeFile(accessLogsPath, JSON.stringify(trimmedLogs, null, 2));
  return trimmedLogs;
}

async function writeWishes(wishes) {
  await ensureStorage();
  await fs.writeFile(wishesPath, JSON.stringify(wishes, null, 2));
  return wishes;
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

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

function detectDevice(userAgent = "") {
  const lowerAgent = userAgent.toLowerCase();
  const browser =
    lowerAgent.includes("edg/") ? "Edge" :
    lowerAgent.includes("chrome/") ? "Chrome" :
    lowerAgent.includes("safari/") ? "Safari" :
    lowerAgent.includes("firefox/") ? "Firefox" :
    lowerAgent.includes("opr/") || lowerAgent.includes("opera") ? "Opera" :
    "Không rõ";
  const platform =
    lowerAgent.includes("iphone") ? "iPhone" :
    lowerAgent.includes("ipad") ? "iPad" :
    lowerAgent.includes("android") ? "Android" :
    lowerAgent.includes("mac os") ? "macOS" :
    lowerAgent.includes("windows") ? "Windows" :
    lowerAgent.includes("linux") ? "Linux" :
    "Không rõ";
  const type =
    lowerAgent.includes("mobile") || lowerAgent.includes("iphone") || lowerAgent.includes("android")
      ? "Điện thoại"
      : lowerAgent.includes("ipad") || lowerAgent.includes("tablet")
        ? "Máy tính bảng"
        : "Máy tính";

  return { browser, platform, type };
}

async function appendAccessLog(type, req, details = {}) {
  try {
    const userAgent = req.header("user-agent") || "";
    const logs = await readAccessLogs();
    const log = {
      id: randomUUID(),
      type,
      actor: type === "admin" ? "Admin" : details.guestName || "Khách không xác định",
      guestName: details.guestName || "",
      guestRelation: details.guestRelation || "",
      guestToken: details.guestToken || "",
      path: req.originalUrl || req.url || "",
      ip: getClientIp(req),
      userAgent,
      device: detectDevice(userAgent),
      createdAt: new Date().toISOString()
    };
    await writeAccessLogs([log, ...logs]);
  } catch (error) {
    console.error("Cannot write access log", error);
  }
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

// ── Access log API ───────────────────────────────────────────────────────────

app.post("/api/admin-visit", requireAdmin, async (req, res, next) => {
  try {
    await appendAccessLog("admin", req);
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/access-logs", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readAccessLogs());
  } catch (error) {
    next(error);
  }
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
    const { name, relation, privateMessage, photo, photoCrop } = req.body;
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
      photo: photo || "",
      photoCrop: photoCrop || { x: 50, y: 50 },
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
    const { name, relation, privateMessage, photo, photoCrop } = req.body;
    guests[index] = {
      ...guests[index],
      name: name !== undefined ? name.trim() : guests[index].name,
      relation: relation !== undefined ? relation : guests[index].relation,
      privateMessage: privateMessage !== undefined ? privateMessage : guests[index].privateMessage,
      photo: photo !== undefined ? photo : (guests[index].photo || ""),
      photoCrop: photoCrop !== undefined ? photoCrop : (guests[index].photoCrop || { x: 50, y: 50 })
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
    await appendAccessLog("guest", req, {
      guestName: guest.name,
      guestRelation: guest.relation,
      guestToken: guest.token
    });
    // Chỉ trả về thông tin cần thiết cho trang mời (không expose id nội bộ)
    res.json({
      name: guest.name,
      relation: guest.relation,
      privateMessage: guest.privateMessage || "",
      photo: guest.photo || "",
      photoCrop: guest.photoCrop || { x: 50, y: 50 }
    });
  } catch (error) {
    next(error);
  }
});

// ── Guestbook API ────────────────────────────────────────────────────────────

app.get("/api/wishes", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 8, 30);
    const wishes = await readWishes();
    res.json(wishes.slice(0, limit).map(({ id, name, relation, message, createdAt }) => ({
      id,
      name,
      relation,
      message,
      createdAt
    })));
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/wishes", requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readWishes());
  } catch (error) {
    next(error);
  }
});

app.post("/api/wishes", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim().slice(0, 80);
    const relation = String(req.body.relation || "").trim().slice(0, 40);
    const message = String(req.body.message || "").trim().slice(0, 500);
    const token = String(req.body.token || "").trim();

    if (!message) {
      return res.status(400).json({ message: "Lời chúc không được để trống" });
    }

    let guest = null;
    if (token) {
      const guests = await readGuests();
      guest = guests.find((item) => item.token === token) || null;
    }

    const wish = {
      id: randomUUID(),
      name: guest?.name || name || "Một vị khách thân mến",
      relation: guest?.relation || relation || "",
      message,
      guestToken: guest ? token : "",
      createdAt: new Date().toISOString()
    };
    const wishes = await readWishes();
    wishes.unshift(wish);
    await writeWishes(wishes.slice(0, 500));
    res.status(201).json({
      id: wish.id,
      name: wish.name,
      relation: wish.relation,
      message: wish.message,
      createdAt: wish.createdAt
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/wishes/:id", requireAdmin, async (req, res, next) => {
  try {
    const wishes = await readWishes();
    const filtered = wishes.filter((wish) => wish.id !== req.params.id);
    if (filtered.length === wishes.length) {
      return res.status(404).json({ message: "Không tìm thấy lời chúc" });
    }
    await writeWishes(filtered);
    res.json({ ok: true });
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
