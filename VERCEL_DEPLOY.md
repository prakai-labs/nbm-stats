# คู่มือ Deploy ไปยัง Vercel อย่างละเอียด

คู่มือนี้อธิบายการย้ายเว็บสถิตินักเรียนจาก Z.ai sandbox (`nbmstats.space-z.ai`) ไปยัง Vercel แบบ step-by-step

**URL ที่ตั้งเป้าหมายไว้**: `https://nbm-stats.vercel.app`

---

## 📋 สิ่งที่จะได้หลัง deploy

- ✅ URL ถาวร: **`https://nbm-stats.vercel.app`** (ไม่มีวันหมดอายุ ฟรีตลอดไป)
- ✅ HTTPS อัตโนมัติ
- ✅ Database ถาวรบน Vercel Postgres (ฟรี 256 MB)
- ✅ Multi-user sync ผ่าน polling (ทุก 10 วินาที)
- ✅ Login ด้วย Google ทำงานครบ
- ✅ PWA install บนมือถือได้
- ✅ Export PDF รายงาน

---

## ⚠️ ข้อจำกัดของ Vercel (ฟรี)

| ข้อจำกัด | รายละเอียด | ผลกระทบ |
|---------|-----------|---------|
| Database ฟรี | 256 MB (Vercel Postgres) | เพียงพอสำหรับ <300 คน × 365 วัน |
| WebSocket | ไม่รองรับ persistent WS | ใช้ polling แทน (delay 10s) — ยัง sync ได้ |
| Function timeout | 10-60 วินาที | แต่ละ API call ต้องเร็ว |
| Bandwidth | 100 GB/เดือน | เพียงพอสำหรับโรงเรียน |
| Cold start | ~1-2 วินาที ถ้า idle นาน | ตื่นตัวหลังมี request |

---

## 🚀 ขั้นตอนที่ 1: สมัครบัญชีฟรี

### 1.1 สมัคร GitHub (ถ้ายังไม่มี)
1. ไปที่ [github.com](https://github.com) → สมัครฟรีด้วยอีเมล
2. ยืนยันอีเมล

### 1.2 สมัคร Vercel
1. ไปที่ [vercel.com](https://vercel.com) → คลิก **Sign Up**
2. เลือก **Continue with GitHub** (แนะนำ) — Vercel จะเชื่อมกับ GitHub โดยตรง
3. อนุญาตให้ Vercel เข้าถึง GitHub

---

## 📦 ขั้นตอนที่ 2: อัปโหลดโค้ดขึ้น GitHub

### 2.1 สร้าง GitHub repository ใหม่
1. ใน GitHub → คลิก **+** มุมขวาบน → **New repository**
2. ตั้งชื่อ: **`nbm-stats`** (⚠️ ต้องตั้งชื่อนี้เพื่อให้ได้ URL `nbm-stats.vercel.app`)
3. เลือก **Private** (แนะนำ — ป้องกันคนอื่นเห็นโค้ด)
4. ✅ ติ๊ก **Add a README file**
5. คลิก **Create repository**

> 💡 **สำคัญ**: ชื่อ repo จะเป็นชื่อ subdomain บน Vercel โดยอัตโนมัติ — ตั้งชื่อ `nbm-stats` เพื่อให้ได้ URL ตรงตามที่ต้องการ

### 2.2 ดาวน์โหลดโค้ดจาก sandbox
ใน Z.ai chat → ขอให้ผม "zip โค้ดทั้งหมดให้หน่อย" — ผมจะสร้างไฟล์ `.tar.gz` ให้ดาวน์โหลด

หรือทำเอง:
1. ดาวน์โหลดโค้ดทั้งหมดจาก sandbox (folder `/home/z/my-project/`)
2. แตกไฟล์ในเครื่องคุณ

### 2.3 อัปโหลดไฟล์ขึ้น GitHub
**วิธีง่ายที่สุด — ผ่านเว็บ GitHub:**
1. เปิด repo `nbm-stats` ที่สร้างในขั้น 2.1
2. คลิก **Add file** → **Upload files**
3. ลากไฟล์ทั้งหมดไปวาง (ยกเว้น `node_modules/`, `.next/`, `db/custom.db`)
4. พิมพ์ commit message: "Initial commit"
5. คลิก **Commit changes**

**วิธีสำหรับคนที่ใช้ git ใน terminal:**
```bash
# Clone repo ที่สร้าง
git clone https://github.com/USERNAME/nbm-stats.git
cd nbm-stats

# คัดลอกไฟล์จาก sandbox มาวางใน folder นี้
# (ยกเว้น node_modules/, .next/, db/custom.db)

# เพิ่ม .gitignore (สำคัญ!)
cat > .gitignore <<'EOF'
node_modules/
.next/
out/
.env
.env.local
db/custom.db
*.log
.vercel
EOF

# Commit & push
git add .
git commit -m "Initial commit"
git push origin main
```

---

## 🗄️ ขั้นตอนที่ 3: สร้าง Database Postgres

เลือก **หนึ่งในสาม** ตัวเลือก (แนะนำ Vercel Postgres เพราะง่ายสุด):

### ตัวเลือก A: Vercel Postgres (แนะนำ)

1. หลังจาก deploy ในขั้นตอนที่ 4 → ใน Vercel dashboard ของ project `nbm-stats`
2. ไปที่ **Storage** tab → **Create Database** → เลือก **Postgres**
3. ตั้งชื่อ: `nbm-stats-db`
4. Region: เลือก **Singapore (sin1)** — ใกล้ไทยสุด
5. คลิก **Create**
6. หลังสร้างเสร็จ → คลิก **Connect to Project** → เลือก project `nbm-stats`
7. Vercel จะเพิ่ม `DATABASE_URL` และ `DIRECT_DATABASE_URL` ใน Environment Variables อัตโนมัติ

### ตัวเลือก B: Neon (ฟรี 0.5 GB)
1. สมัครที่ [neon.tech](https://neon.tech)
2. สร้าง project → ได้ connection string
3. คัดลอก connection string ไปใช้ในขั้นตอนที่ 5

### ตัวเลือก C: Supabase (ฟรี 500 MB)
1. สมัครที่ [supabase.com](https://supabase.com)
2. สร้าง project → Settings → Database → Connection string
3. คัดลอก connection string ไปใช้ในขั้นตอนที่ 5

---

## 🔧 ขั้นตอนที่ 4: Deploy บน Vercel

### 4.1 Import project
1. ใน Vercel dashboard → **Add New** → **Project**
2. เลือก repo `nbm-stats` ที่สร้างในขั้น 2.1
3. Vercel จะตรวจจับ Next.js อัตโนมัติ

### 4.2 ตั้งค่า Build & Output
ในหน้า **Configure Project**:
- **Framework Preset**: Next.js (อัตโนมัติ)
- **Build Command**: `bun run build:vercel` ⚠️ **สำคัญ** — ต้องตั้งค่านี้!
- **Output Directory**: `.next` (อัตโนมัติ)
- **Install Command**: `bun install` (อัตโนมัติ)

### 4.3 เพิ่ม Environment Variables
ในหน้าเดียวกัน → เลื่อนลงมาที่ **Environment Variables** → เพิ่มทีละตัว:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXTAUTH_SECRET` | (สร้างด้วย `openssl rand -base64 32` ใน terminal) | Production + Preview |
| `NEXTAUTH_URL` | `https://nbm-stats.vercel.app` | Production |
| `GOOGLE_CLIENT_ID` | `88781518013-5nibilv9ga6hbsp2ap20sq6trbh4hr3g.apps.googleusercontent.com` | Production + Preview |
| `GOOGLE_CLIENT_SECRET` | `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` | Production + Preview |

⚠️ **สำคัญ**: อย่าใส่ `DATABASE_URL` เอง — Vercel จะใส่ให้อัตโนมัติหลังจากขั้น 3.1

💡 **ถ้ายังไม่รู้ URL จริง** — deploy ครั้งแรกก่อน แล้วค่อยมาแก้ `NEXTAUTH_URL` ทีหลัง

### 4.4 Deploy!
1. คลิก **Deploy**
2. รอ 2-5 นาที (build + deploy)
3. ถ้าสำเร็จ → จะได้ URL: **`https://nbm-stats.vercel.app`**
4. ถ้า fail → ดู log ในหน้า Vercel → ส่ง screenshot มาให้ผมช่วยดู

---

## 🔐 ขั้นตอนที่ 5: อัปเดต Google OAuth Redirect URI

หลังได้ URL จริงจาก Vercel แล้ว:

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. คลิก OAuth client ที่สร้างไว้ (Client ID: `88781518013-...`)
3. ในส่วน **Authorized redirect URIs** → เพิ่ม:
   ```
   https://nbm-stats.vercel.app/api/auth/callback/google
   ```
4. (Optional) ลบ URI เดิมของ sandbox ออก:
   ```
   https://nbmstats.space-z.ai/api/auth/callback/google
   ```
5. คลิก **Save**

> 💡 ค้างไว้ทั้งสอง URI ได้ ถ้ายังต้องการใช้ sandbox ไปพร้อมกัน

---

## 📊 ขั้นตอนที่ 6: สร้างตารางใน Database + Seed ข้อมูลห้องเรียน

หลัง deploy สำเร็จ ต้องสร้างตารางใน Postgres และ seed ข้อมูลห้องเรียนเริ่มต้น

### 6.1 รัน Prisma db push ผ่าน Vercel CLI

1. ติดตั้ง Vercel CLI ในเครื่อง:
   ```bash
   npm install -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. เชื่อม project กับ Vercel (ใน folder ที่ clone จาก GitHub):
   ```bash
   cd nbm-stats
   vercel link
   ```
   เลือก project `nbm-stats`

4. รัน db push เพื่อสร้างตาราง:
   ```bash
   # ดึง env vars จาก Vercel มาไฟล์ .env.vercel
   vercel env pull .env.vercel

   # ใช้ DATABASE_URL จาก Vercel รัน prisma
   export $(grep -v '^#' .env.vercel | xargs)
   bunx prisma db push --schema prisma/schema.postgres.prisma --accept-data-loss
   ```
   ถ้าสำเร็จจะเห็น "🚀 Your database is now in sync"

### 6.2 Seed ข้อมูลห้องเรียน (12 ห้อง)

```bash
# ใช้ DATABASE_URL จาก .env.vercel ที่ดึงมาแล้ว
bun run scripts/seed.ts
```

ถ้าสำเร็จจะเห็น "Seeded 12 classrooms"

### 6.3 (Optional) ย้ายข้อมูลเก่าจาก SQLite

ถ้ามีข้อมูลใน sandbox ที่อยากเก็บไปด้วย:

1. ดาวน์โหลด `db/custom.db` จาก sandbox
2. วางใน folder `db/` ของโปรเจกต์
3. รัน migration script:
   ```bash
   SQLITE_PATH=./db/custom.db bun run scripts/migrate-sqlite-to-postgres.ts
   ```

---

## ✅ ขั้นตอนที่ 7: ทดสอบการใช้งาน

1. เปิด **`https://nbm-stats.vercel.app`** ในเบราว์เซอร์
2. จะถูก redirect ไปหน้า login
3. คลิก **เข้าสู่ระบบด้วย Google** → เลือกบัญชี Google
4. หลัง login สำเร็จ → เห็นหน้า dashboard พร้อม 12 ห้องเรียน
5. ลองกรอกข้อมูลห้องหนึ่ง → กดบันทึก
6. ดูข้อมูลอัปเดตใน summary cards
7. ลองเปิดอีก tab/browser → บันทึกห้องอื่น → รอ 10 วินาที → tab แรกจะเห็นข้อมูลอัปเดต
8. ทดสอบ **Export PDF**: คลิกแท็บ "รายงาน PDF" → เลือก "เดือนนี้" → สร้าง PDF

---

## 📱 ขั้นตอนที่ 8: ติดตั้งเป็น PWA

### บน Android (Chrome)
1. เปิด `https://nbm-stats.vercel.app` ใน Chrome
2. เมนู ⋮ → **เพิ่มลงในหน้าจอหลัก** → กด **เพิ่ม**

### บน iPhone/iPad (Safari)
1. เปิด URL ใน Safari
2. กด Share → **เพิ่มไปยังหน้าจอหลัก** → กด **เพิ่ม**

---

## 🔄 ขั้นตอนที่ 9: แก้ไขโค้ดและ Redeploy

หลังจาก deploy ครั้งแรก การแก้ไขโค้ดทำได้ง่าย:

### วิธีอัตโนมัติ (แนะนำ)
1. แก้โค้ดในเครื่อง → `git push origin main`
2. Vercel จะ auto-deploy โดยอัตโนมัติภายใน 1-2 นาที

### วิธีผ่าน Vercel dashboard
1. ใน Vercel → project `nbm-stats` → **Deployments** tab
2. เลือก deployment ล่าสุด → เมนู ⋮ → **Redeploy**

---

## 🆘 การแก้ปัญหาเบื้องต้น

### ❌ ขึ้น "Deployment Failed"
1. ดู **Build Logs** ในหน้า Vercel deployment
2. ปัญหาที่พบบ่อย:
   - `prisma generate` fail → ตรวจ `DATABASE_URL` ถูกตั้งไว้ไหม
   - `next build` fail → ดู error ใน log ส่งมาให้ผมช่วยดู

### ❌ Login ไม่ได้ — "redirect_uri_mismatch"
1. ใน Google Cloud Console → Authorized redirect URIs
2. ต้องมี `https://nbm-stats.vercel.app/api/auth/callback/google` ตรงๆเป๊ะ
3. รอ 5 นาทีให้ Google propagate

### ❌ ข้อมูลหายหลัง deploy ใหม่
- ปกติข้อมูลอยู่ใน Postgres ถาวร ไม่หาย
- ถ้าหาย → ตรวจ `DATABASE_URL` ยังชี้ไป database เดิมไหม

### ❌ API ช้า / cold start
- Vercel serverless มี cold start 1-2 วินาที หลัง idle นาน
- วิธีแก้: upgrade เป็น Vercel Pro ($20/เดือน) หรือใช้ cron job ปลุกทุก 5 นาที

### ❌ Multi-user sync ไม่ทำงาน
- ระบบใช้ polling ทุก 10 วินาที (ไม่ใช่ realtime)
- ถ้าต้องการเร็วกว่านี้ → ต้องเพิ่ม Pusher หรือ Supabase Realtime

### ❌ ได้ URL อื่นที่ไม่ใช่ `nbm-stats.vercel.app`
- Vercel อาจตั้งชื่ออัตโนมัติ เช่น `nbm-stats-xxx.vercel.app` ถ้าชื่อซ้ำ
- วิธีแก้: ใน Vercel → project → Settings → Domains → เปลี่ยนชื่อเป็น `nbm-stats`
- หรือลบ project แล้วสร้างใหม่ด้วยชื่อ repo `nbm-stats` โดยเฉพาะ

---

## 📋 สรุปไฟล์ที่เตรียมไว้สำหรับ Vercel

| ไฟล์ | หน้าที่ |
|------|--------|
| `prisma/schema.postgres.prisma` | Prisma schema สำหรับ Postgres |
| `scripts/migrate-sqlite-to-postgres.ts` | ย้ายข้อมูล SQLite → Postgres |
| `scripts/postinstall.js` | Auto-switch schema เมื่อ deploy บน Vercel |
| `vercel.json` | Vercel config (build command, headers, function timeout) |
| `.env.vercel.example` | Template สำหรับ env vars |
| `src/lib/db.ts` | Prisma client รองรับทั้ง SQLite + Postgres |
| `src/components/attendance/use-socket-sync.ts` | Auto-detect: ใช้ socket.io ใน sandbox / polling ใน Vercel |

---

## 🎯 สรุปขั้นตอนทั้งหมด (TL;DR)

1. ✅ สมัคร GitHub + Vercel
2. ✅ สร้าง GitHub repo ชื่อ `nbm-stats`
3. ✅ อัปโหลดโค้ดขึ้น repo
4. ✅ ใน Vercel → Import repo → ตั้งค่า Build Command = `bun run build:vercel`
5. ✅ เพิ่ม Environment Variables: `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://nbm-stats.vercel.app`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
6. ✅ Deploy → ได้ URL `https://nbm-stats.vercel.app`
7. ✅ ใน Vercel → Storage → Create Postgres → Connect to Project
8. ✅ ใน Google Cloud Console → เพิ่ม redirect URI `https://nbm-stats.vercel.app/api/auth/callback/google`
9. ✅ รัน `vercel env pull .env.vercel` + `bunx prisma db push --schema prisma/schema.postgres.prisma`
10. ✅ รัน `bun run scripts/seed.ts`
11. ✅ เปิด `https://nbm-stats.vercel.app` → login → ทดสอบบันทึกข้อมูล + Export PDF

---

## 📞 ต้องการความช่วยเหลือ?

ถ้าเจอปัญหาตอน deploy:
1. ส่ง screenshot ของ error จาก Vercel build logs
2. บอกขั้นตอนที่ fail
3. ผมจะช่วยแก้ให้

หลัง deploy สำเร็จ บอกผม — ผมจะอัปเดต OAuth + manifest + ทดสอบให้
