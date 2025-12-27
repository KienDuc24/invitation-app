"use client";

import MobileInvitation from "@/components/3d/InvitationCard";
import ChatGroup from "@/components/ChatGroup";
import NetworkSection from "@/components/NetworkSection"; 
import { supabase } from "@/lib/supabase";
import { ArrowLeft, HeartHandshake, ImagePlus, Loader2, MapPin, MessageCircle, Send, Ticket, Users } from "lucide-react";
import { useRef, useState } from "react";

interface DashboardProps {
  guest: any;
}

export default function GuestDashboard({ guest }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'wish' | 'chat' | 'card'>('wish');
  
  // State quản lý nhóm chat đang mở (null = đang ở màn hình danh sách)
  const [selectedGroupTag, setSelectedGroupTag] = useState<string | null>(null);

  // --- STATE CHO LƯU BÚT ---
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HÀM GỬI LƯU BÚT ---
  const handleSendConfession = async () => {
    if (!content && !file) return;
    setUploading(true);

    try {
      let publicUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${guest.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('invitation-media').upload(fileName, file);
        if (uploadError) throw uploadError;
        const res = supabase.storage.from('invitation-media').getPublicUrl(fileName);
        publicUrl = res.data.publicUrl;
      }

      const { error: dbError } = await supabase.from('confessions').insert({
          guest_id: guest.id,
          content: content,
          image_url: publicUrl
        });

      if (dbError) throw dbError;
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

  // --- HÀM XỬ LÝ KHI THÊM THÀNH VIÊN (MOCKUP) ---
  const handleAddMember = (personId: string, personName: string) => {
      // Logic thực tế: Gọi API insert vào bảng chat_group_members
      alert(`Đã gửi lời mời cho ${personName}! (Tính năng đang phát triển)`);
  };

  // --- MÀN HÌNH 1: XEM THIỆP 3D ---
  if (activeTab === 'card') {
    return (
      <div className="relative w-full h-[100dvh] bg-black">
        <MobileInvitation 
           guestName={guest.name} 
           guestId={guest.id} 
           isConfirmed={true} 
           initialAttendance={guest.attendance} 
           initialWish={guest.wish}
           onTabChange={(tab) => setActiveTab(tab as 'wish' | 'chat' | 'card')}
        />
      </div>
    );
  }

  // --- MÀN HÌNH 2: DASHBOARD CHÍNH ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <div className="p-6 pt-12 bg-gradient-to-b from-[#1a1a1a] to-transparent sticky top-0 z-40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
           <div>
             <h1 className="text-2xl font-bold text-[#d4af37]">Xin chào, {guest.name}</h1>
             <p className="text-gray-400 text-xs mt-1">Social Hub</p>
           </div>
           <div className="px-3 py-1 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full text-[#d4af37] text-[10px] font-bold uppercase tracking-wider">
              {guest.tags && guest.tags[0] ? guest.tags[0] : "Khách Quý"}
           </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto">
        
        {/* === TAB LƯU BÚT (Giữ nguyên) === */}
        {activeTab === 'wish' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
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
                    <button onClick={() => setSent(false)} className="text-xs font-bold text-[#d4af37] underline">Gửi thêm tin khác</button>
                 </div>
               ) : (
                 <div className="relative z-10 space-y-4">
                   <textarea 
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
                     placeholder="Viết vài dòng tâm sự..."
                     className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-4 text-sm min-h-[120px] focus:border-[#d4af37] focus:outline-none text-gray-300 resize-none"
                   />
                   
                   {file && (
                     <div className="relative rounded-xl overflow-hidden border border-[#333] group">
                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-48 object-cover opacity-80" />
                        <button onClick={() => setFile(null)} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white"><Loader2 size={16} className="rotate-45" /></button>
                     </div>
                   )}

                   <div className="flex gap-3">
                     <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-[#222] rounded-xl border border-[#333] text-gray-400 flex items-center justify-center gap-2">
                       <ImagePlus size={18} /> <span className="text-xs font-bold">Ảnh</span>
                     </button>
                     <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
                     <button onClick={handleSendConfession} disabled={uploading || (!content && !file)} className="flex-[2] py-3 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                       {uploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                       <span className="text-xs uppercase tracking-wider">{uploading ? "Đang gửi..." : "Gửi ngay"}</span>
                     </button>
                   </div>
                 </div>
               )}
            </div>

            <div className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-2xl p-5 flex items-center gap-4">
                <div className="bg-purple-500/20 p-3 rounded-full"><MapPin className="text-purple-400" size={20} /></div>
                <div>
                  <h3 className="text-purple-200 font-bold text-sm">Trợ lý AI (Sắp ra mắt)</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Hỏi đường, tìm chỗ đậu xe...</p>
                </div>
            </div>
          </div>
        )}

        {/* === TAB CHAT (ĐÃ NÂNG CẤP) === */}
        {activeTab === 'chat' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
              
              {/* TRƯỜNG HỢP 1: CHƯA CHỌN NHÓM -> HIỆN DANH SÁCH & GỢI Ý */}
              {!selectedGroupTag ? (
                  <NetworkSection 
                     currentGuestId={guest.id} 
                     currentTags={guest.tags || ['general']}
                     onSelectGroup={(tag) => setSelectedGroupTag(tag)}
                     onAddMember={handleAddMember}
                  />
              ) : (
              /* TRƯỜNG HỢP 2: ĐÃ CHỌN NHÓM -> HIỆN KHUNG CHAT */
                  <div className="flex flex-col h-[70vh]">
                     {/* Header nhóm chat + Nút Back */}
                     <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[#333]">
                        <button 
                            onClick={() => setSelectedGroupTag(null)}
                            className="p-2 rounded-full hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h3 className="font-bold text-[#d4af37]">
                                {selectedGroupTag === 'general' ? 'Hội trường chính' : `Nhóm ${selectedGroupTag}`}
                            </h3>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Đang trực tuyến
                            </p>
                        </div>
                     </div>
                     
                     {/* Khung chat */}
                     <div className="flex-1 overflow-hidden relative border border-[#333] rounded-2xl bg-[#111]">
                         <ChatGroup 
                            currentUser={guest} 
                            groupTag={selectedGroupTag} 
                         />
                     </div>
                  </div>
              )}
           </div>
        )}
      </div>

      {/* FOOTER NAV */}
      <div className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-[#111]/90 backdrop-blur-xl border border-[#333] rounded-2xl p-2 flex justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-md mx-auto">
            <NavButton active={activeTab === 'wish'} icon={<Ticket size={20} />} label="Lưu bút" onClick={() => setActiveTab('wish')} />
            <NavButton active={activeTab === 'chat'} icon={<Users size={20} />} label="Kết nối" onClick={() => setActiveTab('chat')} />
            <NavButton active={activeTab === ('card' as any)} icon={<ImagePlus size={20} />} label="Xem thiệp" onClick={() => setActiveTab('card')} />
        </div>
      </div>
    </div>
  );
}

// --- Component Nút Điều Hướng ---
function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20 translate-y-[-2px]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}