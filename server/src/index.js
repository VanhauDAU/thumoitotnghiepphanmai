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
const wishesPath = path.join(dataDir, "wishes.json");
const clientDist = path.join(rootDir, "client/dist");
const adminToken = process.env.ADMIN_TOKEN || "";

const defaultConfig = {
  heroImage: "",
  heroImages: [],
  gallery: [],
  schoolLogo: "",
  sashImage: "",
  showcaseCaption: "",
  graduateName: "Nguyen Van A",
  degree: "Tan cu nhan Cong nghe thong tin",
  school: "Truong Dai hoc",
  schoolSubtitle: "Graduation Ceremony",
  eventTitle: "Le tot nghiep",
  eventDate: "2026-07-20",
  eventTime: "08:30",
  eventEndTime: "11:00",
  locationName: "Hoi truong A",
  locationAddress: "123 Duong Le Loi, Quan 1, TP. Ho Chi Minh",
  mapUrl: "",
  hostName: "Gia dinh Nguyen",
  musicUrl: "",
  musicTitle: "",
  introGreetingImage: "",
  introVoiceUrl: "",
  introVoiceTitle: "",
  introGreetingTemplate:
    "Chao {quan he} {nguoi duoc moi}, minh gui ban mot chiec thiep nho cho ngay tot nghiep that dac biet nay.",
  greeting: "Tran trong kinh moi ban den chung vui trong ngay le tot nghiep.",
  message:
    "Su hien dien cua ban la niem vui va niem vinh hanh lon voi minh va gia dinh.",
  privateMessage:
    "Cam on ban da la mot phan dac biet trong hanh trinh thanh xuan nay.",
  description:
    "Day la cot moc danh dau hanh trinh hoc tap va nhung ky niem dang nho.",
  dressCode: "Lich su, trang nhã",
  phone: "0900000000",
  rsvpUrl: "",
  notes: [
    "Vui long co mat truoc gio bat dau 15 phut.",
    "Trang phuc lich su, uu tien tong mau sang.",
    "Co the xac nhan tham du qua nut ben duoi."
  ],
  memories: [
    {
      date: "2019-10-06",
      image: "",
      title: "Ngay dau tien lac loi",
      description:
        "Buoc chan vao canh cong dai hoc, cam thay vua hoi hop vua choang ngop. Ca nhom ban bay gio da gap nhau trong buoi hoc dinh huong dau tien, ai nay deu ngo ngac va lac duong tim phong hoc."
    },
    {
      date: "2022-05-18",
      image: "",
      title: "Nhung ngay that cham chi",
      description: "Tung bai hoc, tung du an va tung lan co gang da tao nen hanh trinh dang nho."
    },
    {
      date: "2026-07-20",
      image: "",
      title: "Khoanh khac tot nghiep",
      description: "Mot dau moc khep lai thanh xuan ruc ro va mo ra chang duong moi."
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
  try {
    await fs.access(wishesPath);
  } catch {
    await fs.writeFile(wishesPath, JSON.stringify([], null, 2));
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

async function readWishes() {
  await ensureStorage();
  try {
    const raw = await fs.readFile(wishesPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeWishes(wishes) {
  await ensureStorage();
  await fs.writeFile(wishesPath, JSON.stringify(wishes, null, 2));
  return wishes;
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Chỉ hỗ trợ file ảnh."));
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
      cb(new Error("Chỉ hỗ trợ file âm thanh."));
      return;
    }
    cb(null, true);
  }
});

function uploadSingleImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ message: "Ảnh quá lớn. Vui lòng chọn ảnh tối đa 20MB." });
        return;
      }
      res.status(400).json({ message: error.message || "Không upload được ảnh." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "Chưa chọn ảnh để upload." });
      return;
    }
    next();
  });
}

function uploadSingleAudio(req, res, next) {
  uploadAudio.single("audio")(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ message: "File nhạc quá lớn. Vui lòng chọn file tối đa 25MB." });
        return;
      }
      res.status(400).json({ message: error.message || "Không upload được nhạc." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "Chưa chọn file nhạc để upload." });
      return;
    }
    next();
  });
}

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

app.post("/api/upload", requireAdmin, uploadSingleImage, (req, res) => {
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

app.post("/api/upload-audio", requireAdmin, uploadSingleAudio, (req, res) => {
  res.status(201).json({
    url: `/uploads/music/${req.file.filename}`,
    filename: req.file.filename,
    title: musicTitleFromFilename(req.file.filename)
  });
});

// ── Wishes ───────────────────────────────────────────────────────────────────

app.get("/api/wishes", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 40);
    const wishes = await readWishes();
    res.json(
      wishes
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit)
        .map(({ id, name, relation, message, createdAt }) => ({
          id,
          name,
          relation,
          message,
          createdAt
        }))
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/wishes", async (req, res, next) => {
  try {
    const token = String(req.body.token || "");
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({ message: "Vui lòng nhập lời chúc." });
    }
    if (message.length > 180) {
      return res.status(400).json({ message: "Lời chúc tối đa 180 ký tự." });
    }

    const guests = await readGuests();
    const guest = guests.find((item) => item.token === token);
    if (!guest) {
      return res.status(401).json({ message: "Link khách mời không hợp lệ." });
    }

    const wishes = await readWishes();
    const wish = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      guestId: guest.id,
      name: guest.name,
      relation: guest.relation,
      message,
      createdAt: new Date().toISOString()
    };

    wishes.push(wish);
    await writeWishes(wishes.slice(-200));
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

// ── Guest management ──────────────────────────────────────────────────────────

// Public: tra cứu thông tin khách theo token (không cần admin)
app.get("/api/guest/:token", async (req, res, next) => {
  try {
    const guests = await readGuests();
    const guest = guests.find((g) => g.token === req.params.token);
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }
    // Trả về thông tin cần thiết cho trang mời (bao gồm avatar và lời nhắn riêng)
    res.json({
      name: guest.name,
      relation: guest.relation,
      avatar: guest.avatar || "",
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
    const { name, relation, avatar, privateMessage } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Tên khách mời là bắt buộc" });
    }
    const guests = await readGuests();
    const token = randomBytes(12).toString("hex");
    const guest = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      name: name.trim(),
      relation: (relation || "Bạn").trim(),
      avatar: avatar || "",
      privateMessage: privateMessage || "",
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

// Admin: sửa thông tin khách
app.put("/api/guests/:id", requireAdmin, async (req, res, next) => {
  try {
    const { name, relation, avatar, privateMessage } = req.body;
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: "Tên khách mời không được để trống" });
    }
    const guests = await readGuests();
    const index = guests.findIndex((g) => g.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: "Guest not found" });
    }
    const updated = {
      ...guests[index],
      ...(name !== undefined && { name: name.trim() }),
      ...(relation !== undefined && { relation: relation.trim() }),
      ...(avatar !== undefined && { avatar }),
      ...(privateMessage !== undefined && { privateMessage })
    };
    guests[index] = updated;
    await writeGuests(guests);
    res.json(updated);
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
