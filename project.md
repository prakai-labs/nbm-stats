# NBM Stats - ระบบบันทึกสถิติการมาเรียนประจำวัน

**NBM Stats** เป็นระบบ Web Application สำหรับบันทึกและจัดการสถิติการมาเรียนของนักเรียน ออกแบบมาเพื่อช่วยให้ครูสามารถบันทึกข้อมูลการเข้าเรียน ขาด ลา มาสาย ได้อย่างสะดวก และมีระบบแจ้งเตือนผ่าน LINE อัตโนมัติ

## 🛠 Tech Stack (เทคโนโลยีที่ใช้)
- **Framework:** [Next.js](https://nextjs.org/) (App Router, Server Components)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Database ORM:** [Prisma](https://www.prisma.io/)
- **Database:** [PostgreSQL (Neon)](https://neon.tech/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/) (Google OAuth)
- **Deployment & Cron Jobs:** [Vercel](https://vercel.com)
- **Integration:** [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/) (LINE Notify & Webhook)

## 📌 Core Features (ฟีเจอร์หลัก)

### 1. ระบบบันทึกสถิติการมาเรียน (Daily Attendance)
- ฟอร์มบันทึกข้อมูลแยกตามระดับชั้น (ปัจจุบันรองรับ ม.1, ม.2, ม.3 โดยไม่มีห้องทับ)
- บันทึกจำนวนนักเรียนทั้งหมด, มาเรียน, ขาด, ลา, ป่วย, มาสาย และกิจกรรม
- ตรวจสอบความถูกต้องของข้อมูล (Validation) เช่น จำนวนนักเรียนรวมต้องตรงกับจำนวนนักเรียนทั้งหมด

### 2. ระบบแจ้งเตือนอัตโนมัติ (Automated LINE Notifications)
ทำงานผ่าน **Vercel Cron Jobs** และเช็คตรรกะวันหยุด
- **แจ้งเตือนให้บันทึกข้อมูล (08:00 น.):** ส่งข้อความเตือนเข้ากลุ่ม LINE หากยังมีชั้นเรียนที่ยังไม่ได้บันทึกข้อมูล
- **สรุปผลประจำวัน (14:00 น.):** ส่งรายงานสรุปยอดการมาเรียนของทั้งโรงเรียนเข้ากลุ่ม LINE พร้อมระบุชื่อชั้นที่ยังไม่ได้รายงาน (หากมี)
- **ระบบคัดกรองวันหยุด (Holiday Filter):** ระบบจะคำนวณวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์ หากตรงกับวันหยุด ระบบจะข้ามการส่งแจ้งเตือนอัตโนมัติ (`src/lib/holidays.ts`)

### 3. แดชบอร์ดสรุปผลและสถิติ (Reports & Analytics)
- **Daily Log:** ดูสรุปยอดประจำวันของแต่ละชั้นเรียน
- **Calendar View:** ดูสถิติการมาเรียนในรูปแบบปฏิทิน
- **Trends Chart:** แสดงกราฟแนวโน้มการมาเรียนย้อนหลัง
- **History Table:** ตารางแสดงประวัติการบันทึกข้อมูลทั้งหมด

### 4. การจัดการสิทธิ์ผู้ใช้ (Authentication & Authorization)
- ล็อกอินเข้าสู่ระบบอย่างปลอดภัยด้วยบัญชี Google
- ระบบตรวจเช็คสิทธิ์ (Admin / Authorized Emails) เพื่อจำกัดการเข้าถึงข้อมูล

### 5. การส่งออกข้อมูล (Export)
- รองรับการสร้างและพิมพ์รายงาน (PDF)
- รองรับการ Export ข้อมูลในรูปแบบ Excel (`/api/export-excel`)

## 📂 Project Structure (โครงสร้างโปรเจกต์)
```text
src/
├── app/                  # Next.js App Router (Pages & Layouts)
│   ├── api/              # API Routes (Attendance, LINE Webhook, Cron Jobs, Auth)
│   │   ├── cron/         # Vercel Cron Jobs (remind, report)
│   │   ├── line-notify/  # LINE API Handlers
│   │   └── ...
│   ├── admin/            # Admin Panel
│   └── login/            # Login Page
├── components/           # React Components
│   ├── attendance/       # ส่วนประกอบสำหรับระบบบันทึกและแสดงผลสถิติ
│   ├── auth/             # ปุ่ม Login และ User Menu
│   ├── ui/               # shadcn/ui components (ปุ่ม, ฟอร์ม, กราฟ, ฯลฯ)
│   └── providers/        # Context Providers (NextAuth, React Query)
├── hooks/                # Custom React Hooks
├── lib/                  # Utilities และ Configuration
│   ├── auth.ts           # NextAuth Configuration
│   ├── db.ts             # Prisma Client
│   ├── holidays.ts       # ตรรกะวันหยุดราชการ
│   ├── line-api.ts       # ฟังก์ชันเชื่อมต่อ LINE Messaging API
│   └── utils.ts          # Helper functions
└── types/                # TypeScript type definitions
```

## 🚀 Deployment
โปรเจกต์นี้ถูกตั้งค่าให้ Deploy บน **Vercel** โดยมีการใช้:
- **`vercel.json`**: ตั้งค่า Vercel Cron Jobs และกำหนด Framework เป็น `nextjs`
- **Environment Variables**: จัดการค่า Secret ต่างๆ เช่น `DATABASE_URL`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `LINE_CHANNEL_ACCESS_TOKEN` เป็นต้น
