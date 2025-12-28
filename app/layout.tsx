// app/layout.tsx
import type { Metadata } from "next";
import { Cinzel, Playfair_Display } from "next/font/google"; // Import font
import "./globals.css";

// Font cho tiêu đề lớn (Sang trọng, mạnh mẽ)
const cinzel = Cinzel({ 
  subsets: ["latin-ext"],
  variable: "--font-cinzel",
  weight: ["400", "700"],
});

// Font cho nội dung thiệp (Mềm mại, cổ điển)
const playfair = Playfair_Display({
  subsets: ["latin-ext"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Thiệp Tốt Nghiệp 2025",
  description: "Trân trọng kính mời tham dự",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${cinzel.variable} ${playfair.variable} bg-[#050505]`}>
        {children}
      </body>
    </html>
  );
}