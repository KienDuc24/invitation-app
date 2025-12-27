"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, CheckCircle, XCircle, MessageSquare, Lock, Loader2, MessageCircle, Hash } from "lucide-react";
import ChatGroup from "@/components/ChatGroup"; 

// Ép trang này luôn tải dữ liệu mới nhất (không cache)
export const dynamic = 'force-dynamic';

// Interface cho thông tin nhóm trong Admin
interface AdminGroupInfo {
    tag: string;
    name: string;
    avatar_url?: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  
  // Dữ liệu
  const [guests, setGuests] = useState<any[]>([]);
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab quản lý
  const [activeTab, setActiveTab] = useState<'overview' | 'wishes' | 'chat'>('overview');

  // State cho phần Chat Admin
  const [chatGroups, setChatGroups] = useState<AdminGroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('general');
  
  // --- USER ADMIN THỰC TẾ ---
  const [adminUser, setAdminUser] = useState<any>(null);

  // --- MÃ PIN BẢO MẬT ---
  const SECRET_PIN = "2025"; 

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECRET_PIN) {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert("Sai mã PIN rồi! Thử lại đi.");
      setPin("");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Lấy danh sách khách
    const { data: guestsData } = await supabase
      .from('guests')
      .select('*')
      .order('is_confirmed', { ascending: false });

    // 2. Lấy lưu bút
    const { data: confessionsData } = await supabase
      .from('confessions')
      .select('*, guests(name)')
      .order('created_at', { ascending: false });

    // 3. Lấy thông tin chi tiết nhóm (Tên, Avatar) từ bảng chat_groups
    const { data: groupsInfoData } = await supabase
      .from('chat_groups')
      .select('*');

    // Tạo Map để tra cứu thông tin nhóm nhanh
    const groupsInfoMap: Record<string, any> = {};
    groupsInfoData?.forEach((g: any) => {
        groupsInfoMap[g.tag] = g;
    });

    if (guestsData) {
        setGuests(guestsData);

        // --- A. TÌM NICK ADMIN ---
        const foundAdmin = guestsData.find((g: any) => g.tags && g.tags.includes('admin'));
        
        if (foundAdmin) {
            setAdminUser({
                id: foundAdmin.id, 
                name: "Đức Kiên (Admin)",
                shortName: "AD", 
                role: "Host",
                tags: ['admin'] // Quan trọng để ChatGroup nhận diện
            });
        } else {
            // Fallback nếu chưa tạo nick admin
            setAdminUser({
                id: 'admin-host-id',
                name: 'Đức Kiên',
                shortName: 'DK',
                tags: ['admin']
            });
        }

        // --- B. TẠO LIST NHÓM CHAT ---
        // Lấy tất cả các tag xuất hiện trong danh sách khách mời
        const tags = new Set<string>(['general']);
        guestsData.forEach((g: any) => {
            if (g.tags && Array.isArray(g.tags)) {
                g.tags.forEach((t: string) => {
                    if (t !== 'admin') tags.add(t); 
                });
            }
        });

        // Convert sang object đầy đủ thông tin (Name, Avatar)
        const formattedGroups: AdminGroupInfo[] = Array.from(tags).map(tag => {
            const info = groupsInfoMap[tag];
            return {
                tag: tag,
                name: info?.name || (tag === 'general' ? 'Hội trường chính' : `Nhóm ${tag}`),
                avatar_url: info?.avatar_url
            };
        });

        setChatGroups(formattedGroups);
    }

    if (confessionsData) setConfessions(confessionsData);
    setLoading(false);
  };

  // --- TÍNH TOÁN THỐNG KÊ ---
  const realGuests = guests.filter(g => !g.tags?.includes('admin'));
  const totalGuests = realGuests.length;
  const confirmedGuests = realGuests.filter(g => g.is_confirmed && g.attendance === 'Có tham dự').length;
  const declinedGuests = realGuests.filter(g => g.is_confirmed && g.attendance?.includes('bận')).length;
  const waitingGuests = totalGuests - confirmedGuests - declinedGuests;

  // --- GIAO DIỆN ĐĂNG NHẬP ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-[#111] border border-[#333] p-8 rounded-2xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/30 animate-pulse">
            <Lock className="text-[#d4af37]" size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-widest">Khu vực Admin</h1>
            <p className="text-gray-500 text-xs mt-2">Chỉ dành cho chủ tiệc</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" value={pin} onChange={(e) => setPin(e.target.value)} 
              placeholder="Nhập mã PIN..." 
              className="w-full bg-[#0a0a0a] border border-[#333] text-white text-center text-2xl tracking-[0.5em] p-3 rounded-xl focus:border-[#d4af37] focus:outline-none transition-colors"
              autoFocus
            />
            <button className="w-full bg-[#d4af37] text-black font-bold py-3 rounded-xl hover:bg-[#b89628] transition-transform active:scale-95">
              MỞ KHÓA
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- GIAO DIỆN DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      
      {/* Header */}
      <div className="border-b border-[#333] bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h1 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Dashboard</h1>
          </div>
          <button onClick={() => fetchData()} className="text-xs bg-[#222] border border-[#333] px-3 py-1.5 rounded-full hover:bg-[#333] flex items-center gap-1 transition-colors">
             {loading ? <Loader2 size={12} className="animate-spin"/> : <RefreshIcon />} Làm mới
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8 mt-6">
        
        {/* 1. THỐNG KÊ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Tổng khách mời" value={totalGuests} icon={<Users size={20}/>} color="text-blue-400" bg="bg-blue-400/10" />
          <StatCard label="Sẽ tham gia" value={confirmedGuests} icon={<CheckCircle size={20}/>} color="text-green-400" bg="bg-green-400/10" />
          <StatCard label="Bận / Từ chối" value={declinedGuests} icon={<XCircle size={20}/>} color="text-red-400" bg="bg-red-400/10" />
          <StatCard label="Chưa trả lời" value={waitingGuests} icon={<Loader2 size={20}/>} color="text-yellow-400" bg="bg-yellow-400/10" />
        </div>

        {/* 2. THANH CHUYỂN TAB */}
        <div className="flex gap-2 border-b border-[#333] overflow-x-auto pb-1">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Danh sách khách" />
            <TabButton active={activeTab === 'wishes'} onClick={() => setActiveTab('wishes')} label={`Lưu bút (${confessions.length})`} />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} label="Tin nhắn Nhóm" />
        </div>

        {/* 3. NỘI DUNG TAB */}
        
        {/* --- TAB: OVERVIEW --- */}
        {activeTab === 'overview' && (
           <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-[#1a1a1a]">
                    <tr>
                      <th className="px-6 py-4">Tên khách</th>
                      <th className="px-6 py-4">Nhóm (Tag)</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-6 py-4">Lời nhắn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {realGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{guest.name}</td>
                        <td className="px-6 py-4"><span className="bg-[#222] px-2 py-1 rounded text-[10px] text-gray-400 border border-[#333] uppercase">{guest.tags?.[0] || 'N/A'}</span></td>
                        <td className="px-6 py-4">
                          {guest.is_confirmed ? (
                            guest.attendance === 'Có tham dự' 
                              ? <span className="text-green-500 font-bold bg-green-500/10 px-2 py-1 rounded text-xs border border-green-500/20">Tham dự</span>
                              : <span className="text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded text-xs border border-red-500/20">Bận</span>
                          ) : <span className="text-gray-500 italic text-xs">Waiting</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-400 italic max-w-xs truncate">{guest.wish || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {/* --- TAB: WISHES --- */}
        {activeTab === 'wishes' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {confessions.length === 0 ? <div className="col-span-full text-center py-20 text-gray-500 italic">Chưa có lưu bút nào.</div> :
               confessions.map((item) => (
                 <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-lg flex flex-col">
                     {item.image_url && <div className="relative h-48 bg-[#000]"><img src={item.image_url} alt="Kỷ niệm" className="w-full h-full object-cover" /></div>}
                     <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-8 h-8 rounded-full bg-[#d4af37] text-black flex items-center justify-center font-bold text-xs">{item.guests?.name?.charAt(0) || "?"}</div>
                           <div><p className="font-bold text-sm text-[#fadd7d]">{item.guests?.name || "Ẩn danh"}</p><p className="text-[10px] text-gray-500">{new Date(item.created_at).toLocaleString('vi-VN')}</p></div>
                        </div>
                        {item.content && <div className="bg-[#1a1a1a] p-3 rounded-xl text-gray-300 text-sm italic relative"><MessageSquare size={12} className="absolute -top-1 -left-1 text-[#333] fill-[#333]" />"{item.content}"</div>}
                     </div>
                 </div>
               ))
             }
           </div>
        )}

        {/* --- TAB: CHAT ADMIN (UPDATED) --- */}
        {activeTab === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
                {/* 1. CỘT TRÁI: DANH SÁCH NHÓM */}
                <div className="md:col-span-1 bg-[#111] border border-[#333] rounded-2xl p-4 flex flex-col h-full">
                    <h3 className="text-[#d4af37] font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                        <MessageCircle size={14} /> Chọn Nhóm
                    </h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                        {chatGroups.map(group => (
                            <button key={group.tag} onClick={() => setSelectedGroup(group.tag)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 group ${selectedGroup === group.tag ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20' : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white'}`}>
                                <div className={`w-8 h-8 rounded-full border border-current flex items-center justify-center overflow-hidden shrink-0 ${selectedGroup === group.tag ? 'border-black/20' : 'border-gray-600'}`}>
                                    {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover"/> : <Hash size={14}/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate">{group.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. CỘT PHẢI: KHUNG CHAT */}
                <div className="md:col-span-3 h-full flex flex-col">
                    <div className="flex-1 border border-[#333] rounded-2xl overflow-hidden bg-[#111] shadow-2xl relative">
                        <div className="absolute top-0 left-0 right-0 z-20 bg-[#1a1a1a]/90 backdrop-blur-sm p-3 border-b border-[#333] flex justify-between px-4 items-center">
                            <span className="text-xs text-gray-500">Đang chat tại: <span className="text-[#d4af37] font-bold text-sm">#{selectedGroup}</span></span>
                            <span className="text-[10px] bg-[#333] px-2 py-0.5 rounded text-gray-300 border border-[#444]">Admin Mode</span>
                        </div>
                        <div className="pt-10 h-full">
                            {adminUser ? (
                                <ChatGroup 
                                    currentUser={adminUser} 
                                    groupTag={selectedGroup} 
                                    onBack={() => {}} // Admin desktop không cần back
                                    onLeaveGroup={() => {}} // Admin không được rời nhóm ở đây
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                                    <Loader2 size={32} className="animate-spin text-[#d4af37] mb-2"/>
                                    <p>Đang tìm nick Admin...</p>
                                    <p className="text-xs text-red-400 mt-2">Đảm bảo bạn đã có user với tag 'admin' trong Database.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}

// --- Component Phụ ---
function StatCard({ label, value, icon, color, bg }: any) {
  return (
    <div className="bg-[#111] border border-[#333] p-4 rounded-2xl flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color}`}>{icon}</div>
      <div><p className="text-gray-500 text-[10px] uppercase tracking-wider">{label}</p><p className="text-2xl font-bold text-white">{value}</p></div>
    </div>
  );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${active ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-gray-500 hover:text-white'}`}>{label}</button>
  );
}

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
)