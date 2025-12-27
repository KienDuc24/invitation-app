"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Users, CheckCircle, XCircle, MessageSquare, Lock, Loader2, MessageCircle, Hash, Volume2, Info, Send, MapPin, Calendar, Phone, Map } from "lucide-react";
import ChatGroup from "@/components/ChatGroup"; 

export const dynamic = 'force-dynamic';

interface AdminGroupInfo {
    tag: string;
    name: string;
    avatar_url?: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  
  const [guests, setGuests] = useState<any[]>([]);
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'wishes' | 'chat' | 'info'>('overview');

  const [chatGroups, setChatGroups] = useState<AdminGroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('general');
  const [unreadGroupTags, setUnreadGroupTags] = useState<string[]>([]);
  
  // State Thông tin sự kiện
  const [eventInfo, setEventInfo] = useState({
    time_info: "",
    location_info: "",
    contact_info: "",
    current_location: ""
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [adminUser, setAdminUser] = useState<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const SECRET_PIN = "2025"; 

  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) audioContextRef.current = new AudioContext();
  }, []);

  const playNotiSound = () => {
    try {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } catch (e) { console.error(e); }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECRET_PIN) {
      setIsAuthenticated(true);
      fetchData();
      if (audioContextRef.current) audioContextRef.current.resume();
    } else {
      alert("Sai mã PIN!");
      setPin("");
    }
  };

  const markAsRead = async (tag: string) => {
    if (!adminUser) return;
    try {
        await supabase.from('group_members').update({ last_viewed_at: new Date().toISOString() })
          .eq('guest_id', adminUser.id).eq('group_tag', tag);
        setUnreadGroupTags(prev => prev.filter(t => t !== tag));
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Lấy thông tin sự kiện
    const { data: infoData } = await supabase.from('event_info').select('*').eq('id', 'main_event').single();
    if (infoData) setEventInfo(infoData);

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
            shortName: "AD", 
            tags: foundAdmin.tags 
        } : { id: 'admin-host-id', name: 'Đức Kiên', avatar_url: null, shortName: 'DK', tags: ['admin'] };
        setAdminUser(adminData);

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

        const unreadTags: string[] = [];
        await Promise.all(formattedGroups.map(async (group) => {
            const { data: member } = await supabase.from('group_members').select('last_viewed_at').eq('guest_id', adminData.id).eq('group_tag', group.tag).single();
            const lastViewed = member?.last_viewed_at || '2000-01-01T00:00:00.000Z';
            const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('group_tag', group.tag).gt('created_at', lastViewed).neq('sender_id', adminData.id);
            if (count && count > 0) unreadTags.push(group.tag);
        }));
        setUnreadGroupTags(unreadTags);
    }
    if (confessionsData) setConfessions(confessionsData);
    setLoading(false);
  };

  const saveEventInfo = async () => {
    setIsSavingInfo(true);
    try {
      const { error } = await supabase.from('event_info').upsert({
        id: 'main_event',
        ...eventInfo,
        updated_at: new Date().toISOString()
      });
      if (!error) alert("Cập nhật thành công!");
    } catch (e) { alert("Lỗi lưu dữ liệu!"); }
    finally { setIsSavingInfo(false); }
  };

  useEffect(() => {
    if (!isAuthenticated || !adminUser) return;
    const channel = supabase.channel('admin-global-noti').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id !== String(adminUser.id)) {
              playNotiSound();
              if (selectedGroup !== newMsg.group_tag) {
                  setUnreadGroupTags(prev => prev.includes(newMsg.group_tag) ? prev : [...prev, newMsg.group_tag]);
              } else { markAsRead(newMsg.group_tag); }
          }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, adminUser, selectedGroup]);

  const realGuests = guests.filter(g => !g.tags?.includes('admin'));
  const confirmedCount = realGuests.filter(g => g.is_confirmed && g.attendance === 'Có tham dự').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111] border border-[#333] p-8 rounded-2xl text-center space-y-6 shadow-2xl">
          <Lock className="text-[#d4af37] mx-auto" size={32} />
          <h1 className="text-xl font-bold text-white uppercase tracking-widest">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN..." className="w-full bg-[#0a0a0a] border border-[#333] text-white text-center text-2xl p-3 rounded-xl focus:border-[#d4af37] outline-none" autoFocus />
            <button className="w-full bg-[#d4af37] text-black font-bold py-3 rounded-xl">XÁC NHẬN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      <div className="border-b border-[#333] bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-[#d4af37] uppercase">Dashboard</h1>
          <button onClick={() => fetchData()} className="text-xs bg-[#222] border border-[#333] px-3 py-1.5 rounded-full hover:bg-[#333] flex items-center gap-1">
             {loading ? <Loader2 size={12} className="animate-spin"/> : <RefreshIcon />} Làm mới
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Tổng khách" value={realGuests.length} icon={<Users size={20}/>} color="text-blue-400" bg="bg-blue-400/10" />
          <StatCard label="Tham dự" value={confirmedCount} icon={<CheckCircle size={20}/>} color="text-green-400" bg="bg-green-400/10" />
          <StatCard label="Bận" value={realGuests.filter(g => g.is_confirmed && g.attendance?.includes('bận')).length} icon={<XCircle size={20}/>} color="text-red-400" bg="bg-red-400/10" />
          <StatCard label="Chưa rep" value={realGuests.length - realGuests.filter(g => g.is_confirmed).length} icon={<Loader2 size={20}/>} color="text-yellow-400" bg="bg-yellow-400/10" />
        </div>

        <div className="flex gap-2 border-b border-[#333] overflow-x-auto pb-1">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Danh sách khách" />
            <TabButton active={activeTab === 'wishes'} onClick={() => setActiveTab('wishes')} label={`Lưu bút (${confessions.length})`} />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} label="Tin nhắn" />
            <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Thông tin lễ" />
        </div>

        {activeTab === 'overview' && (
           <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-[#1a1a1a]">
                    <tr><th className="px-6 py-4">Tên khách</th><th className="px-6 py-4">Nhóm</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Lời nhắn</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {realGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-[#1a1a1a]/50">
                        <td className="px-6 py-4 font-bold flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-[#333] overflow-hidden shrink-0">
                                {guest.avatar_url ? <img src={guest.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-[#222] text-[10px]">{guest.name?.charAt(0)}</div>}
                            </div>
                            {guest.name}
                        </td>
                        <td className="px-6 py-4"><span className="bg-[#222] px-2 py-1 rounded text-[10px] text-gray-400 border border-[#333] uppercase">{guest.tags?.[0] || 'N/A'}</span></td>
                        <td className="px-6 py-4">{guest.is_confirmed ? (guest.attendance === 'Có tham dự' ? <span className="text-green-500">Có</span> : <span className="text-red-500">Bận</span>) : <span className="text-gray-600 italic">Chờ...</span>}</td>
                        <td className="px-6 py-4 text-gray-400 italic truncate max-w-xs">{guest.wish || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeTab === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[70vh]">
                <div className="md:col-span-1 bg-[#111] border border-[#333] rounded-2xl p-4 flex flex-col h-full overflow-hidden">
                    <h3 className="text-[#d4af37] font-bold text-xs uppercase mb-4 flex items-center gap-2"><MessageCircle size={14} /> Chọn Nhóm</h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        {chatGroups.map(group => (
                            <button key={group.tag} onClick={() => { setSelectedGroup(group.tag); markAsRead(group.tag); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 relative border ${selectedGroup === group.tag ? 'bg-[#d4af37] text-black border-transparent shadow-lg shadow-[#d4af37]/20' : 'bg-[#1a1a1a] text-gray-400 border-transparent hover:bg-[#222]'}`}>
                                <div className={`w-8 h-8 rounded-lg border border-current flex items-center justify-center overflow-hidden shrink-0 ${selectedGroup === group.tag ? 'border-black/20' : 'border-gray-700 bg-[#111]'}`}>
                                    {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover"/> : <Hash size={14}/>}
                                </div>
                                <span className="truncate flex-1">{group.name}</span>
                                {unreadGroupTags.includes(group.tag) && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-3 h-full flex flex-col">
                    <div className="flex-1 border border-[#333] rounded-2xl overflow-hidden bg-[#111] shadow-2xl relative">
                        <div className="absolute top-0 left-0 right-0 z-20 bg-[#1a1a1a]/95 p-3 border-b border-[#333] flex justify-between px-4 items-center">
                            <span className="text-xs text-gray-500">Kênh: <span className="text-[#d4af37] font-bold text-sm">#{selectedGroup}</span></span>
                            <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded text-red-400 border border-red-500/30 font-bold uppercase tracking-widest">Admin View</span>
                        </div>
                        <div className="pt-10 h-full">
                            {adminUser ? <ChatGroup currentUser={adminUser} groupTag={selectedGroup} onBack={() => {}} onLeaveGroup={() => {}} /> : <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#d4af37]" /></div>}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- FORM CẤU HÌNH THÔNG TIN (ĐÃ CHỈNH SỬA ĐẸP) --- */}
        {activeTab === 'info' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-[#111] border border-[#333] p-8 rounded-3xl space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-[#222] pb-6">
                        <div className="w-12 h-12 bg-[#d4af37]/10 rounded-2xl flex items-center justify-center border border-[#d4af37]/20">
                            <Info className="text-[#d4af37]" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Cấu hình thiệp mời</h3>
                            <p className="text-xs text-gray-500">Thông tin sẽ hiển thị ở mặt sau tấm thiệp của tất cả khách mời</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest flex items-center gap-2"><Calendar size={12}/> Thời gian</label>
                            <input value={eventInfo.time_info} onChange={e => setEventInfo({...eventInfo, time_info: e.target.value})} className="w-full bg-black border border-[#222] p-4 rounded-xl text-sm focus:border-[#d4af37]/50 outline-none transition-all placeholder:text-gray-700" placeholder="Ví dụ: 08:00 - 20/11/2025" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest flex items-center gap-2"><Phone size={12}/> Liên hệ</label>
                            <input value={eventInfo.contact_info} onChange={e => setEventInfo({...eventInfo, contact_info: e.target.value})} className="w-full bg-black border border-[#222] p-4 rounded-xl text-sm focus:border-[#d4af37]/50 outline-none transition-all placeholder:text-gray-700" placeholder="Số điện thoại..." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest flex items-center gap-2"><MapPin size={12}/> Địa điểm</label>
                            <textarea value={eventInfo.location_info} onChange={e => setEventInfo({...eventInfo, location_info: e.target.value})} className="w-full bg-black border border-[#222] p-4 rounded-xl text-sm focus:border-[#d4af37]/50 outline-none h-24 resize-none transition-all placeholder:text-gray-700" placeholder="Địa chỉ chi tiết..." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest flex items-center gap-2"><Map size={12}/> Vị trí hiện tại (Của bạn)</label>
                            <div className="relative group">
                                <input value={eventInfo.current_location} onChange={e => setEventInfo({...eventInfo, current_location: e.target.value})} className="w-full bg-black border border-[#222] p-4 rounded-xl text-sm focus:border-[#d4af37]/50 outline-none transition-all pl-12 placeholder:text-gray-700" placeholder="Đang ở đâu? (Ví dụ: Đang đón khách tại sảnh A)" />
                                <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/50" size={18} />
                            </div>
                        </div>
                    </div>

                    <button onClick={saveEventInfo} disabled={isSavingInfo} className="w-full bg-[#d4af37] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-[#d4af37]/10 disabled:opacity-50 uppercase tracking-widest text-xs">
                        {isSavingInfo ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>} Cập nhật ngay
                    </button>
                </div>
            </div>
        )}

        {activeTab === 'wishes' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {confessions.map((item) => (
                 <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden p-4">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#d4af37] text-black flex items-center justify-center font-bold text-xs overflow-hidden">
                            {item.guests?.avatar_url ? <img src={item.guests.avatar_url} className="w-full h-full object-cover"/> : (item.guests?.name?.charAt(0) || "?")}
                        </div>
                        <p className="font-bold text-sm text-[#fadd7d]">{item.guests?.name || "Ẩn danh"}</p>
                     </div>
                     {item.image_url && <img src={item.image_url} className="w-full h-40 object-cover rounded-lg mb-3" />}
                     <p className="text-gray-300 text-sm italic">"{item.content}"</p>
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
      <div><p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter opacity-60">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${active ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-600 hover:text-white'}`}>
        {label}
        {count !== undefined && <span className="bg-[#222] px-1.5 rounded text-[10px]">{count}</span>}
    </button>
  );
}

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
)