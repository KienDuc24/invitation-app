"use client";

import ChatGroup from "@/components/ChatGroup";
import { supabase } from "@/lib/supabase";
import {
  BellRing,
  Calendar,
  CheckCircle,
  Hash,
  Heart,
  Info,
  Loader2,
  Lock,
  Map,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Users,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  
  const [eventInfo, setEventInfo] = useState({
    time_info: "",
    location_info: "",
    contact_info: "",
    current_location: ""
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedConfessionDetail, setSelectedConfessionDetail] = useState<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const SECRET_PIN = "2025"; 

  // --- 1. KHỞI TẠO AUDIO ---
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

  // --- 2. FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    
    // Lấy thông tin sự kiện
    const { data: infoData } = await supabase.from('event_info').select('*').eq('id', 'main_event').single();
    if (infoData) {
        setEventInfo({
            time_info: infoData.time_info || "",
            location_info: infoData.location_info || "",
            contact_info: infoData.contact_info || "",
            current_location: infoData.current_location || ""
        });
    }

    const { data: guestsData } = await supabase.from('guests').select('*').order('is_confirmed', { ascending: false });
    const { data: confessionsData } = await supabase.from('confessions').select('*, guests(name, avatar_url)').order('created_at', { ascending: false });
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
    }
    if (confessionsData) setConfessions(confessionsData);
    setLoading(false);
  };

  // --- 3. TƯƠNG TÁC LƯU BÚT ---
  const handleLikeConfession = async (id: string, currentLikes: number) => {
    try {
      // Toggle: nếu đã like thì unlike, chưa like thì like
      const newLikesCount = (currentLikes || 0) > 0 ? (currentLikes || 0) - 1 : 1;
      const { error } = await supabase.from('confessions').update({ likes_count: newLikesCount }).eq('id', id);
      if (error) throw error;
      setConfessions(prev => prev.map(c => c.id === id ? {...c, likes_count: newLikesCount} : c));
    } catch (e) {
      console.error("Lỗi thả tim:", e);
      alert("Lỗi cập nhật!");
    }
  };

  const handleCommentConfession = async (id: string) => {
    const comment = prompt("Nhập phản hồi của bạn:");
    if (comment === null) return;
    try {
      const { error } = await supabase.from('confessions').update({ admin_comment: comment }).eq('id', id);
      if (error) throw error;
      setConfessions(prev => prev.map(c => c.id === id ? {...c, admin_comment: comment} : c));
    } catch (e) {
      console.error("Lỗi comment:", e);
      alert("Lỗi cập nhật!");
    }
  };

  const saveEventInfo = async () => {
    setIsSavingInfo(true);
    try {
      await supabase.from('event_info').upsert({ id: 'main_event', ...eventInfo, updated_at: new Date().toISOString() });
      alert("Cập nhật thành công!");
    } catch (e) { alert("Lỗi lưu dữ liệu!"); }
    finally { setIsSavingInfo(false); }
  };

  // --- 4. REALTIME THÔNG BÁO ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const channel = supabase.channel('admin-global').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new.sender_id !== adminUser?.id) {
              playNotiSound();
              setUnreadGroupTags(prev => [...new Set([...prev, payload.new.group_tag])]);
          }
      }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
          playNotiSound();
          fetchData(); // Reload lưu bút mới
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, adminUser]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111] border border-[#333] p-10 rounded-[2.5rem] text-center space-y-6 shadow-2xl">
          <Lock className="text-[#d4af37] mx-auto" size={40} />
          <h1 className="text-xl font-bold text-white uppercase tracking-widest font-sans">Khu vực Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Mã PIN..." className="w-full bg-[#0a0a0a] border border-[#333] text-white text-center text-2xl p-4 rounded-2xl focus:border-[#d4af37] outline-none font-sans" autoFocus />
            <button className="w-full bg-[#d4af37] text-black font-bold py-4 rounded-2xl uppercase tracking-widest hover:bg-[#b89628] transition-all">Mở khóa</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      {/* Header tương đồng GuestDashboard */}
      <div className="p-6 bg-gradient-to-b from-[#1a1a1a] to-transparent sticky top-0 z-50 backdrop-blur-md border-b border-[#333]/30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-[#d4af37] flex items-center justify-center text-black font-bold">AD</div>
             <div>
                <h1 className="text-lg font-bold text-[#d4af37] uppercase tracking-wider">Quản trị viên</h1>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Hệ thống thiệp điện tử</p>
             </div>
          </div>
          <button onClick={fetchData} className="p-2 bg-[#222] rounded-full text-[#d4af37] hover:bg-[#333] transition-colors">
             {loading ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18} />}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Tổng khách" value={guests.filter(g => !g.tags?.includes('admin')).length} icon={<Users size={18}/>} color="text-blue-400" bg="bg-blue-400/10" />
          <StatCard label="Tham dự" value={guests.filter(g => g.is_confirmed && g.attendance === 'Có tham dự').length} icon={<CheckCircle size={18}/>} color="text-green-400" bg="bg-green-400/10" />
          <StatCard label="Lưu bút" value={confessions.length} icon={<MessageSquare size={18}/>} color="text-[#d4af37]" bg="bg-[#d4af37]/10" />
          <StatCard label="Chưa rep" value={guests.filter(g => !g.is_confirmed && !g.tags?.includes('admin')).length} icon={<Loader2 size={18}/>} color="text-yellow-400" bg="bg-yellow-400/10" />
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-4 border-b border-[#222] overflow-x-auto no-scrollbar">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Khách mời" />
            <TabButton active={activeTab === 'wishes'} onClick={() => setActiveTab('wishes')} label="Lưu bút" badge={confessions.length} />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} label="Tin nhắn" badge={unreadGroupTags.length} />
            <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Thông tin lễ" />
        </div>

        {/* --- TAB: LƯU BÚT (TÍNH NĂNG MỚI) --- */}
        {activeTab === 'wishes' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
             {confessions.length === 0 ? <p className="text-gray-500 italic text-center col-span-full py-20">Chưa có ai gửi tâm thư...</p> :
               confessions.map((item) => (
                 <div key={item.id} className="bg-[#111] border border-[#333] rounded-[2rem] overflow-hidden flex flex-col shadow-xl group hover:border-[#d4af37]/40 transition-all cursor-pointer" onClick={() => setSelectedConfessionDetail(item)}>
                     {item.image_url && <img src={item.image_url} className="w-full h-48 object-cover border-b border-[#222]" alt=""/>}
                     <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#d4af37] text-black flex items-center justify-center font-bold text-xs overflow-hidden border-2 border-black shadow-lg">
                                    {item.guests?.avatar_url ? <img src={item.guests.avatar_url} className="w-full h-full object-cover"/> : (item.guests?.name?.charAt(0) || "?")}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-[#fadd7d]">{item.guests?.name || "Ẩn danh"}</p>
                                    <p className="text-[10px] text-gray-500 font-mono">{new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            {item.visibility === 'everyone' ? (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full whitespace-nowrap font-bold">👥 Công khai</span>
                            ) : (
                                <span className="text-xs bg-gray-700/40 text-gray-300 px-2 py-1 rounded-full whitespace-nowrap font-bold">🔒 Private</span>
                            )}
                        </div>
                        <p className="text-gray-300 text-sm italic leading-relaxed mb-6">"{item.content}"</p>
                        
                        {/* Tương tác của Admin */}
                        <div className="mt-auto pt-4 border-t border-[#222] flex items-center justify-between">
                            <div className="flex gap-4">
                                <button onClick={() => handleLikeConfession(item.id, item.likes_count)} className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors">
                                    <Heart size={16} className={item.likes_count > 0 ? "fill-red-500 text-red-500" : ""} /> {item.likes_count || 0}
                                </button>
                                <button onClick={() => handleCommentConfession(item.id)} className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-400 transition-colors">
                                    <MessageCircle size={16} /> Phản hồi
                                </button>
                            </div>
                        </div>
                        {item.admin_comment && (
                            <div className="mt-4 p-3 bg-black/40 rounded-xl border border-[#d4af37]/20">
                                <p className="text-[11px] text-[#fadd7d] font-bold uppercase mb-1">Bạn đã phản hồi:</p>
                                <p className="text-gray-400 text-xs italic">"{item.admin_comment}"</p>
                            </div>
                        )}
                     </div>
                 </div>
               ))
             }
           </div>
        )}

        {/* --- TAB: THÔNG TIN LỄ (GIAO DIỆN MỚI) --- */}
        {activeTab === 'info' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-[#111] border border-[#333] p-8 rounded-[2.5rem] space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-[#222] pb-6">
                        <div className="w-12 h-12 bg-[#d4af37]/10 rounded-2xl flex items-center justify-center border border-[#d4af37]/20">
                            <Info className="text-[#d4af37]" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight uppercase">Cấu hình thiệp mời</h3>
                            <p className="text-xs text-gray-500">Nội dung hiển thị mặt sau cho tất cả khách</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                        <InputField label="Thời gian" value={eventInfo.time_info} icon={<Calendar size={14}/>} placeholder="08:00 - 20/11" onChange={v => setEventInfo({...eventInfo, time_info: v})} />
                        <InputField label="Liên hệ" value={eventInfo.contact_info} icon={<Phone size={14}/>} placeholder="SĐT Host..." onChange={v => setEventInfo({...eventInfo, contact_info: v})} />
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2 px-1"><MapPin size={12}/> Địa điểm</label>
                            <textarea value={eventInfo.location_info || ""} onChange={e => setEventInfo({...eventInfo, location_info: e.target.value})} className="w-full bg-black border border-[#222] p-4 rounded-2xl text-sm focus:border-[#d4af37]/50 outline-none h-24 resize-none transition-all placeholder:text-gray-800" placeholder="Địa chỉ chi tiết..." />
                        </div>
                        <InputField label="Vị trí của bạn hiện tại" value={eventInfo.current_location} icon={<Map size={14}/>} placeholder="Sảnh A / Hội trường..." full onChange={v => setEventInfo({...eventInfo, current_location: v})} />
                    </div>

                    <button onClick={saveEventInfo} disabled={isSavingInfo} className="w-full bg-[#d4af37] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-[#d4af37]/10 disabled:opacity-50 uppercase tracking-widest text-xs">
                        {isSavingInfo ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>} Lưu cài đặt
                    </button>
                </div>
            </div>
        )}

        {/* Các Tab khác (Overview/Chat) giữ logic cũ */}
        {activeTab === 'overview' && (
           <div className="bg-[#111] border border-[#333] rounded-[2rem] overflow-hidden shadow-xl animate-in fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-gray-500 uppercase bg-[#1a1a1a] tracking-widest">
                    <tr><th className="px-6 py-5">Tên khách</th><th className="px-6 py-5">Nhóm</th><th className="px-6 py-5">Trạng thái</th><th className="px-6 py-5">Lời nhắn</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {guests.filter(g => !g.tags?.includes('admin')).map((guest) => (
                      <tr key={guest.id} className="hover:bg-[#d4af37]/5 transition-colors">
                        <td className="px-6 py-4 font-bold flex items-center gap-3 italic">
                           {guest.name}
                        </td>
                        <td className="px-6 py-4"><span className="bg-black border border-[#333] px-2 py-1 rounded text-[10px] text-gray-500 uppercase font-bold">{guest.tags?.[0] || 'Khách'}</span></td>
                        <td className="px-6 py-4 font-bold">{guest.is_confirmed ? (guest.attendance === 'Có tham dự' ? <span className="text-green-500">Tham gia</span> : <span className="text-red-500">Bận</span>) : <span className="text-gray-600">Chờ...</span>}</td>
                        <td className="px-6 py-4 text-gray-500 italic truncate max-w-xs">{guest.wish || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeTab === 'chat' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[70vh] animate-in fade-in">
                <div className="md:col-span-1 bg-[#111] border border-[#333] rounded-[2rem] p-4 flex flex-col h-full overflow-hidden">
                    <h3 className="text-gray-500 font-bold text-[10px] uppercase mb-4 flex items-center gap-2 px-2"><BellRing size={14} className="text-[#d4af37]" /> Kênh Chat</h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        {chatGroups.map(group => (
                            <button key={group.tag} onClick={() => { setSelectedGroup(group.tag); setUnreadGroupTags(prev => prev.filter(t => t !== group.tag)); }} className={`w-full text-left p-4 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 relative border ${selectedGroup === group.tag ? 'bg-[#d4af37] text-black' : 'bg-[#1a1a1a] text-gray-400 border-transparent hover:bg-[#222]'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${selectedGroup === group.tag ? 'bg-black/10' : 'bg-[#0a0a0a]'}`}>
                                    {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" alt=""/> : <Hash size={14}/>}
                                </div>
                                <span className="truncate flex-1 font-sans">{group.name}</span>
                                {unreadGroupTags.includes(group.tag) && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-3 h-full flex flex-col border border-[#333] rounded-[2rem] overflow-hidden bg-[#111] shadow-2xl relative">
                    <div className="absolute top-0 left-0 right-0 z-20 bg-[#1a1a1a]/90 p-3 border-b border-[#333] flex justify-between px-6 items-center">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-tighter">Đang xem: <span className="text-[#d4af37]">#{selectedGroup}</span></span>
                        <span className="text-[9px] bg-red-500/20 px-2 py-0.5 rounded text-red-400 font-bold uppercase">Chế độ Admin</span>
                    </div>
                    <div className="pt-10 h-full">
                        {adminUser ? <ChatGroup currentUser={adminUser} groupTag={selectedGroup} onBack={() => {}} onLeaveGroup={() => {}} /> : <Loader2 className="animate-spin mx-auto mt-20 text-[#d4af37]"/>}
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* MODAL CHI TIẾT LƯU BÚT */}
      {selectedConfessionDetail && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl h-[90vh] bg-[#111] border border-[#333] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#222] bg-[#0a0a0a]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[#d4af37] font-bold uppercase text-sm tracking-widest">Lưu bút từ {selectedConfessionDetail.guests?.name || 'Ẩn danh'}</h3>
                  {selectedConfessionDetail.visibility === 'everyone' ? (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">👥 Công khai</span>
                  ) : (
                    <span className="text-xs bg-gray-700/40 text-gray-300 px-2 py-1 rounded-full font-bold">🔒 Private</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{new Date(selectedConfessionDetail.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
              <button onClick={() => setSelectedConfessionDetail(null)} className="p-2 hover:bg-[#222] rounded-full transition-colors">
                <X size={20} className="text-gray-400"/>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Ảnh */}
              {selectedConfessionDetail.image_url && (
                <img src={selectedConfessionDetail.image_url} className="w-full h-auto max-h-[50%] object-cover" alt="Kỷ niệm" />
              )}

              {/* Nội dung */}
              <div className="p-6 space-y-6 flex-1">
                <div className="space-y-2">
                  <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Nội dung</p>
                  <p className="text-gray-100 text-lg leading-relaxed italic">"{selectedConfessionDetail.content}"</p>
                </div>

                {/* Thông tin người gửi */}
                <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-[#222]">
                  <div className="w-12 h-12 rounded-full bg-[#d4af37] text-black flex items-center justify-center font-bold overflow-hidden border-2 border-black">
                    {selectedConfessionDetail.guests?.avatar_url ? (
                      <img src={selectedConfessionDetail.guests.avatar_url} className="w-full h-full object-cover"/>
                    ) : (
                      selectedConfessionDetail.guests?.name?.charAt(0) || "?"
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#fadd7d]">{selectedConfessionDetail.guests?.name || 'Ẩn danh'}</p>
                    <p className="text-xs text-gray-500">Gửi vào {new Date(selectedConfessionDetail.created_at).toLocaleTimeString('vi-VN')}</p>
                  </div>
                </div>

                {/* Phản hồi hiện tại */}
                {(selectedConfessionDetail.likes_count > 0 || selectedConfessionDetail.admin_comment) && (
                  <div className="bg-black/50 p-4 rounded-2xl border border-[#d4af37]/20 space-y-4">
                    <p className="text-[#d4af37] text-xs font-black uppercase tracking-widest">Phản hồi của bạn</p>
                    
                    {selectedConfessionDetail.likes_count > 0 && (
                      <div className="flex items-center gap-2">
                        <Heart size={16} className="fill-red-500 text-red-500" />
                        <span className="text-gray-300 text-sm">Bạn đã thích lưu bút này</span>
                      </div>
                    )}

                    {selectedConfessionDetail.admin_comment && (
                      <div className="space-y-2">
                        <p className="text-gray-500 text-xs uppercase font-bold">💬 Bình luận:</p>
                        <p className="text-gray-200 text-sm italic">"{selectedConfessionDetail.admin_comment}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Actions */}
            <div className="p-4 border-t border-[#222] bg-[#0a0a0a] space-y-2">
              <button 
                onClick={() => {
                  handleLikeConfession(selectedConfessionDetail.id, selectedConfessionDetail.likes_count);
                  setSelectedConfessionDetail({...selectedConfessionDetail, likes_count: (selectedConfessionDetail.likes_count || 0) > 0 ? (selectedConfessionDetail.likes_count || 0) - 1 : 1});
                }}
                className="w-full py-3 bg-red-500/20 text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest hover:bg-red-500/30 transition-colors"
              >
                <Heart size={16} className={selectedConfessionDetail.likes_count > 0 ? "fill-red-500" : ""} /> 
                {selectedConfessionDetail.likes_count > 0 ? 'Bỏ thích' : 'Thích'}
              </button>
              <button 
                onClick={() => {
                  handleCommentConfession(selectedConfessionDetail.id);
                }}
                className="w-full py-3 bg-[#d4af37] text-black font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
              >
                <MessageCircle size={16} /> Bình luận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Component phụ ---
function StatCard({ label, value, icon, color, bg }: any) {
  return (
    <div className="bg-[#111] border border-[#333] p-4 rounded-3xl flex items-center gap-4 transition-all hover:scale-[1.02]">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bg} ${color}`}>{icon}</div>
      <div className="font-sans"><p className="text-gray-500 text-[10px] uppercase font-black tracking-widest opacity-60">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </div>
  );
}

function TabButton({ active, onClick, label, badge }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${active ? 'text-[#d4af37] border-[#d4af37]' : 'text-gray-600 border-transparent hover:text-white'}`}>
        {label}
        {badge > 0 && <span className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-bounce">{badge}</span>}
    </button>
  );
}

function InputField({ label, value, icon, placeholder, full, onChange }: { label: string; value: string; icon: React.ReactNode; placeholder: string; full?: boolean; onChange: (v: string) => void }) {
    return (
        <div className={`space-y-2 ${full ? 'md:col-span-2' : ''}`}>
            <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2 px-1">{icon} {label}</label>
            <input 
                value={value || ""} 
                onChange={e => onChange(e.target.value)} 
                className="w-full bg-black border border-[#222] p-4 rounded-2xl text-sm focus:border-[#d4af37]/50 outline-none transition-all placeholder:text-gray-800" 
                placeholder={placeholder} 
            />
        </div>
    )
}

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
)