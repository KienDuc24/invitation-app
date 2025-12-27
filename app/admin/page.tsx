"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Users, CheckCircle, XCircle, MessageSquare, Lock, Loader2, MessageCircle, Hash, Volume2 } from "lucide-react";
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
  const [unreadGroupTags, setUnreadGroupTags] = useState<string[]>([]);
  
  // --- USER ADMIN THỰC TẾ ---
  const [adminUser, setAdminUser] = useState<any>(null);

  // --- HỆ THỐNG ÂM THANH (WEB AUDIO API) ---
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- MÃ PIN BẢO MẬT ---
  const SECRET_PIN = "2025"; 

  // --- 1. KHỞI TẠO AUDIO CONTEXT ---
  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
        audioContextRef.current = new AudioContext();
    }
  }, []);

  const playNotiSound = () => {
    try {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } catch (e) { console.error(e); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECRET_PIN) {
      setIsAuthenticated(true);
      fetchData();
      // Kích hoạt audio sau tương tác người dùng
      if (audioContextRef.current) audioContextRef.current.resume();
    } else {
      alert("Sai mã PIN rồi! Thử lại đi.");
      setPin("");
    }
  };

  // --- 2. HÀM ĐÁNH DẤU ĐÃ XEM CHO ADMIN ---
  const markAsRead = async (tag: string) => {
    if (!adminUser) return;
    try {
        await supabase.from('group_members')
          .update({ last_viewed_at: new Date().toISOString() })
          .eq('guest_id', adminUser.id)
          .eq('group_tag', tag);
        
        // Xóa tag khỏi danh sách chưa đọc ở giao diện
        setUnreadGroupTags(prev => prev.filter(t => t !== tag));
    } catch (e) {
        console.error("Lỗi cập nhật đã xem:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    const { data: guestsData } = await supabase.from('guests').select('*').order('is_confirmed', { ascending: false });
    const { data: confessionsData } = await supabase.from('confessions').select('*, guests(name)').order('created_at', { ascending: false });
    const { data: groupsInfoData } = await supabase.from('chat_groups').select('*');

    const groupsInfoMap: Record<string, any> = {};
    groupsInfoData?.forEach((g: any) => { groupsInfoMap[g.tag] = g; });

    if (guestsData) {
        setGuests(guestsData);
        const foundAdmin = guestsData.find((g: any) => g.tags && g.tags.includes('admin'));
        
        const adminData = foundAdmin ? {
            id: foundAdmin.id, 
            name: foundAdmin.name,
            avatar_url: foundAdmin.avatar_url,
            shortName: foundAdmin.name?.charAt(0).toUpperCase() || "AD", 
            role: "Host",
            tags: foundAdmin.tags 
        } : { id: 'admin-host-id', name: 'Đức Kiên', avatar_url: null, shortName: 'DK', tags: ['admin'] };

        setAdminUser(adminData);

        // Tạo danh sách nhóm
        const tags = new Set<string>(['general']);
        guestsData.forEach((g: any) => {
            if (g.tags && Array.isArray(g.tags)) {
                g.tags.forEach((t: string) => { if (t !== 'admin') tags.add(t); });
            }
        });

        const formattedGroups: AdminGroupInfo[] = Array.from(tags).map(tag => {
            const info = groupsInfoMap[tag];
            return {
                tag: tag,
                name: info?.name || (tag === 'general' ? 'Hội trường chính' : `Nhóm ${tag}`),
                avatar_url: info?.avatar_url
            };
        });
        setChatGroups(formattedGroups);

        // Kiểm tra tin nhắn chưa đọc ban đầu
        const unreadTags: string[] = [];
        await Promise.all(formattedGroups.map(async (group) => {
            const { data: member } = await supabase.from('group_members')
                .select('last_viewed_at')
                .eq('guest_id', adminData.id)
                .eq('group_tag', group.tag)
                .single();
            
            const lastViewed = member?.last_viewed_at || '2000-01-01T00:00:00.000Z';
            const { count } = await supabase.from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('group_tag', group.tag)
                .gt('created_at', lastViewed)
                .neq('sender_id', adminData.id);
            
            if (count && count > 0) unreadTags.push(group.tag);
        }));
        setUnreadGroupTags(unreadTags);
    }

    if (confessionsData) setConfessions(confessionsData);
    setLoading(false);
  };

  // --- 3. REALTIME LISTENER CHO ADMIN ---
  useEffect(() => {
    if (!isAuthenticated || !adminUser) return;

    const channel = supabase.channel('admin-global-chat-listener')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          
          // Chỉ báo khi người khác nhắn
          if (newMsg.sender_id !== String(adminUser.id)) {
              playNotiSound(); // Phát chuông

              // Nếu không phải nhóm đang mở, hiện chấm đỏ
              if (selectedGroup !== newMsg.group_tag) {
                  setUnreadGroupTags(prev => prev.includes(newMsg.group_tag) ? prev : [...prev, newMsg.group_tag]);
              } else {
                  // Nếu đang mở nhóm đó, tự động mark as read trong DB
                  markAsRead(newMsg.group_tag);
              }
          }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, adminUser, selectedGroup]);

  // --- THỐNG KÊ ---
  const realGuests = guests.filter(g => !g.tags?.includes('admin'));
  const totalGuests = realGuests.length;
  const confirmedGuests = realGuests.filter(g => g.is_confirmed && g.attendance === 'Có tham dự').length;
  const declinedGuests = realGuests.filter(g => g.is_confirmed && g.attendance?.includes('bận')).length;
  const waitingGuests = totalGuests - confirmedGuests - declinedGuests;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-[#111] border border-[#333] p-8 rounded-2xl text-center space-y-6 shadow-2xl">
          <Lock className="text-[#d4af37] mx-auto" size={32} />
          <h1 className="text-xl font-bold text-white uppercase tracking-widest">Khu vực Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" value={pin} onChange={(e) => setPin(e.target.value)} 
              placeholder="Nhập mã PIN..." 
              className="w-full bg-[#0a0a0a] border border-[#333] text-white text-center text-2xl tracking-[0.5em] p-3 rounded-xl focus:border-[#d4af37] outline-none"
              autoFocus
            />
            <button className="w-full bg-[#d4af37] text-black font-bold py-3 rounded-xl hover:bg-[#b89628] active:scale-95 transition-all">MỞ KHÓA</button>
          </form>
        </div>
      </div>
    );
  }

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
          <StatCard label="Tổng khách" value={totalGuests} icon={<Users size={20}/>} color="text-blue-400" bg="bg-blue-400/10" />
          <StatCard label="Tham dự" value={confirmedGuests} icon={<CheckCircle size={20}/>} color="text-green-400" bg="bg-green-400/10" />
          <StatCard label="Từ chối" value={declinedGuests} icon={<XCircle size={20}/>} color="text-red-400" bg="bg-red-400/10" />
          <StatCard label="Chưa trả lời" value={waitingGuests} icon={<Loader2 size={20}/>} color="text-yellow-400" bg="bg-yellow-400/10" />
        </div>

        {/* 2. THANH CHUYỂN TAB */}
        <div className="flex gap-2 border-b border-[#333] overflow-x-auto pb-1">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Danh sách khách" />
            <TabButton active={activeTab === 'wishes'} onClick={() => setActiveTab('wishes')} label={`Lưu bút (${confessions.length})`} />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} label="Kênh Chat Nhóm" />
        </div>

        {/* --- TAB: OVERVIEW --- */}
        {activeTab === 'overview' && (
           <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-xl animate-in fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-[#1a1a1a]">
                    <tr><th className="px-6 py-4">Tên khách</th><th className="px-6 py-4">Nhóm</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Lời nhắn</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {realGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-[#1a1a1a]/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-[#333] overflow-hidden shrink-0">
                                {guest.avatar_url ? <img src={guest.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-[#222] text-[10px]">{guest.name?.charAt(0)}</div>}
                            </div>
                            {guest.name}
                        </td>
                        <td className="px-6 py-4"><span className="bg-[#222] px-2 py-1 rounded text-[10px] text-gray-400 border border-[#333] uppercase">{guest.tags?.[0] || 'N/A'}</span></td>
                        <td className="px-6 py-4">{guest.is_confirmed ? (guest.attendance === 'Có tham dự' ? <span className="text-green-500">Có tham dự</span> : <span className="text-red-500">Từ chối</span>) : <span className="text-gray-600 italic">Chưa trả lời</span>}</td>
                        <td className="px-6 py-4 text-gray-400 italic truncate max-w-xs">{guest.wish || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {/* --- TAB: CHAT ADMIN (Tích hợp thông báo) --- */}
        {activeTab === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[70vh] animate-in fade-in">
                {/* 1. CỘT TRÁI: DANH SÁCH NHÓM */}
                <div className="md:col-span-1 bg-[#111] border border-[#333] rounded-2xl p-4 flex flex-col h-full overflow-hidden">
                    <h3 className="text-[#d4af37] font-bold text-xs uppercase mb-4 flex items-center gap-2">
                        <MessageCircle size={14} /> Chọn Nhóm
                    </h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        {chatGroups.map(group => {
                            const isUnread = unreadGroupTags.includes(group.tag);
                            return (
                                <button 
                                    key={group.tag} 
                                    onClick={() => { setSelectedGroup(group.tag); markAsRead(group.tag); }} 
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 relative border ${selectedGroup === group.tag ? 'bg-[#d4af37] text-black border-transparent shadow-lg shadow-[#d4af37]/20' : 'bg-[#1a1a1a] text-gray-400 border-transparent hover:bg-[#222]'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg border border-current flex items-center justify-center overflow-hidden shrink-0 ${selectedGroup === group.tag ? 'border-black/20' : 'border-gray-700 bg-[#111]'}`}>
                                        {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover"/> : <Hash size={14}/>}
                                    </div>
                                    <span className="truncate flex-1">{group.name}</span>
                                    
                                    {/* Chấm thông báo chưa đọc */}
                                    {isUnread && (
                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. CỘT PHẢI: KHUNG CHAT */}
                <div className="md:col-span-3 h-full flex flex-col">
                    <div className="flex-1 border border-[#333] rounded-2xl overflow-hidden bg-[#111] shadow-2xl relative">
                        <div className="absolute top-0 left-0 right-0 z-20 bg-[#1a1a1a]/95 backdrop-blur-sm p-3 border-b border-[#333] flex justify-between px-4 items-center">
                            <span className="text-xs text-gray-500">Kênh: <span className="text-[#d4af37] font-bold text-sm">#{selectedGroup}</span></span>
                            <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded text-red-400 border border-red-500/30 font-bold uppercase">Admin View</span>
                        </div>
                        <div className="pt-10 h-full">
                            {adminUser ? (
                                <ChatGroup 
                                    currentUser={adminUser} 
                                    groupTag={selectedGroup} 
                                    onBack={() => {}} 
                                    onLeaveGroup={() => {}} 
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#d4af37]" /></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- TAB: WISHES --- */}
        {activeTab === 'wishes' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4">
             {confessions.map((item) => (
                 <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden p-4">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#d4af37] text-black flex items-center justify-center font-bold text-xs overflow-hidden">
                            {item.guests?.avatar_url ? <img src={item.guests.avatar_url} className="w-full h-full object-cover"/> : (item.guests?.name?.charAt(0) || "?")}
                        </div>
                        <p className="font-bold text-sm text-[#fadd7d]">{item.guests?.name || "Ẩn danh"}</p>
                     </div>
                     {item.image_url && <img src={item.image_url} className="w-full h-40 object-cover rounded-lg mb-3" alt="Memory" />}
                     <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#222]">
                        <p className="text-gray-300 text-sm italic">"{item.content}"</p>
                     </div>
                 </div>
             ))}
           </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bg }: any) {
  return (
    <div className="bg-[#111] border border-[#333] p-4 rounded-2xl flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color}`}>{icon}</div>
      <div><p className="text-gray-500 text-[10px] uppercase tracking-wider">{label}</p><p className="text-xl font-bold text-white">{value}</p></div>
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