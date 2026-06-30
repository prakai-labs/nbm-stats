import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ServiceWorkerRegister } from "@/components/attendance/sw-register";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://nbm-stats.vercel.app"),
  title: "สถิตินักเรียนประจำวัน | โรงเรียนบ้านหนองบัวโนนเมือง",
  description:
    "ระบบบันทึกและสรุปสถิตินักเรียนประจำวัน โรงเรียนบ้านหนองบัวโนนเมือง — กรอกจำนวนนักเรียนชาย/หญิง และจำนวนที่ป่วย/ลา/ขาด ระบบคำนวณจำนวนที่มาให้เอง รองรับการใช้งานพร้อมกันหลายคนแบบเรียลไทม์",
  keywords: [
    "สถิตินักเรียน",
    "โรงเรียนบ้านหนองบัวโนนเมือง",
    "การเข้าเรียน",
    "ระบบบันทึก",
    "Thai school attendance",
    "PWA",
  ],
  authors: [{ name: "โรงเรียนบ้านหนองบัวโนนเมือง" }],
  manifest: "/manifest.json",
  applicationName: "สถิตินักเรียน บนม.",
  appleWebApp: {
    capable: true,
    title: "สถิตินักเรียน",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-512.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/icons/icon-192.png"],
  },
  openGraph: {
    title: "สถิตินักเรียนประจำวัน | โรงเรียนบ้านหนองบัวโนนเมือง",
    description: "ระบบบันทึกสถิตินักเรียนประจำวัน รองรับ multi-user real-time + PWA",
    type: "website",
    locale: "th_TH",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#047857" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={`${sarabun.variable} font-sans antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-sarabun), system-ui, sans-serif" }}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <SonnerToaster position="top-center" richColors />
            <ServiceWorkerRegister />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
