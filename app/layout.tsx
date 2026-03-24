import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GV80",
  description: "Brandon Car - Smart 차계부",
  icons: {
    icon: "/icon.jpg", // app 폴더에 넣은 파일명과 일치해야 합니다.
  },
  // 안드로이드 및 기타 모바일 기기를 위한 설정
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GV80 차계부",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
