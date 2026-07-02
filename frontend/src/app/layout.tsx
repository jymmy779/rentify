import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from "@/context/NotificationContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import AppLayout from "@/components/AppLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rentify - Hệ thống Quản lý Lưu trú & Cho thuê chuyên nghiệp",
  description: "Quản lý homestay, villa, căn hộ, lịch đặt, giá thuê và cọc trơn tru nhất",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.className} antialiased`}>
        <NotificationProvider>
          <AuthProvider>
            <ThemeProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </ThemeProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
