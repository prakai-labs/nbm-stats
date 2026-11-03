# 📋 เอกสารส่งมอบระบบ (Project Handoff Document)
# ระบบบันทึกและรายงานสถิตินักเรียนประจำวัน (NBM Stats)
### โรงเรียนบ้านหนองบัวโนนเมือง สำนักงานเขตพื้นที่การศึกษาประถมศึกษาขอนแก่น เขต 5

---

## 📑 สารบัญ (Table of Contents)
1. [ภาพรวมของระบบ (Project Overview)](#1-ภาพรวมของระบบ-project-overview)
2. [สถาปัตยกรรมและเทคโนโลยี (Tech Stack & Architecture)](#2-สถาปัตยกรรมและเทคโนโลยี-tech-stack--architecture)
3. [โครงสร้างโค้ดและโฟลเดอร์ (Project Structure)](#3-โครงสร้างโค้ดและโฟลเดอร์-project-structure)
4. [ฟังก์ชันการทำงานหลัก (Key Features)](#4-ฟังก์ชันการทำงานหลัก-key-features)
5. [ฐานข้อมูลและโมเดล (Database Schema)](#5-ฐานข้อมูลและโมเดล-database-schema)
6. [ยอดนักเรียนตั้งต้นปัจจุบัน (Current Student Baseline)](#6-ยอดนักเรียนตั้งต้นปัจจุบัน-current-student-baseline)
7. [ระบบแจ้งเตือนอัตโนมัติ (Notifications & Cron Jobs)](#7-ระบบแจ้งเตือนอัตโนมัติ-notifications--cron-jobs)
8. [ตัวแปรสภาพแวดล้อม (Environment Variables)](#8-ตัวแปรสภาพแวดล้อม-environment-variables)
9. [คู่มือการติดตั้งและรันระบบ (Setup & Deployment Runbook)](#9-คู่มือการติดตั้งและรันระบบ-setup--deployment-runbook)
10. [คู่มือการดูแลและบำรุงรักษาระบบ (Maintenance & Common Tasks)](#10-คู่มือการดูแลและบำรุงรักษาระบบ-maintenance--common-tasks)
11. [การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)](#11-การแก้ไขปัญหาที่พบบ่อย-troubleshooting--faq)

---

## 1. ภาพรวมของระบบ (Project Overview)

**NBM Stats** เป็นเว็บแอปพลิเคชันรูปแบบ **Progressive Web App (PWA)** ออกแบบมาเพื่ออำนวยความสะดวกให้คณะครูและบุคลากรทางการศึกษาโรงเรียนบ้านหนองบัวโนนเมือง ในการบันทึก ติดตาม และสรุปสถิติการมาเรียนของนักเรียนตั้งแต่ระดับชั้นอนุบาล 1 ถึงมัธยมศึกษาปีที่ 3

### จุดเด่นของระบบ:
* **บันทึกข้อมูลสะดวกรวดเร็ว:** รองรับทั้งสมาร์ตโฟน แท็บเล็ต และคอมพิวเตอร์ ทำงานเป็น PWA ติดตั้งลงหน้าจอโฮมได้
* **ยอดตั้งต้นอัตโนมัติ:** ดึงยอดนักเรียน ชาย/หญิง ของแต่ละห้องเป็นค่าเริ่มต้นอัตโนมัติ ครูเพียงกรอกยอดที่ขาด ป่วย หรือลา
* **ระบบตรวจจับวันที่ตกหล่น (Missing Dates Detection):** คำนวณวันเปิดเรียนจริง (ไม่รวมเสาร์-อาทิตย์, วันหยุดราชการ และช่วงปิดเทอม) และแจ้งเตือนห้องเรียนที่ยังค้างบันทึก พร้อมปุ่มกดบันทึกย้อนหลังได้ในคลิกเดียว
* **ส่งออกรายงานมาตรฐาน:** ส่งออกเป็นไฟล์ Excel (`.xlsx`) และพิมพ์/บันทึกเป็นรายงาน PDF สรุปประจำวันได้ทันที
* **สมุดบันทึกครูเวรและลงนาม ผอ.:** ครูเวรประจำวันสามารถบันทึกเหตุการณ์ และผู้อำนวยการสามารถกดลงนามรับรองดิจิทัลได้
* **แจ้งเตือน 2 ช่องทาง:** แจ้งเตือนสรุปประจำวันทุกบ่าย 3 โมง ผ่าน **LINE Group (Messaging API)** และ **Web Push Notification** เข้าอุปกรณ์

---

## 2. สถาปัตยกรรมและเทคโนโลยี (Tech Stack & Architecture)

```
┌────────────────────────────────────────────────────────┐
│                   Client Layer (PWA)                   │
│   Next.js 16 + React 19 + Tailwind CSS + Radix UI      │
│   Service Worker (sw.js) + Web Push + Lucide Icons     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST API
┌───────────────────────────▼────────────────────────────┐
│                  Application Layer                     │
│   Next.js App Router (Node.js Runtime on Vercel)       │
│   NextAuth.js (Google OAuth 2.0 + RBAC)                │
│   Vercel Cron Jobs (0 8 * * 1-5 UTC = 15:00 น. จ-ศ)    │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
┌─────────────▼───────────────┐ ┌─────────▼──────────────┐
│       Database Layer        │ │   External Services    │
│   Neon Serverless Postgres  │ │   LINE Messaging API   │
│   Prisma ORM v6 (Pooled DB) │ │   Web Push (VAPID)     │
└─────────────────────────────┘ └────────────────────────┘
```

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript
* **Styling & Components:** Tailwind CSS, Radix UI, Lucide React, Framer Motion
* **Database & ORM:** PostgreSQL (โฮสต์บน [Neon.tech](https://neon.tech)) ผ่าน Prisma ORM 6.x
* **Authentication:** NextAuth.js ผูกกับ Google OAuth (จำกัดสิทธิ์ตาม Role ในฐานข้อมูล)
* **Exporting:** `xlsx` (Excel generation)
* **Notifications:**
  * `@line/bot-sdk` / Fetch API ไปยัง LINE Messaging API
  * `web-push` ส่ง Notification ไปยัง Web Push Subscriptions
* **Deployment & Hosting:** [Vercel](https://vercel.com) ผูกกับ Git Repository สำหรับ Continuous Deployment

---

## 3. โครงสร้างโค้ดและโฟลเดอร์ (Project Structure)

```text
nbm-stats/
├── prisma/
│   ├── schema.prisma                  # โมเดลฐานข้อมูลหลัก (PostgreSQL)
│   └── schema.postgres.prisma         # Backup Schema สำหรับสภาพแวดล้อม Postgres
├── public/
│   ├── sw.js                          # Service Worker (รองรับ Caching + Web Push listener)
│   ├── manifest.json                  # การตั้งค่า PWA ติดตั้งลงหน้าจอโฮม
│   └── icons/                         # ไอคอนสำหรับแอปพลิเคชัน
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root Layout ครอบ SessionProvider และ Theme
│   │   ├── page.tsx                   # หน้าหลัก Dashboard (สลับ 4 แท็บ)
│   │   ├── login/                     # หน้า Login สำหรับเข้าสู่ระบบผ่าน Google
│   │   ├── admin/                     # หน้าแดชบอร์ดผู้ดูแลระบบ
│   │   │   └── page.tsx               # จัดการสิทธิ์ผู้ใช้, ตั้งค่าเปิด-ปิดเทอม, ทดสอบส่งแจ้งเตือน
│   │   └── api/
│   │       ├── attendance/            # API สถิติประจำวัน (GET, POST, PUT)
│   │       ├── classroom-history/     # API สถิติย้อนหลังรายห้อง + ตรวจจับวันที่ยังไม่บันทึก
│   │       ├── classrooms/            # ข้อมูลห้องเรียนและยอดตั้งต้น
│   │       │   └── seed-defaults/     # Helper กำหนดค่ายอดเริ่มต้น
│   │       ├── calendar/              # API ข้อมูลสถิติสำหรับแสดงในปฏิทิน
│   │       ├── daily-log/             # API บันทึกครูเวรและการลงนามของ ผอ.
│   │       ├── export-excel/          # API ออกไฟล์ Excel (รองรับ export ทั้ง รร. หรือรายห้อง)
│   │       ├── summary/               # API สรุปยอดนักเรียนทั้งหมด / ยอดมา ป่วย ลา ขาด
│   │       ├── trends/                # API สถิติแนวโน้มย้อนหลัง
│   │       ├── web-push/              # API บันทึก/ยกเลิก Push Subscription
│   │       ├── cron/
│   │       │   └── report/            # Cron Job ประจำวัน 15:00 น. (LINE + Web Push)
│   │       ├── admin/
│   │       │   ├── users/             # API เปลี่ยนแปลง Role ผู้ใช้งาน
│   │       │   ├── settings/semester/ # API บันทึกวันเปิด-ปิดเทอม
│   │       │   └── fix-defaults/      # API ปรับปรุงค่าตั้งต้นนักเรียน
│   │       └── auth/[...nextauth]/    # Endpoint การยืนยันตัวตน NextAuth
│   ├── components/
│   │   ├── attendance/
│   │   │   ├── attendance-form.tsx    # ฟอร์มบันทึกสถิติรายวัน
│   │   │   ├── classroom-history-view.tsx # มุมมองสถิติย้อนหลังรายห้อง + ตัวกรองวันค้าง
│   │   │   ├── attendance-calendar.tsx    # มุมมองปฏิทิน
│   │   │   ├── summary-cards.tsx      # การ์ดสรุปยอดภาพรวม
│   │   │   ├── daily-log-section.tsx  # ส่วนบันทึกครูเวร + ปุ่ม ผอ. ลงนาม
│   │   │   ├── pdf-report.tsx         # รายงานสำหรับพิมพ์หรือบันทึก PDF
│   │   │   └── site-header.tsx        # แถบ Header, วันที่ และสถานะการซิงก์
│   │   ├── auth/
│   │   │   ├── login-button.tsx       # ปุ่มล็อกอิน
│   │   │   └── user-menu.tsx          # เมนูโปรไฟล์ผู้ใช้ + ปุ่มเปิดรับ Web Push
│   │   ├── pwa-push-subscribe.tsx     # สวิตช์เปิดรับการแจ้งเตือน Web Push
│   │   └── ui/                        # UI Components พื้นฐาน (Shadcn UI)
│   └── lib/
│       ├── auth.ts                    # การตั้งค่า NextAuth, Callbacks และ Role checking
│       ├── db.ts                      # Prisma Client Instance (Global Single Instance)
│       ├── holidays.ts                # รายการวันหยุดราชการ/วันหยุดนักขัตฤกษ์ และ helper
│       └── line-api.ts                # Helper ส่งข้อความเข้า LINE Messaging API
├── vercel.json                        # ตั้งค่า Cron Job และ PWA Headers
├── package.json
└── handoff.md                         # เอกสารฉบับนี้
```

---

## 4. ฟังก์ชันการทำงานหลัก (Key Features)

ระบบแบ่งหน้าจอหลักออกเป็น 4 แท็บ:

### แท็บที่ 1: บันทึกประจำวัน (Daily Attendance)
* **เลือกวันที่:** สลับดูหรือบันทึกข้อมูลของวันที่ต้องการได้
* **กรอกข้อมูล:** แสดงรายการห้องเรียนทุกชั้น ครูประจำชั้นหรือครูเวรกรอกเพียงจำนวน ป่วย, ลา, ขาด ระบบคำนวณจำนวนที่มาเรียนและร้อยละให้อัตโนมัติ
* **บันทึกครูเวร:** มีช่องให้ครูเวรประจำวันกรอกบันทึกเหตุการณ์ประจำวัน
* **การลงนามของ ผอ.:** เมื่อมีผู้ใช้ที่มีสิทธิ์ `director` ล็อกอิน จะแสดงปุ่ม "ลงนามรับรอง" พร้อมประทับตรายางดิจิทัลและเวลาที่ลงนาม

### แท็บที่ 2: สถิติรายห้อง (Classroom History & Missing Dates)
* **เลือกห้องเรียน:** สลับดูข้อมูลเฉพาะห้องที่สนใจ (อนุบาล 1 ถึง มัธยมศึกษาปีที่ 3)
* **ตัวกรองช่วงเวลา:** ปรับวันที่เริ่มต้น-สิ้นสุดได้ พร้อมปุ่มลัด: *สัปดาห์นี้, เดือนนี้, ภาคเรียนที่ 1, ภาคเรียนที่ 2, ทั้งหมด*
* **⚠️ ระบบตรวจจับวันที่ยังไม่ได้บันทึก (Unrecorded Days):**
  * คำนวณวันเปิดเรียนจริง (หักเสาร์-อาทิตย์, วันหยุดราชการ และวันปิดเทอมออก)
  * แสดงแถบแจ้งเตือนสีส้มด้านบน ระบุชัดเจนว่ามีวันไหนบ้างที่ยังค้างบันทึก
  * มีปุ่มคลิกวันที่ค้างเพื่อเปิดหน้าบันทึกของวันนั้นได้ทันที
  * มีปุ่มกรองสถานะ: **ทั้งหมด**, **⚠️ ยังไม่บันทึก**, **✅ บันทึกแล้ว**
* **ส่งออก Excel รายห้อง:** ดาวน์โหลดประวัติการมาเรียนเฉพาะห้องนั้นเป็นไฟล์ Excel

### แท็บที่ 3: ปฏิทินสถิติ (Calendar View)
* แสดงปฏิทินรายเดือน แสดงสถานะการบันทึกของแต่ละวัน
* ไฮไลต์วันที่มีการบันทึกครบถ้วน และวันที่ยังบันทึกไม่ครบหรือขาดการบันทึก

### แท็บที่ 4: สรุปและรายงาน PDF (Summary & Export)
* แสดงกราฟและสถิติภาพรวมทั้งโรงเรียน
* ปุ่ม **"ดาวน์โหลด Excel"** เพื่อสรุปข้อมูลทั้งโรงเรียน
* ปุ่ม **"พิมพ์รายงาน PDF"** สำหรับพิมพ์หรือบันทึกเป็นไฟล์ PDF รูปแบบราชการ

---

## 5. ฐานข้อมูลและโมเดล (Database Schema)

ใช้ PostgreSQL บน Neon บริหารจัดการผ่าน Prisma ORM โดยมี Model สำคัญดังนี้:

| ตาราง (Model) | ฟิลด์สำคัญ | คำอธิบาย |
| :--- | :--- | :--- |
| **`Classroom`** | `id`, `name`, `code`, `gradeLevel`, `sortOrder`, `defaultMale`, `defaultFemale` | ข้อมูลห้องเรียน ยอดนักเรียนชาย-หญิงเริ่มต้น และลำดับการแสดงผล |
| **`AttendanceRecord`** | `id`, `date`, `classroomId`, `malePresent`, `maleSick`, `maleLeave`, `maleAbsent`, `femalePresent`, ..., `recordedBy` | บันทึกสถิติประจำวันแยกตามห้องและวันที่ |
| **`UserRole`** | `id`, `email`, `role`, `name` | กำหนดบทบาทผู้ใช้ (`admin`, `director`, `teacher`) |
| **`DailyLog`** | `id`, `date`, `notes`, `teacherName`, `directorSignedAt`, `directorName` | สมุดบันทึกครูเวรและการลงนามรับรองของผู้อำนวยการ |
| **`SystemSetting`** | `key`, `value` | การตั้งค่าระบบ เช่น `semester_settings` เก็บวันเปิด-ปิดภาคเรียน |
| **`PushSubscription`** | `id`, `endpoint`, `keysP256dh`, `keysAuth`, `userAgent`, `createdAt` | ข้อมูลการลงทะเบียนรับการแจ้งเตือนผ่าน Web Push ของอุปกรณ์ |

---

## 6. ยอดนักเรียนตั้งต้นปัจจุบัน (Current Student Baseline)

> **ข้อมูลล่าสุด ณ ภาคเรียนปัจจุบัน ปีการศึกษา 2569**
> รวมทั้งโรงเรียน: **78 คน** (ชาย 45 คน, หญิง 33 คน)

| ระดับชั้น | รหัส | ชาย (คน) | หญิง (คน) | รวม (คน) | หมายเหตุการเปลี่ยนแปลงล่าสุด |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **อนุบาลปีที่ 1** | `อ.1` | 1 | 1 | **2** | - |
| **อนุบาลปีที่ 2** | `อ.2` | 1 | 0 | **1** | - |
| **อนุบาลปีที่ 3** | `อ.3` | 3 | 3 | **6** | - |
| **ประถมศึกษาปีที่ 1** | `ป.1` | **6** | 3 | **9** | ปรับเพิ่มนักเรียนชาย 1 คน (เดิม 5) ตั้งแต่ 24 ส.ค. |
| **ประถมศึกษาปีที่ 2** | `ป.2` | 4 | **1** | **5** | ปรับเพิ่มนักเรียนหญิง 1 คน (เดิม 0) ตั้งแต่ 24 ส.ค. |
| **ประถมศึกษาปีที่ 3** | `ป.3` | 4 | 2 | **6** | - |
| **ประถมศึกษาปีที่ 4** | `ป.4` | 7 | 1 | **8** | - |
| **ประถมศึกษาปีที่ 5** | `ป.5` | 3 | 4 | **7** | - |
| **ประถมศึกษาปีที่ 6** | `ป.6` | 3 | 3 | **6** | - |
| **มัธยมศึกษาปีที่ 1** | `ม.1` | 4 | **4** | **8** | ปรับลดนักเรียนหญิง 1 คน (เดิม 5) ตั้งแต่ 17 ส.ค. |
| **มัธยมศึกษาปีที่ 2** | `ม.2` | 7 | 8 | **15** | - |
| **มัธยมศึกษาปีที่ 3** | `ม.3` | 2 | 3 | **5** | - |
| **รวมทั้งสิ้น** | | **45** | **33** | **78** | |

---

## 7. ระบบแจ้งเตือนอัตโนมัติ (Notifications & Cron Jobs)

### 7.1 รอบเวลาการทำงาน
* **เวลา:** ทุกวันจันทร์ - ศุกร์ เวลา **15:00 น.** (บ่าย 3 โมงตรง ประเทศไทย)
* **การตั้งค่า Cron บน Vercel (`vercel.json`):**
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/report",
        "schedule": "0 8 * * 1-5"
      }
    ]
  }
  ```
  *(หมายเหตุ: เซิร์ฟเวอร์ Vercel รันเวลา UTC ดังนั้น 08:00 UTC = 15:00 น. ประเทศไทย)*

### 7.2 เงื่อนไขการส่งข้อความ
* **ตรวจสอบวันหยุด:** หากวันดังกล่าวตรงกับวันหยุดราชการ (อ้างอิงจาก `src/lib/holidays.ts`) ระบบจะไม่ส่งข้อความ
* **ตรวจสอบวันปิดเทอม:** หากอยู่นอกช่วงเวลาเปิดเทอม (อ้างอิงจาก `SystemSetting: semester_settings`) ระบบจะไม่ส่งข้อความ
* **การทดสอบ (Manual Force):** ผู้ดูแลระบบสามารถกดปุ่มทดสอบส่งผ่านหน้า `/admin` ได้ ระบบจะแนบ `?force=true` เพื่อข้ามการตรวจสอบวันหยุด

### 7.3 เนื้อหาข้อความสรุปประจำวัน
* รายงานจำนวนนักเรียน มาเรียน / ขาด / ลา / ป่วย คิดเป็นร้อยละ
* รายชื่อห้องเรียนที่บันทึกครบถ้วนแล้ว
* **ระบุชั้นเรียนที่ยังไม่ได้บันทึก** เพื่อเตือนให้ครูประจำชั้นเข้ามาลงข้อมูล

---

## 8. ตัวแปรสภาพแวดล้อม (Environment Variables)

ต้องตั้งค่าในไฟล์ `.env` (สำหรับการพัฒนาในเครื่อง) และใน **Vercel Dashboard > Settings > Environment Variables** (สำหรับ Production):

```env
# ===================================================
# 1. ฐานข้อมูล (PostgreSQL / Neon)
# ===================================================
DATABASE_URL="postgresql://neondb_owner:npg_...@ep-blue-meadow-aokhxxp1-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# ===================================================
# 2. การยืนยันตัวตน (NextAuth.js)
# ===================================================
NEXTAUTH_URL="https://nbm-stats.vercel.app"
NEXTAUTH_SECRET="your-generated-nextauth-secret"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ===================================================
# 3. Vercel Cron Authentication
# ===================================================
CRON_SECRET="your-cron-secret-key"

# ===================================================
# 4. LINE Messaging API
# ===================================================
LINE_CHANNEL_ACCESS_TOKEN="your-channel-access-token"
LINE_CHANNEL_SECRET="your-channel-secret"
LINE_GROUP_ID="Ccb4c37006d5f40c2e174341b02113450"

# ===================================================
# 5. Web Push Notification (VAPID Keys)
# ===================================================
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BAfWVPK1kc_VvUeDdXEbDHPcLmyJlxQ6M8tF4U-Znr5THVsCVZk1DH-QJOazqplfr7kD0x4zuHLCKkvsjfZIbfo"
VAPID_PRIVATE_KEY="PPmvBR_gdpANF0msLospZkWDC5eCTJ6vygftItpKSsE"
```

---

## 9. คู่มือการติดตั้งและรันระบบ (Setup & Deployment Runbook)

### 9.1 ความต้องการขั้นต่ำของระบบ
* **Node.js:** v20 หรือ v22 ขึ้นไป หรือ **Bun** (แนะนำ Bun v1.3+ ทำงานได้รวดเร็ว)
* **Git**
* บัญชี **Neon.tech** (PostgreSQL) และ **Vercel**

### 9.2 ขั้นตอนการโคลนและติดตั้ง Local Development
```bash
# 1. โคลน Repository
git clone https://github.com/paigalaxzy-creator/nbm-stats.git
cd nbm-stats

# 2. ติดตั้ง Dependencies
bun install
# หรือ npm install

# 3. สร้างไฟล์ .env แล้วใส่ค่าตามหัวข้อที่ 8
cp .env.example .env

# 4. อัปเดตโครงสร้างฐานข้อมูลและสร้าง Prisma Client
bun run db:push
bun run db:generate

# 5. รันโปรเจกต์ในโหมด Development
bun run dev
# เปิดเบราว์เซอร์ไปที่ http://localhost:3000
```

### 9.3 การ Deploy ขึ้น Vercel
โปรเจกต์เชื่อมโยงกับ Vercel อยู่แล้วผ่าน Git เมื่อ Push โค้ดเข้ากิ่ง `main` ระบบจะทำการ Build และ Deploy อัตโนมัติ:
```bash
git add .
git commit -m "feat: your message"
git push origin main
```

---

## 10. คู่มือการดูแลและบำรุงรักษาระบบ (Maintenance & Common Tasks)

### 10.1 เมื่อมีนักเรียนย้ายเข้าหรือย้ายออก (ปรับยอดตั้งต้น)
หากต้องการเปลี่ยนยอดนักเรียนเริ่มต้นของห้องเรียนใดๆ (เพื่อให้การบันทึกวันถัดไปดึงยอดใหม่เสมอ):

**วิธีที่ 1: ผ่านหน้าจอผู้ดูแลระบบ (`/admin`)**
* เข้าสู่ระบบด้วยอีเมลที่เป็น `admin`
* ไปที่เมนู **ผู้ดูแลระบบ** > แท็บ **จัดการห้องเรียน**
* ปรับเปลี่ยนจำนวน ชาย / หญิง แล้วกดบันทึก

**วิธีที่ 2: รันคำสั่งผ่านสคริปต์ (CLI)**
```bash
# ตัวอย่าง: ปรับห้อง ป.1 นักเรียนชายเป็น 6 คน
bun -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function main() { await prisma.classroom.updateMany({ where: { code: 'ป.1' }, data: { defaultMale: 6 } }); console.log('Updated!'); } main().catch(console.error).finally(() => prisma['\$disconnect']());"
```

### 10.2 การตั้งค่าวันเปิด-ปิดภาคเรียนใหม่
เมื่อขึ้นปีการศึกษาใหม่ หรือขึ้นเทอมใหม่:
1. เข้าไปที่หน้า `/admin` ด้วยบัญชีแอดมิน
2. ไปที่แท็บ **ตั้งค่าภาคเรียน**
3. ระบุ:
   * ปีการศึกษา (เช่น `2569`)
   * วันที่เริ่มต้นและสิ้นสุดของ **ภาคเรียนที่ 1**
   * วันที่เริ่มต้นและสิ้นสุดของ **ภาคเรียนที่ 2**
4. กด **"บันทึกการตั้งค่า"**
5. ระบบจะใช้วันที่เหล่านี้ในการตรวจจับวันเปิดเรียน และระงับการแจ้งเตือนช่วงปิดเทอมโดยอัตโนมัติ

### 10.3 การแต่งตั้งหรือปรับเปลี่ยนสิทธิ์ผู้ใช้งาน (Roles)
* เข้าไปที่หน้า `/admin` > แท็บ **จัดการผู้ใช้งาน**
* สามารถปรับสิทธิ์ผู้ใช้ตามบทบาท:
  * `admin`: จัดการระบบทั้งหมด, เข้าหน้า Admin, ตั้งค่าเปิดปิดเทอม, ทดสอบส่งแจ้งเตือน
  * `director`: สิทธิ์สำหรับผู้อำนวยการ สามารถกด **"ลงนามรับรอง"** ในสมุดบันทึกประจำวันของครูเวรได้
  * `teacher`: สิทธิ์เริ่มต้นสำหรับคุณครู สามารถบันทึกและแก้ไขข้อมูลสถิตินักเรียน

---

## 11. การแก้ไขปัญหาที่พบบ่อย (Troubleshooting & FAQ)

### Q1: LINE ไม่ส่งแจ้งเตือนในเวลา 15:00 น.
* **สาเหตุที่ 1:** วันดังกล่าวเป็นวันหยุดราชการหรือวันปิดเทอม ให้ตรวจสอบใน `src/lib/holidays.ts` หรือการตั้งค่าในหน้า `/admin`
* **สาเหตุที่ 2:** Vercel Cron Secret ไม่ตรงกัน ให้ตรวจสอบตัวแปร `CRON_SECRET`
* **สาเหตุที่ 3:** โควตาข้อความ LINE Messaging API ของเดือนนั้นเต็ม (โควตาฟรี 200 ข้อความ/เดือน)
* **วิธีทดสอบ:** เข้าหน้า `/admin` แล้วกดปุ่มทดสอบส่งแจ้งเตือน ดูการตอบกลับใน Network หรือ Console Logs

### Q2: ฐานข้อมูลขึ้นข้อความ Error Connection Timeout / Pool Exhausted
* เนื่องจากใช้งาน Neon Serverless Postgres ต้องแน่ใจว่าใช้ Connection String ที่มีพารามิเตอร์ `-pooler` ในโฮสต์เนม (เช่น `ep-blue-meadow-aokhxxp1-pooler...`) เพื่อให้รองรับ Connection Pooling ในสถาปัตยกรรม Serverless

### Q3: ครูประจำชั้นกดปุ่มบันทึกไม่ได้ หรือกดแล้วไม่บันทึก
* ตรวจสอบว่าครูได้ทำการเข้าสู่ระบบ (Login) ผ่าน Google หรือยัง ผู้ใช้ที่ยังไม่ได้ล็อกอินจะไม่สามารถกดบันทึกหรือแก้ไขสถิติได้

### Q4: การเพิ่มวันหยุดนักขัตฤกษ์ประจำปีใหม่
* สามารถเข้าไปเพิ่มวันที่ในอาร์เรย์ `HOLIDAYS` ที่ไฟล์ [`src/lib/holidays.ts`](file:///c:/Users/paiga/Ai/nbm-stats/src/lib/holidays.ts) ในรูปแบบ `"YYYY-MM-DD"` แล้ว Push ขึ้น Repository

---

**ผู้จัดทำเอกสาร:** ทีมพัฒนาระบบ NBM Stats  
**วันที่ปรับปรุงล่าสุด:** พฤศจิกายน 2569  
**สถานะระบบ:** ใช้งานจริง (Production Ready)
