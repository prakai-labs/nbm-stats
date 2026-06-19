# คู่มือ Deploy — สถิตินักเรียนประจำวัน โรงเรียนบ้านหนองบัวโนนเมือง

เว็บนี้เป็น **PWA (Progressive Web App)** — ติดตั้งบนมือถือ/แท็บเล็ตได้เหมือนแอปทั่วไป และ deploy ขึ้น server จริงได้หลายวิธี

---

## การสร้าง Google OAuth Credentials (จำเป็นสำหรับระบบ Login)

ระบบบังคับให้ครูล็อกอินด้วย Google ก่อนบันทึกข้อมูล ต้องสร้าง OAuth credentials ก่อน deploy

### ขั้นตอน
1. เปิด [Google Cloud Console](https://console.cloud.google.com/) → ล็อกอินด้วยบัญชี Google ของโรงเรียน
2. สร้าง Project ใหม่: คลิก dropdown ที่มุมบน → **New Project** → ตั้งชื่อ เช่น "BNNM Attendance"
3. เปิดใช้งาน Google+ API:
   - เมนูซ้าย → **APIs & Services** → **Library**
   - ค้นหา "Google+ API" → **Enable**
4. ตั้งค่า OAuth Consent Screen:
   - **APIs & Services** → **OAuth consent screen**
   - เลือก **External** → กรอกชื่อแอป "สถิตินักเรียน บนม." + อีเมล support
   - เพิ่ม scopes: `email`, `profile`, `openid`
   - เพิ่ม test users (อีเมลครูที่จะใช้ทดสอบ)
5. สร้าง Credentials:
   - **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:3000` (สำหรับ dev)
     - `https://YOUR-DOMAIN.com` (สำหรับ production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-DOMAIN.com/api/auth/callback/google`
   - กด **Create** → จะได้ **Client ID** และ **Client Secret**
6. คัดลอก Client ID และ Client Secret ไปตั้งค่าใน environment variables:
   ```
   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
   ```

### จำกัดเฉพาะครูของโรงเรียน (Optional)
หากต้องการให้เฉพาะอีเมลที่อนุญาตเท่านั้นเข้าใช้งาน ตั้งค่า:
```
ALLOWED_EMAILS=kru1@bnnm.ac.th,kru2@bnnm.ac.th,director@bnnm.ac.th
```

### Dev Mode (ทดสอบโดยไม่ต้องมี Google OAuth)
หากยังไม่ได้ตั้งค่า `GOOGLE_CLIENT_ID` จริง ระบบจะแสดงปุ่ม "เข้าสู่ระบบทดสอบ" ที่หน้า login (เข้าได้โดยไม่ต้อง Google) เพื่อให้ทดสอบ UI ได้ — ปุ่มนี้จะ **หายไปอัตโนมัติ** เมื่อตั้งค่า `GOOGLE_CLIENT_ID` จริง

---

## ตัวเลือกที่ 1: Vercel (ฟรี ง่าย แนะนำ)

Vercel เป็น platform ของทีมสร้าง Next.js — deploy ใน 5 นาที มี HTTPS อัตโนมัติ เหมาะกับโรงเรียน

### ขั้นตอน
1. สมัครบัญชีฟรีที่ [vercel.com](https://vercel.com) (ล็อกอินด้วย GitHub หรือ email)
2. อัปโหลดโค้ดทั้งหมดขึ้น GitHub repository (สามารถสร้าง private repo ได้)
3. ใน Vercel dashboard → **Add New Project** → เลือก repo ที่อัปโหลด
4. Vercel จะตรวจจับ Next.js อัตโนมัติ — กด **Deploy**
5. รอ 2-3 นาที จะได้ URL เช่น `https://nbm-stats.vercel.app`
6. **สำคัญ**: หลัง deploy ให้กลับไป Google Cloud Console → เพิ่ม Vercel URL ใน Authorized redirect URIs

### Environment Variables ที่ต้องตั้งใน Vercel
```
DATABASE_URL=postgresql://...          # URL ของ Postgres (Vercel Postgres หรือ Supabase)
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://nbm-stats.vercel.app
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
ALLOWED_EMAILS=kru1@bnnm.ac.th,...     # optional
```

### หมายเหตุสำคัญสำหรับ Vercel
- ⚠️ **Database**: Vercel serverless ไม่รองรับ SQLite แบบ persistent ต้องเปลี่ยนเป็น
  - **Vercel Postgres** (ฟรี 256 MB — เพียงพอสำหรับ <300 คน)
  - หรือ **Supabase** (ฟรี 500 MB)
  - หรือ **Neon** (ฟรี 0.5 GB)
- ⚠️ **WebSocket**: Vercel serverless มี timeout 10-60 วินาที ต้องย้าย Socket.io ไปใช้
  - **Pusher** (ฟรี 200k messages/day)
  - หรือ **Supabase Realtime** (ฟรี)
  - หรือใช้ polling-only (เพิ่ม refetchInterval ที่มีอยู่แล้ว)

---

## ตัวเลือกที่ 2: Self-host (Server โรงเรียน)

เหมาะถ้าโรงเรียนมี server เดิม หรือต้องการเก็บข้อมูลในเครือข่ายภายใน

### ขั้นตอน (ใช้ Docker ง่ายสุด)

1. ติดตั้ง [Docker](https://docs.docker.com/get-docker/) บน server
2. สร้างไฟล์ `Dockerfile` และ `docker-compose.yml` (สร้างให้ในขั้นตอนถัดไป)
3. รัน `docker compose up -d`
4. เข้าผ่าน `http://[server-ip]:3000`

### ใช้ PM2 (Node.js native)
```bash
# บน server
git clone <repo>
cd <project>
bun install
bun run build
pm2 start "bun run start" --name nbm-stats
pm2 save
pm2 startup
```

---

## ตัวเลือกที่ 3: ใช้บนเครื่องเดียว (offline)

ถ้าไม่ต้องการ server จริง — รันบนเครื่องครูที่โรงเรียน แล้วครูท่านอื่นเข้าผ่าน IP เครื่องนั้น

```bash
# บนเครื่องครู (เปิดทิ้งไว้)
bun install
bun run dev

# หา IP เครื่อง
ip addr | grep "inet " | grep -v 127.0.0.1
# เช่น 192.168.1.100

# ครูท่านอื่นเปิดเบราว์เซอร์ที่
# http://192.168.1.100:3000
```

---

## การติดตั้งเป็นแอป PWA (หลัง deploy แล้ว)

### บน Android (Chrome)
1. เปิด URL ใน Chrome
2. เมนู ⋮ มุมขวาบน → **เพิ่มลงในหน้าจอหลัก** (Add to Home screen)
3. กด **เพิ่ม** → จะมีไอคอนปรากฏบนหน้าจอหลัก
4. เปิดจากไอคอน → จะเต็มจอเหมือนแอปทั่วไป

### บน iPhone/iPad (Safari)
1. เปิด URL ใน Safari (ต้องเป็น Safari เท่านั้น)
2. กดปุ่ม Share ล่าง → **เพิ่มไปยังหน้าจอหลัก** (Add to Home Screen)
3. กด **เพิ่ม** → ไอคอนจะปรากฏบนหน้าจอหลัก

### บน Desktop (Chrome/Edge)
1. เปิด URL → จะมีไอคอน install ที่ address bar ด้านขวา
2. คลิก → **Install**

---

## หลัง Deploy: ขั้นตอนเริ่มต้นใช้งาน

1. เปิด URL ในเบราว์เซอร์ → ระบบจะ redirect ไปหน้า Login
2. คลิก **เข้าสู่ระบบด้วย Google** → เลือกบัญชี Google ของครู
3. หลังล็อกอิน ระบบจะจดจำชื่อและอีเมลของท่าน
4. เลือกวันที่ → กรอกข้อมูลทุกห้อง (ใช้ปุ่ม +/- หรือพิมพ์ตัวเลข)
5. กด **บันทึก** แต่ละแถว — ระบบจะบันทึกชื่อครูผู้บันทึกอัตโนมัติ
6. ดูสรุปรายเดือนที่แท็บ **ปฏิทินรายเดือน**
7. แตะที่วันในปฏิทิน → ดูรายละเอียดของวันนั้น หรือกลับไปแก้ไข

---

## Backup ข้อมูล

### SQLite (ปัจจุบัน)
```bash
# สำเนาไฟล์ทุกวัน
cp db/custom.db db/backup-$(date +%Y%m%d).db

# หรือใช้ script
bun run scripts/backup.ts
```

### Postgres (หลังย้าย)
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

---

## ถ้าต้องการความช่วยเหลือเพิ่ม

- ย้ายจาก SQLite → Postgres/MySQL
- เพิ่มระบบจำกัดสิทธิ์ครูต่อห้อง
- เพิ่ม export Excel/PDF
- แจ้งเตือนผ่าน LINE Notify เมื่ออัตราการมาต่ำ

แจ้งได้ใน chat ถัดไปครับ
