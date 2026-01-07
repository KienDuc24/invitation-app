"use client";
import { QRCodeSVG } from 'qrcode.react';
import { forwardRef } from 'react';

interface InviteProps {
  guestName: string;
  guestUrl: string;
  eventName?: string;
  timeInfo?: string;
  locationInfo?: string;
}

const InviteCardTemplate = forwardRef<HTMLDivElement, InviteProps>(
  ({ guestName, guestUrl, eventName = "Lễ Tốt Nghiệp", timeInfo = "", locationInfo = "Hà Nội" }, ref) => {
  return (
    <div 
      ref={ref}
      className="w-[800px] h-[450px] bg-[#050505] text-white relative flex flex-row overflow-hidden font-sans shadow-2xl"
      style={{ backgroundImage: `radial-gradient(circle at 30% 50%, #1a1a1a 0%, #000 100%)` }}
    >
      {/* --- PHẦN TRÁI (NỘI DUNG CHÍNH) --- */}
      <div className="flex-1 p-10 flex flex-col justify-between relative z-10">
        {/* Decor góc */}
        <div className="absolute top-6 left-6 w-16 h-16 border-t-2 border-l-2 border-[#d4af37]/50" />
        <div className="absolute bottom-6 left-6 w-16 h-16 border-b-2 border-l-2 border-[#d4af37]/50" />

        <div>
            <h3 className="text-[#d4af37] text-lg uppercase tracking-[0.4em] font-bold mb-2">Lời mời tham dự</h3>
            <h1 
              className="text-3xl font-black text-white uppercase leading-tight line-clamp-2"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", textTransform: 'uppercase' }}
            >
                {eventName}
            </h1>
        </div>

        <div className="py-4">
            <p className="text-gray-400 text-sm italic mb-1">Trân trọng kính mời:</p>
            {/* Tên khách - Phần quan trọng nhất - scale font nếu tên dài */}
            <p 
              className={`text-[#fadd7d] font-bold tracking-wide ${guestName.length > 20 ? 'text-2xl' : guestName.length > 15 ? 'text-3xl' : 'text-4xl'}`}
              style={{ fontFamily: "'Segoe UI', 'Trebuchet MS', sans-serif", fontVariantLigatures: 'no-common', letterSpacing: '0.05em' }}
            >
                {guestName}
            </p>
        </div>

        <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Thời gian & Địa điểm</p>
            <p className="text-sm font-bold text-white">{timeInfo || "Xem chi tiết"} | {locationInfo}</p>
        </div>
      </div>

      {/* --- PHẦN PHẢI (QR CODE & CẮT VÉ) --- */}
      <div className="w-[280px] bg-[#111] border-l border-dashed border-[#333] flex flex-col items-center justify-center p-6 relative">
        {/* Vết cắt bán nguyệt trang trí */}
        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-[#050505]" />
        <div className="absolute -left-3 bottom-0 w-6 h-6 rounded-full bg-[#050505]" />

        <div className="bg-white p-3 rounded-xl mb-4">
            <QRCodeSVG 
                value={guestUrl} 
                size={140} 
                level={"H"}
                bgColor="#ffffff"
                fgColor="#000000"
            />
        </div>
        
        <p className="text-[10px] text-gray-500 uppercase text-center tracking-wider mb-1">Quét mã check-in</p>
        <p className="text-[#d4af37] font-bold text-sm tracking-widest">INVITATION</p>
      </div>
    </div>
  );
});

InviteCardTemplate.displayName = "InviteCardTemplate";
export default InviteCardTemplate;
