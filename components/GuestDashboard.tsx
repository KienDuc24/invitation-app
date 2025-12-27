"use client";

import MobileInvitation from "@/components/3d/InvitationCard";
import ChatGroup from "@/components/ChatGroup";
import NetworkSection, { ChatGroupInfo } from "@/components/NetworkSection";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  CheckCircle,
  Crown,
  HeartHandshake,
  ImagePlus,
  Loader2,
  MapPin,
  Send,
  Ticket,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// --- CONSTANTS ---
const HOST_INFO = {
  name: "Đức Kiên",
  shortName: "DK",
  role: "Chủ tiệc",
  isHost: true
};

interface DashboardProps {
  guest: any;
}

export default function GuestDashboard({ guest }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'wish' | 'chat' | 'card'>('wish');
  
  // --- STATE QUẢN LÝ NHÓM ---
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]); // Danh sách tag nhóm đã tham gia
  const [previewGroup, setPreviewGroup] = useState<ChatGroupInfo | null>(null); // Nhóm đang xem Preview
  const [activeChatTag, setActiveChatTag] = useState<string | null>(null); // Nhóm đang Chat
  
  // Danh sách thành viên thật (lấy từ DB khi xem Preview)
  const [previewMembers, setPreviewMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // --- STATE CHO LƯU BÚT ---
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. KHỞI TẠO: Kiểm tra các nhóm đã tham gia ---
  useEffect(() => {
    const fetchJoined = async () => {
      // Lấy danh sách nhóm mà user này đã có trong bảng group_members
      const { data } = await supabase
        .from('group_members')
        .select('group_tag')
        .eq('guest_id', guest.id);
      
      if (data) {
        // Gom tất cả các tag lại thành mảng string
        const tags = data.map((item: any) => item.group_tag);
        // Nếu chưa có nhóm 'general' thì mặc định thêm vào (tuỳ logic của bạn)
        if (!tags.includes('general')) tags.push('general');
        setJoinedGroups(tags);
      } else {
        setJoinedGroups(['general']);
      }
    };
    fetchJoined();
  }, [guest.id]);

  // --- 2. HÀM LOGIC: LẤY THÀNH VIÊN THẬT ---
  const fetchRealMembers = async (groupTag: string) => {
      setLoadingMembers(true);
      
      // Mặc định luôn có Admin đầu tiên
      const realList = [
          { id: 'admin-host', name: HOST_INFO.name, short: HOST_INFO.shortName, isHost: true }
      ];

      try {
          // Lấy dữ liệu từ bảng group_members, join sang bảng guests để lấy tên
          const { data } = await supabase
              .from('group_members')
              .select('guests(id, name, tags)')
              .eq('group_tag', groupTag)
              .limit(12); // Lấy tối đa 12 người để hiển thị preview

          if (data) {
              data.forEach((item: any) => {
                  const g = item.guests;
                  // Lọc bỏ: Chính mình (guest.id) và Admin (nếu admin có trong DB) để tránh trùng
                  if (g && g.id !== guest.id && !g.tags?.includes('admin')) {
                      realList.push({
                          id: g.id,
                          name: g.name,
                          short: g.name.charAt(0).toUpperCase(),
                          isHost: false
                      });
                  }
              });
          }
      } catch (e) {
          console.error("Lỗi lấy thành viên:", e);
      }

      setPreviewMembers(realList);
      setLoadingMembers(false);
  };

  // --- 3. HÀM XỬ LÝ: MỞ PREVIEW ---
  const handlePreviewGroup = (group: ChatGroupInfo) => {
      // Nếu đã tham gia rồi -> Vào chat luôn
      if (joinedGroups.includes(group.tag_identifier)) {
          setActiveChatTag(group.tag_identifier);
          setPreviewGroup(null);
      } else {
          // Chưa tham gia -> Hiện màn hình Preview & Load thành viên
          setPreviewGroup(group);
          setActiveChatTag(null);
          fetchRealMembers(group.tag_identifier); // Gọi hàm lấy dữ liệu thật
      }
  };

  // --- 4. HÀM XỬ LÝ: THAM GIA NHÓM ---
  const handleJoinGroup = async () => {
      if (!previewGroup) return;
      
      try {
          // Insert vào DB
          const { data, error } = await supabase
              .from('group_members')
              .upsert({
                  group_tag: previewGroup.tag_identifier,
                  guest_id: guest.id,
                  joined_at: new Date().toISOString()
              });

          // Nếu lỗi thì báo
          if (error) {
              console.warn("Lỗi join nhóm (có thể do đã tham gia):", error.message);
              // Vẫn tiếp tục update state vì có thể là conflict (người đã tham gia rồi)
          }

          // Cập nhật State Local
          setJoinedGroups(prev => 
              prev.includes(previewGroup.tag_identifier) 
                  ? prev 
                  : [...prev, previewGroup.tag_identifier]
          );
          setActiveChatTag(previewGroup.tag_identifier); // Chuyển sang màn hình chat
          setPreviewGroup(null); // Tắt preview

      } catch (e: any) {
          console.warn("Exception khi join nhóm:", e?.message);
          // Vẫn tiếp tục vì có thể là lỗi network tạm thời
          if (previewGroup) {
              setJoinedGroups(prev => 
                  prev.includes(previewGroup.tag_identifier) 
                      ? prev 
                      : [...prev, previewGroup.tag_identifier]
              );
              setActiveChatTag(previewGroup.tag_identifier);
              setPreviewGroup(null);
          }
      }
  };

  // 5. Hàm mời người khác (Mockup)
  const handleInvitePerson = (personId: string, personName: string) => {
      alert(`Đã gửi lời mời tham gia nhóm tới ${personName}.\nChờ họ chấp nhận nhé!`);
  };

  // --- HÀM GỬI LƯU BÚT & UPLOAD ---
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

  // --- RENDER MÀN HÌNH 3D CARD (FULLSCREEN) ---
  if (activeTab === 'card') {
    return (
      <div className="relative w-full h-[100dvh] bg-black">
        <MobileInvitation 
           guestName={guest.name} 
           guestId={guest.id} 
           isConfirmed={true} 
           initialAttendance={guest.attendance} 
           initialWish={guest.wish}
           onTabChange={(tab) => setActiveTab(tab as any)}
        />
      </div>
    );
  }

  // --- RENDER DASHBOARD CHÍNH ---
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
        
        {/* === TAB LƯU BÚT === */}
        {activeTab === 'wish' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>
                <h2 className="text-[#fadd7d] font-bold uppercase tracking-widest text-xs flex items-center gap-2 relative z-10">
                    <HeartHandshake size={16}/> Gửi lưu bút
                </h2>
                
                {sent ? (
                    <div className="py-8 text-center animate-in zoom-in duration-300">
                        <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-500/30">
                            <Send className="text-green-500" size={20} />
                        </div>
                        <p className="text-green-500 font-bold mb-1">Đã gửi thành công!</p>
                        <button onClick={() => setSent(false)} className="text-xs text-[#d4af37] underline hover:text-white transition-colors">Gửi tiếp</button>
                    </div>
                ) : (
                    <div className="space-y-4 relative z-10">
                        <textarea 
                            value={content} 
                            onChange={(e) => setContent(e.target.value)} 
                            placeholder="Viết vài dòng tâm sự..." 
                            className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm min-h-[100px] text-gray-200 focus:border-[#d4af37] focus:outline-none resize-none transition-colors"
                        />
                        {file && (
                            <div className="flex items-center gap-2 bg-[#222] p-2 rounded-lg border border-[#333]">
                                <div className="w-10 h-10 relative rounded overflow-hidden">
                                    <img src={URL.createObjectURL(file)} alt="Preview" className="object-cover w-full h-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs truncate text-gray-300">{file.name}</p>
                                    <p className="text-[10px] text-green-500 flex items-center gap-1"><CheckCircle size={10}/> Đã chọn</p>
                                </div>
                                <button onClick={() => setFile(null)} className="p-1 hover:bg-[#333] rounded"><Loader2 size={14} className="rotate-45"/></button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-[#222] rounded-xl border border-[#333] text-gray-400 hover:text-white transition-colors">
                                <ImagePlus size={20}/>
                            </button>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => e.target.files && setFile(e.target.files[0])}/>
                            <button 
                                onClick={handleSendConfession} 
                                disabled={uploading || (!content && !file)} 
                                className="flex-1 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#d4af37]/20 transition-all"
                            >
                                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                <span className="text-xs uppercase tracking-wider">{uploading ? "Đang gửi..." : "Gửi ngay"}</span>
                            </button>
                        </div>
                    </div>
                )}
             </div>

             {/* AI Teaser */}
             <div className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
                <div className="bg-purple-500/20 p-3 rounded-full relative z-10"><MapPin className="text-purple-400" size={20} /></div>
                <div className="relative z-10">
                  <h3 className="text-purple-200 font-bold text-sm">Trợ lý AI (Sắp ra mắt)</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Hỏi đường, tìm chỗ đậu xe, lịch trình buổi lễ...</p>
                </div>
            </div>
          </div>
        )}

        {/* === TAB CHAT (KẾT NỐI) === */}
        {activeTab === 'chat' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
              
              {/* CASE 1: DANH SÁCH NHÓM & GỢI Ý (Mặc định) */}
              {!activeChatTag && !previewGroup && (
                  <NetworkSection 
                     currentGuestId={guest.id} 
                     currentTags={guest.tags || ['general']}
                     joinedGroups={joinedGroups}
                     onPreviewGroup={handlePreviewGroup}
                     onInvitePerson={handleInvitePerson}
                  />
              )}

              {/* CASE 2: PREVIEW NHÓM (CÓ THÀNH VIÊN THẬT) */}
              {previewGroup && (
                  <div className="flex flex-col h-[65vh] justify-between bg-[#111] border border-[#333] rounded-2xl p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                      {/* Background Decoration */}
                      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#d4af37]/10 to-transparent pointer-events-none"></div>
                      
                      <div className="relative z-10">
                          {/* Nút đóng */}
                          <button 
                             onClick={() => setPreviewGroup(null)} 
                             className="absolute -top-2 -left-2 p-2.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-colors border border-white/10 z-20"
                          >
                              <ArrowLeft size={18}/>
                          </button>
                          
                          {/* Header Nhóm */}
                          <div className="mt-8 text-center">
                             <div className="w-20 h-20 bg-gradient-to-tr from-[#222] to-[#333] border border-[#d4af37]/50 rounded-2xl mx-auto flex items-center justify-center text-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.15)] mb-4">
                                 <Users size={36} strokeWidth={1.5} />
                             </div>
                             <h2 className="text-xl font-bold text-white">{previewGroup.name}</h2>
                             <p className="text-gray-400 text-xs mt-1">
                                {loadingMembers ? "Đang tải thành viên..." : `${previewMembers.length} thành viên tham gia`}
                             </p>
                          </div>

                          {/* Danh sách thành viên (DATA THẬT) */}
                          <div className="mt-8">
                              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Thành viên tiêu biểu</h3>
                              
                              <div className="flex -space-x-3 justify-center py-2 flex-wrap gap-y-2">
                                  {loadingMembers ? (
                                      <Loader2 className="animate-spin text-[#d4af37]" />
                                  ) : previewMembers.map((mem, idx) => (
                                      <div key={mem.id || idx} className="relative z-10 group" style={{ zIndex: 50 - idx }}>
                                          {mem.isHost ? (
                                              /* Avatar Admin (Host) */
                                              <div className="relative">
                                                  <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] bg-black flex items-center justify-center text-[#d4af37] font-bold text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                                                      {mem.short}
                                                  </div>
                                                  <div className="absolute -top-1.5 -right-1.5 bg-[#d4af37] text-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-black">
                                                      <Crown size={10} fill="black" />
                                                  </div>
                                                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#d4af37] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-2 py-1 rounded-full border border-[#d4af37]/30">
                                                      {HOST_INFO.role}
                                                  </div>
                                              </div>
                                          ) : (
                                              /* Avatar Member */
                                              <div className="w-12 h-12 rounded-full border-2 border-[#111] bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-gray-300">
                                                  {mem.short}
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                              <p className="text-center text-[10px] text-gray-500 mt-3 italic opacity-70">
                                  {loadingMembers ? "" : (previewMembers.length <= 1 ? "Hãy là người đầu tiên tham gia!" : "Admin luôn có mặt để hỗ trợ")}
                              </p>
                          </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="relative z-10 mt-4 space-y-3">
                          <button 
                             onClick={handleJoinGroup}
                             className="w-full py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-[#d4af37]/20 hover:shadow-[#d4af37]/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                          >
                             <UserPlus size={18} /> Tham gia ngay
                          </button>
                      </div>
                  </div>
              )}

              {/* CASE 3: MÀN HÌNH CHAT CHÍNH THỨC */}
              {activeChatTag && (
                  <div className="flex flex-col h-[70vh] animate-in slide-in-from-right-10 duration-300">
                     {/* Chat Header */}
                     <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[#333]">
                        <button 
                            onClick={() => setActiveChatTag(null)}
                            className="p-2 rounded-full hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h3 className="font-bold text-[#d4af37]">
                                {activeChatTag === 'general' ? 'Hội trường chính' : `Nhóm ${activeChatTag}`}
                            </h3>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Đang trực tuyến
                            </p>
                        </div>
                     </div>
                     
                     {/* Khung Chat */}
                     <div className="flex-1 overflow-hidden relative border border-[#333] rounded-2xl bg-[#111]">
                         <ChatGroup currentUser={guest} groupTag={activeChatTag} />
                     </div>
                  </div>
              )}
           </div>
        )}
      </div>

      {/* FOOTER NAVIGATION */}
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
                icon={<Users size={20} />} 
                label="Kết nối" 
                onClick={() => setActiveTab('chat')} 
            />
            <NavButton 
                active={activeTab === ('card' as any)} 
                icon={<ImagePlus size={20} />} 
                label="Xem thiệp" 
                onClick={() => setActiveTab('card')} 
            />
        </div>
      </div>

    </div>
  );
}

// --- SUB-COMPONENT: NAV BUTTON ---
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
          ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20 -translate-y-1' 
          : 'text-gray-500 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}