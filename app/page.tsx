// app/page.tsx
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#050505] text-center font-sans">
      <div className="relative z-10 p-8 border border-[#d4af37]/20 rounded-2xl bg-[#d4af37]/5 backdrop-blur-sm max-w-md w-full">
        
        {/* Decor góc */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />

        <Sparkles className="w-12 h-12 text-[#d4af37] mx-auto mb-6 animate-pulse" />
        
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fadd7d] to-[#aa8e26] mb-4 uppercase tracking-widest">
          Lễ Tốt Nghiệp 2026
        </h1>
        
        <div className="h-[1px] w-20 bg-[#d4af37]/30 mx-auto my-6" />
        
        <p className="text-gray-400 mb-6 font-light">
          Vui lòng truy cập bằng <span className="text-white font-medium">đường dẫn riêng</span> được gửi trong thiệp mời của bạn.
        </p>

        <p className="text-xs text-[#d4af37]/50 uppercase tracking-[0.2em]">
          Bùi Đức Kiên
        </p>
      </div>
    </main>
  );
}