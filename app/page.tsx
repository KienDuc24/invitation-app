"use client";

import { useEffect, useState } from "react";
import Invitation3D from "@/components/3d/InvitationCard";
import { useRouter } from "next/navigation";

export default function Home() {
  const [guestName, setGuestName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 1. Kiểm tra xem đã đăng nhập chưa
    const name = localStorage.getItem("guest_name");
    
    if (!name) {
      // Nếu chưa có tên -> Đá về trang login
      router.push("/login");
    } else {
      setGuestName(name);
    }
  }, [router]);

  // Nếu chưa load xong tên thì hiện màn hình đen (hoặc loading)
  if (!guestName) return <div className="min-h-screen bg-black" />;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <div className="z-10 max-w-5xl w-full flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 font-cinzel tracking-widest uppercase relative z-10">
          <span className="bg-gradient-to-b from-[#ffd700] via-[#f0e68c] to-[#b8860b] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">
            Lễ Tốt Nghiệp
          </span>
        </h1>
        
        {/* Khung chứa thiệp 3D */}
        <div className="w-full max-w-3xl border border-white/10 rounded-xl p-1 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-sm shadow-[0_0_50px_-10px_rgba(255,215,0,0.3)]">
          {/* Truyền tên thật vào thiệp */}
          <Invitation3D guestName={guestName} />
        </div>

        <div className="mt-8 text-center text-gray-400 animate-pulse">
          <p className="text-sm">Chào mừng, {guestName}</p>
          <p className="text-xs mt-2 opacity-50">Di chuột hoặc xoay điện thoại để xem thiệp</p>
        </div>
      </div>
    </main>
  );
}