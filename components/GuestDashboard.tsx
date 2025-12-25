"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ImagePlus, Send, MessageCircle, MapPin, Ticket, Loader2, HeartHandshake } from "lucide-react";
import MobileInvitation from "@/components/3d/InvitationCard";
import ChatGroup from "@/components/ChatGroup"; 

interface DashboardProps {
  guest: any;
}

export default function GuestDashboard({ guest }: DashboardProps) {
  // ✅ ĐÃ FIX: Khai báo đủ 3 trạng thái tab
  const [activeTab, setActiveTab] = useState<'wish' | 'chat' | 'card'>('wish');
  
  // --- STATE CHO LƯU BÚT (CONFESSION) ---
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HÀM GỬI LƯU BÚT & UPLOAD ẢNH ---
  const handleSendConfession = async () => {
    if (!content && !file) return;
    setUploading(true);

    try {
      let publicUrl = null;

      // 1. Upload ảnh lên Supabase Storage (nếu có)
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${guest.id}_${Date.now()}.${fileExt}`;

        // Upload vào bucket 'invitation-media'
        const { error: uploadError } = await supabase.storage
          .from('invitation-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        // Lấy link ảnh công khai
        const res = supabase.storage.from('invitation-media').getPublicUrl(fileName);
        publicUrl = res.data.publicUrl;
      }

      // 2. Lưu nội dung vào bảng 'confessions'
      const { error: dbError } = await supabase
        .from('confessions')
        .insert({
          guest_id: guest.id,
          content: content,
          image_url: publicUrl
        });

      if (dbError) throw dbError;

      // 3. Reset form khi thành công
      setSent(true);
      setContent("");
      setFile(null);

    } catch (error: any) {
      console.error("Lỗi gửi:", error);
      alert("Lỗi: " + (error.message || "Không thể gửi. Hãy thử lại!"));
    } finally {
      setUploading(false);
    }
  };

  // --- MÀN HÌNH 1: XEM THIỆP 3D (Full màn hình) ---
  if (activeTab === 'card') {
    return (
      <div className="relative w-full h-[100dvh] bg-black">
        {/* Component Thiệp 3D */}
        <MobileInvitation 
           guestName={guest.name} 
           guestId={guest.id} 
           isConfirmed={true} 
           initialAttendance={guest.attendance} 
           initialWish={guest.wish}
           // 👇 TRUYỀN HÀM CHUYỂN TAB VÀO ĐÂY ĐỂ MENU TRONG THIỆP HOẠT ĐỘNG
           onTabChange={(tab) => setActiveTab(tab)}
        />
      </div>
    );
  }

  // --- MÀN HÌNH 2: SOCIAL DASHBOARD (Lưu bút & Chat) ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <div className="p-6 pt-12 bg-gradient-to-b from-[#1a1a1a] to-transparent sticky top-0 z-40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
           <div>
             <h1 className="text-2xl font-bold text-[#d4af37]">Xin chào, {guest.name}</h1>
             <p className="text-gray-400 text-xs mt-1">Chào mừng bạn đến với Social Hub</p>
           </div>
           <div className="px-3 py-1 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full text-[#d4af37] text-[10px] font-bold uppercase tracking-wider">
              {guest.tags && guest.tags[0] ? guest.tags[0] : "Khách Quý"}
           </div>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH */}
      <div className="px-4 max-w-lg mx-auto">
        
        {/* === TAB LƯU BÚT === */}
        {activeTab === 'wish' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Form Gửi */}
            <div className="bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
               {/* Họa tiết nền */}
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>

               <h2 className="text-[#fadd7d] font-bold uppercase tracking-widest text-xs flex items-center gap-2 relative z-10">
                 <HeartHandshake size={16}/> Gửi lưu bút / Ảnh kỷ niệm
               </h2>
               
               {sent ? (
                 <div className="py-10 text-center animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                        <Send className="text-green-500" size={24} />
                    </div>
                    <p className="font-bold text-green-500 mb-2">Đã gửi thành công! ❤️</p>
                    <p className="text-xs text-gray-500 mb-4">Cảm ơn những lời chúc tốt đẹp của bạn.</p>
                    <button 
                        onClick={() => setSent(false)} 
                        className="text-xs font-bold text-[#d4af37] underline hover:text-white transition-colors"
                    >
                        Gửi thêm tin khác
                    </button>
                 </div>
               ) : (
                 <div className="relative z-10 space-y-4">
                   <textarea 
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
                     placeholder="Viết vài dòng tâm sự, gửi ảnh kỷ niệm cho mình nhé..."
                     className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-4 text-sm min-h-[120px] focus:border-[#d4af37] focus:outline-none transition-colors text-gray-300 placeholder:text-gray-700 resize-none"
                   />
                   
                   {/* Preview Ảnh */}
                   {file && (
                     <div className="relative rounded-xl overflow-hidden border border-[#333] group">
                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <button 
                            onClick={() => setFile(null)} 
                            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500/80 transition-colors"
                        >
                            <Loader2 size={16} className="rotate-45" />
                        </button>
                     </div>
                   )}

                   <div className="flex gap-3">
                      {/* Nút Chọn Ảnh */}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-3 bg-[#222] rounded-xl border border-[#333] text-gray-400 flex items-center justify-center gap-2 hover:bg-[#333] hover:text-white transition-all active:scale-95"
                      >
                        <ImagePlus size={18} /> <span className="text-xs font-bold">Thêm ảnh</span>
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        hidden 
                        accept="image/*" 
                        onChange={(e) => e.target.files && setFile(e.target.files[0])}
                      />
                      
                      {/* Nút Gửi */}
                      <button 
                        onClick={handleSendConfession}
                        disabled={uploading || (!content && !file)}
                        className="flex-[2] py-3 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all active:scale-95"
                      >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        <span className="text-xs uppercase tracking-wider">{uploading ? "Đang gửi..." : "Gửi ngay"}</span>
                      </button>
                   </div>
                 </div>
               )}
            </div>

            {/* AI Assistant (Teaser) */}
            <div className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
                <div className="bg-purple-500/20 p-3 rounded-full relative z-10"><MapPin className="text-purple-400" size={20} /></div>
                <div className="relative z-10">
                  <h3 className="text-purple-200 font-bold text-sm">Trợ lý AI (Sắp ra mắt)</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Hỏi đường, tìm chỗ đậu xe, lịch trình buổi lễ...</p>
                </div>
            </div>
          </div>
        )}

        {/* === TAB TRÒ CHUYỆN === */}
        {activeTab === 'chat' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-6">
                 <h2 className="text-[#fadd7d] font-bold uppercase tracking-widest text-sm mb-1">
                     Kênh Chat Riêng
                 </h2>
                 <p className="text-[11px] text-gray-500">
                     Nhóm: <span className="text-white font-bold bg-[#333] px-2 py-0.5 rounded text-[10px] mx-1">#{guest.tags?.[0] || 'Chung'}</span>
                 </p>
              </div>
              <ChatGroup currentUser={guest} groupTag={guest.tags?.[0] || 'general'} />
           </div>
        )}
      </div>

      {/* === THANH ĐIỀU HƯỚNG DƯỚI CÙNG (FOOTER) === */}
      <div className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-[#111]/90 backdrop-blur-xl border border-[#333] rounded-2xl p-2 flex justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-md mx-auto">
            <NavButton 
                active={activeTab === 'wish'} 
                icon={<Ticket size={20} />} 
                label="Lưu bút" 
                onClick={() => setActiveTab('wish')} 
            />
            <NavButton 
                active={activeTab === 'chat'} 
                icon={<MessageCircle size={20} />} 
                label="Trò chuyện" 
                onClick={() => setActiveTab('chat')} 
            />
            <NavButton 
                active={activeTab === 'card'} 
                icon={<ImagePlus size={20} />} 
                label="Xem thiệp" 
                onClick={() => setActiveTab('card')} 
            />
        </div>
      </div>

    </div>
  );
}

// --- Component Nút Điều Hướng ---
interface NavButtonProps {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

function NavButton({ active, icon, label, onClick }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 ${
          active 
          ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20 translate-y-[-2px]' 
          : 'text-gray-500 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}