# 📋 เอกสารส่งมอบงาน (Project Handoff) — NBM Stats

ระบบบันทึกและรายงานสถิตินักเรียนประจำวัน **โรงเรียนบ้านหนองบัวโนนเมือง**

---

## 📌 1. ภาพรวมโปรเจกต์ (Project Overview)
เว็บแอปพลิเคชันแบบ Progressive Web App (PWA) สำหรับคุณครูและบุคลากรโรงเรียนบ้านหนองบัวโนนเมือง เพื่อใช้ในการ:
* บันทึกสถิติการมาเรียน ป่วย ลา ขาด ของนักเรียนแต่ละชั้นเรียนแบบ Real-time
* สรุปภาพรวมและออกรายงานสถิติประจำวัน / สถิติแนวโน้ม / ส่งออก Excel & PDF
* บันทึกสมุดบันทึกประจำวันของครูเวร และระบบลงนามรับรองของผู้อำนวยการ
* ระบบแจ้งเตือนอัตโนมัติผ่าน **LINE Messaging API** และ **Web Push Notification** เข้าสู่อุปกรณ์ที่ติดตั้ง PWA

---

## 🛠️ 2. เทคโนโลยีที่ใช้ (Tech Stack)
* **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
* **Styling & UI:** Tailwind CSS + Radix UI / Shadcn UI + Lucide React + Framer Motion
* **Database & ORM:** PostgreSQL (Neon Serverless Postgres) + Prisma ORM
* **Authentication:** NextAuth.js (Google OAuth + Role-Based Access Control)
* **State & Sync:** TanStack React Query + Socket.io Client
* **PWA & Notifications:** Service Worker (`sw.js`), Web Push API (`web-push`), LINE Messaging API
* **Deployment:** Vercel

---

## 📂 3. โครงสร้างโฟลเดอร์สำคัญ (Directory Structure)

```text
nbm-stats/
├── prisma/
│   ├── schema.prisma              # Database Schema หลัก (PostgreSQL)
│   └── schema.postgres.prisma     # Backup Schema สำหรับสภาพแวดล้อม Postgres
├── public/
│   ├── sw.js                      # Service Worker รองรับ Offline Cache & Web Push
│   ├── manifest.json              # PWA Manifest
│   └── icons/                     # ไอคอนขนาดต่างๆ สำหรับ PWA
├── src/
│   ├── app/
│   │   ├── admin/                 # หน้าผู้ดูแลระบบ (จัดการสิทธิ์, ตั้งค่าเปิด-ปิดเทอม, ทดสอบแจ้งเตือน)
│   │   ├── login/                 # หน้า Login ผ่าน Google
│   │   ├── api/
│   │   │   ├── attendance/        # API ดึง/บันทึก สถิติรายวัน
│   │   │   ├── admin/             # API จัดการผู้ใช้และค่าระบบ
│   │   │   ├── cron/              # Cron Jobs (report แจ้งเตือน 15:00 น.)
│   │   │   ├── export-excel/      # API สร้างไฟล์สรุป Excel
│   │   │   ├── summary/           # API สรุปยอดนักเรียนทั้งหมด / รายงานแล้ว / ยังไม่รายงาน
│   │   │   └── web-push/          # API บันทึก/ลบ Push Subscription ของอุปกรณ์
│   │   └── page.tsx               # หน้าแรก (Dashboard + ฟอร์มบันทึก + ปฏิทิน + สรุปรายงาน)
│   ├── components/
│   │   ├── attendance/            # Components สถิติ (AttendanceForm, SummaryCards, SiteHeader ฯลฯ)
│   │   ├── auth/                  # Components ล็อกอิน และ UserMenu
│   │   ├── pwa-push-subscribe.tsx # ปุ่มเปิดรับแจ้งเตือนผ่าน Web Push
│   │   └── ui/                    # Base UI components (Button, Dialog, Card, Input ฯลฯ)
│   └── lib/
│       ├── auth.ts                # NextAuth Configuration
│       ├── db.ts                  # Prisma Client Instance
│       ├── holidays.ts            # ตรวจสอบวันหยุดราชการ/วันหยุดนักขัตฤกษ์
│       └── line-api.ts            # Helper ฟังก์ชันส่ง LINE Push Message
├── vercel.json                    # ตั้งค่า Build, Crons และ Headers แคช PWA
└── package.json
```

---

## 🗄️ 4. โครงสร้างฐานข้อมูล (Database Schema)

| Model | คำอธิบาย |
| :--- | :--- |
| `Classroom` | ข้อมูลห้องเรียน (รหัสย่อ เช่น `ป.1`, `ม.1`, ลำดับการแสดงผล, ค่าตั้งต้น ชาย/หญิง `defaultMale`, `defaultFemale`) |
| `AttendanceRecord` | ข้อมูลบันทึกสถิติประจำวันแยกตามห้องเรียนและวันที่ (มา, ป่วย, ลา, ขาด, ชาย-หญิง, ผู้บันทึก) |
| `UserRole` | บทบาทผู้ใช้งาน (`admin` = ผู้ดูแล, `director` = ผอ., `teacher` = ครู) |
| `DailyLog` | บันทึกครูเวรประจำวัน และสถานะการลงนามของ ผอ. |
| `SystemSetting` | การตั้งค่าระบบ เช่น วันเปิด-ปิดภาคเรียน (`semester_settings`) |
| `PushSubscription` | เก็บ Endpoint และ Key สำหรับส่ง Web Push เข้าอุปกรณ์ PWA |

---

## ⚙️ 5. ตัวแปรสภาพแวดล้อม (Environment Variables)

ตั้งค่าใน `.env` สำหรับ Local และใน Vercel Environment Variables สำหรับ Production:

```env
# Database (Postgres / Neon)
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://nbm-stats.vercel.app"
NEXTAUTH_SECRET="your-nextauth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Vercel Cron Security
CRON_SECRET="your-cron-secret"

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN="your-long-lived-channel-access-token"
LINE_GROUP_ID="Ccb4c37006d5f40c2e174341b02113450"
LINE_CHANNEL_SECRET="your-channel-secret"

# Web Push (VAPID Keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BAfWVPK1kc_VvUeDdXEbDHPcLmyJlxQ6M8tF4U-Znr5THVsCVZk1DH-QJOazqplfr7kD0x4zuHLCKkvsjfZIbfo"
VAPID_PRIVATE_KEY="PPmvBR_gdpANF0msLospZkWDC5eCTJ6vygftItpKSsE"
```

---

## 🔔 6. ระบบการแจ้งเตือน (Notifications System)

1. **เวลาส่งแจ้งเตือนอัตโนมัติ:**
   * ทำงานทุก **วันจันทร์ - ศุกร์ เวลา 15:00 น. (บ่าย 3 โมง)** ของไทย (ตรงกับเวลา `0 8 * * 1-5` UTC บน Vercel Cron)
   * ส่งสรุปภาพรวมสถิติประจำวัน: ยอดรวมทั้งโรงเรียน, จำนวนที่รายงานแล้ว, ยอดป่วย/ลา/ขาด, และระบุชั้นที่ยังไม่ได้บันทึก
   * หากเป็น **วันหยุดนักขัตฤกษ์** หรือ **ช่วงปิดเทอม** ระบบจะข้ามการส่งให้อัตโนมัติ

2. **ช่องทางการส่ง:**
   * **LINE Group:** ส่งเข้ากลุ่มผ่าน `LINE_GROUP_ID` โดยใช้ `pushMessage()`
   * **Web Push (PWA):** ส่งเข้าทุกอุปกรณ์ที่กดเปิดรับการแจ้งเตือนผ่านเมนูโปรไฟล์

3. **การทดสอบส่งแจ้งเตือนด้วยตนเอง:**
   * ผู้ดูแลระบบสามารถเข้าหน้า `/admin` แล้วกดปุ่ม **"รายงานสถิติประจำวัน"** หรือ **"แจ้งเตือนการบันทึกสถิติ"** ได้ตลอดเวลา (ระบบจะใส่ `?force=true` เพื่อข้ามการตรวจวันหยุด)

---

## 📌 7. การบำรุงรักษาและปรับปรุงข้อมูล (Maintenance & Common Tasks)

### 1) การปรับยอดจำนวนนักเรียนตั้งต้นของห้องเรียน (Classroom Default)
หากมีนักเรียนย้ายเข้า/ย้ายออก ต้องแก้ไขค่าตั้งต้นเพื่อให้วันถัดไประบบดึงยอดใหม่อัตโนมัติ:
```bash
# ตัวอย่าง: ปรับ ม.1 นักเรียนหญิงเป็น 4 คน
bun -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { await prisma.classroom.updateMany({ where: { code: 'ม.1' }, data: { defaultFemale: 4 } }); console.log('Updated!'); } main().catch(console.error).finally(() => prisma.\$disconnect());"
```

### 2) การตั้งค่าวันเปิด-ปิดภาคเรียน
* เข้าหน้า `/admin` ไปที่แท็บ **ตั้งค่าระบบ**
* กรอกปีการศึกษา (พ.ศ.) และระบุวันเปิด-ปิดภาคเรียนที่ 1 และ 2
* เมื่ออยู่นอกช่วงเวลาดังกล่าว ระบบจะแสดงสถานะ "ปิดเทอม" และระงับการแจ้งเตือนอัตโนมัติ

### 3) การอัปเดตสิทธิ์ผู้ใช้งาน (Roles)
* เข้าหน้า `/admin` ในแท็บ **จัดการผู้ใช้งาน** เพื่อเปลี่ยน Role:
  * `ผู้ดูแลระบบ (admin)`: เข้าถึงหน้า Admin, ตั้งค่าระบบ, ทดสอบแจ้งเตือน
  * `ผู้อำนวยการ (director)`: สามารถกดปุ่มลงนามรับรองสมุดบันทึกประจำวันของครูเวรได้
  * `คุณครู (teacher)`: บันทึกและแก้ไขสถิตินักเรียน

---

## 🚀 8. คำสั่งที่ใช้บ่อย (Useful Commands)

```bash
# ติดตั้ง dependencies
bun install

# รันโหมด Development
bun run dev

# อัปเดตโครงสร้าง Database ไปยัง Postgres
bun run db:push

# Generate Prisma Client
bun run db:generate

# ทดสอบ Build โปรเจกต์
bun run build
```
