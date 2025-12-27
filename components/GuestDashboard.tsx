"use client";

import MobileInvitation from "@/components/3d/InvitationCard";
import ChatGroup from "@/components/ChatGroup";
import NetworkSection, { ChatGroupInfo } from "@/components/NetworkSection"; 
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, HeartHandshake, ImagePlus, 
  Loader2, Send, Ticket, UserPlus, Users, Camera, Bell, BellRing,
  Crown, Volume2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// --- CONSTANTS ---
const HOST_INFO = {
  name: "Đức Kiên",
  shortName: "DK",
  role: "Chủ tiệc",
  isHost: true
};

// (Đã xóa NOTI_SOUND_URL vì chúng ta dùng code để tạo âm thanh trực tiếp)

interface DashboardProps {
  guest: any;
}

export default function GuestDashboard({ guest }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'wish' | 'chat' | 'card'>('chat');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadGroupTags, setUnreadGroupTags] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(guest.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ visible: boolean, title: string, content: string, avatar: string, groupTag?: string } | null>(null);
  
  // --- HỆ THỐNG ÂM THANH MỚI (WEB AUDIO API) ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Group Data
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]); 
  const [previewGroup, setPreviewGroup] = useState<ChatGroupInfo | null>(null); 
  const [activeChatTag, setActiveChatTag] = useState<string | null>(null); 
  const [previewMembers, setPreviewMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Wish Data
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. KHỞI TẠO AUDIO CONTEXT ---
  useEffect(() => {
      // Khởi tạo AudioContext (Bộ máy âm thanh của trình duyệt)
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
          audioContextRef.current = new AudioContext();
      }

      if ("Notification" in window) {
          setHasPermission(Notification.permission === "granted");
      }
  }, []);

  // --- 2. HÀM TỰ SINH ÂM THANH "BUBBLE POP" (Không cần file mp3) ---
  const playSystemSound = () => {
      try {
          const ctx = audioContextRef.current;
          if (!ctx) return;

          // Nếu Audio đang bị tạm dừng (do chưa tương tác), mở lại
          if (ctx.state === 'suspended') {
              ctx.resume();
          }

          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          // Cấu hình tiếng "Pop"
          oscillator.type = 'sine'; 
          const now = ctx.currentTime;
          
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
          
          gainNode.gain.setValueAtTime(0.5, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

          oscillator.start(now);
          oscillator.stop(now + 0.1);
      } catch (e) {
          console.error("Lỗi tạo âm thanh:", e);
      }
  };

  // --- 3. MỞ KHÓA ÂM THANH (BẮT BUỘC KHI USER CHẠM VÀO MÀN HÌNH) ---
  const unlockAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
              console.log("🔊 Audio Context đã được mở khóa!");
          });
      }
  };

  const requestPermission = async () => {
      unlockAudio(); 
      playSystemSound(); // Test tiếng ngay lập tức

      if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          setHasPermission(permission === "granted");
          if (permission === "granted") {
              triggerNotification({
                  sender_name: "Hệ thống",
                  content: "Đã bật thông báo thành công!",
                  avatar_url: null
              });
          }
      }
  };

  // --- 4. HÀM KÍCH HOẠT THÔNG BÁO ---
  const triggerNotification = (msg: any) => {
      console.log("🔔 Có tin nhắn mới:", msg);

      // A. Phát tiếng (Code-generated)
      playSystemSound();

      // B. Hiện Popup trong App
      setNotification({
          visible: true,
          title: msg.sender_name || "Tin nhắn mới",
          content: msg.content || "Đã gửi tin nhắn",
          avatar: msg.sender_avatar,
          groupTag: msg.group_tag 
      });
      setTimeout(() => setNotification(null), 4000);

      // C. Hiện Noti Trình Duyệt (Khi ẩn tab)
      const shouldNotifyBrowser = document.hidden || ("Notification" in window && Notification.permission === "granted");
      
      if (shouldNotifyBrowser) {
          try {
             const noti = new Notification(`Tin mới từ ${msg.sender_name}`, {
                 body: msg.content || "Nhấn để xem ngay",
                 icon: msg.sender_avatar && msg.sender_avatar.startsWith('http') ? msg.sender_avatar : undefined,
                 tag: 'chat-message',
                 silent: false // Tắt âm mặc định của trình duyệt để dùng âm của mình
             });
             
             noti.onclick = function() {
                 window.focus();
                 if (msg.group_tag) {
                     setActiveChatTag(msg.group_tag);
                     setActiveTab('chat');
                 }
                 noti.close();
             };
          } catch (e) { console.error(e); }
      }
  };

  const handleTestNotification = () => {
      triggerNotification({
          sender_name: "Test Hệ Thống",
          content: "Âm thanh Web Audio API hoạt động tốt!",
          sender_avatar: null,
          group_tag: null
      });
  };

  // --- CÁC HÀM LOGIC CŨ GIỮ NGUYÊN ---
  const getDisplayAvatar = () => { if (avatarUrl) return avatarUrl; return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(guest.name)}&backgroundColor=d4af37,111111`; };
  
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || e.target.files.length === 0) return; const file = e.target.files[0]; setIsUploadingAvatar(true); try { const fileExt = file.name.split('.').pop(); const fileName = `${guest.id}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('guest-avatars').upload(fileName, file, { upsert: true }); if (uploadError) throw uploadError; const { data: { publicUrl } } = supabase.storage.from('guest-avatars').getPublicUrl(fileName); const { error: dbError } = await supabase.from('guests').update({ avatar_url: publicUrl }).eq('id', guest.id); if (dbError) throw dbError; setAvatarUrl(publicUrl); guest.avatar_url = publicUrl; } catch (error) { console.error("Lỗi đổi avatar:", error); alert("Lỗi tải ảnh."); } finally { setIsUploadingAvatar(false); } };

  // Logic Nhóm
  useEffect(() => { const initGroups = async () => { const { data: dbGroups } = await supabase.from('group_members').select('group_tag').eq('guest_id', guest.id); let currentTags = dbGroups ? dbGroups.map((item: any) => item.group_tag) : []; if (!currentTags.includes('general')) { await supabase.from('group_members').insert({ group_tag: 'general', guest_id: guest.id }); currentTags.push('general'); } setJoinedGroups(currentTags); }; initGroups(); }, [guest.id]);
  useEffect(() => { if (activeChatTag) { setUnreadGroupTags(prev => prev.filter(tag => tag !== activeChatTag)); } }, [activeChatTag]);
  
  const fetchUnreadMessages = async () => { if (joinedGroups.length === 0) { setUnreadCount(0); return; } try { const { data: membersData } = await supabase.from('group_members').select('group_tag, last_viewed_at').eq('guest_id', guest.id).in('group_tag', joinedGroups); if (!membersData) return; const counts = await Promise.all(membersData.map(async (mem) => { const lastViewed = mem.last_viewed_at || '2000-01-01T00:00:00.000Z'; const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('group_tag', mem.group_tag).gt('created_at', lastViewed); if (count && count > 0) { setUnreadGroupTags(prev => prev.includes(mem.group_tag) ? prev : [...prev, mem.group_tag]); } return count || 0; })); setUnreadCount(counts.reduce((acc, curr) => acc + curr, 0)); } catch (error) { console.error(error); } };
  useEffect(() => { if (!activeChatTag) fetchUnreadMessages(); }, [joinedGroups, activeChatTag, guest.id]);

  // Realtime Listener
  useEffect(() => {
    if (joinedGroups.length === 0) return;
    const channel = supabase.channel('dashboard-noti-listener').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const newMsg = payload.new;
          const isMyGroup = joinedGroups.includes(newMsg.group_tag);
          const isNotMe = newMsg.sender_id !== guest.id;
          const isNotActive = activeChatTag !== newMsg.group_tag;
          if (isMyGroup && isNotMe && isNotActive) {
            setUnreadCount((prev) => prev + 1);
            setUnreadGroupTags(prev => prev.includes(newMsg.group_tag) ? prev : [...prev, newMsg.group_tag]);
            triggerNotification(newMsg); 
          }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [joinedGroups, activeChatTag, guest.id]);

  useEffect(() => { const channel = supabase.channel(`my_groups_update:${guest.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `guest_id=eq.${guest.id}` }, (payload: any) => { if (payload.new?.group_tag) { setJoinedGroups(prev => [...prev, payload.new.group_tag]); } }).subscribe(); return () => { supabase.removeChannel(channel); }; }, [guest.id]);

  const fetchRealMembers = async (groupTag: string) => { setLoadingMembers(true); try { const { data } = await supabase.from('group_members').select('guests(id, name, tags)').eq('group_tag', groupTag).limit(15); const realList = [{ id: 'admin-host', name: HOST_INFO.name, short: HOST_INFO.shortName, isHost: true }]; if (data) data.forEach((item: any) => { const g = item.guests; if (g && g.id !== guest.id && !g.tags?.includes('admin')) { realList.push({ id: g.id, name: g.name, short: g.name.charAt(0).toUpperCase(), isHost: false }); } }); setPreviewMembers(realList); } catch (e) { console.error(e); } setLoadingMembers(false); };
  const handlePreviewGroup = (group: ChatGroupInfo) => { if (joinedGroups.includes(group.tag_identifier)) { setActiveChatTag(group.tag_identifier); setPreviewGroup(null); } else { setPreviewGroup(group); setActiveChatTag(null); fetchRealMembers(group.tag_identifier); } };
  const handleJoinGroup = async () => { if (!previewGroup) return; setJoinedGroups(prev => [...prev, previewGroup.tag_identifier]); setActiveChatTag(previewGroup.tag_identifier); setPreviewGroup(null); try { await supabase.from('group_members').insert({ group_tag: previewGroup.tag_identifier, guest_id: guest.id, last_viewed_at: new Date().toISOString() }); } catch (e) { console.error(e); } };
  const handleLeaveGroup = (tag: string) => { setJoinedGroups(prev => prev.filter(t => t !== tag)); setActiveChatTag(null); };
  const handleSendConfession = async () => { if (!content && !file) return; setUploading(true); try { let publicUrl = null; if (file) { const fileExt = file.name.split('.').pop(); const fileName = `${guest.id}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('invitation-media').upload(fileName, file); if (uploadError) throw uploadError; publicUrl = supabase.storage.from('invitation-media').getPublicUrl(fileName).data.publicUrl; } await supabase.from('confessions').insert({ guest_id: guest.id, content: content, image_url: publicUrl }); setSent(true); setContent(""); setFile(null); } catch (error: any) { alert("Lỗi: " + error.message); } finally { setUploading(false); } };

  const handleNotificationClick = () => {
    if (notification?.groupTag && joinedGroups.includes(notification.groupTag)) {
        setActiveChatTag(notification.groupTag);
        setActiveTab('chat');
    }
    setNotification(null);
  };

  if (activeTab === 'card') {
    return (
      <div className="relative w-full h-[100dvh] bg-black">
        <MobileInvitation guestName={guest.name} guestId={guest.id} isConfirmed={true} initialAttendance={guest.attendance} initialWish={guest.wish} onTabChange={(tab) => setActiveTab(tab as any)}/>
      </div>
    );
  }

  return (
    <div 
        className="min-h-screen bg-[#0a0a0a] text-white pb-28 font-sans overflow-x-hidden relative"
        // QUAN TRỌNG: Mở khóa âm thanh khi người dùng chạm vào màn hình
        onClick={unlockAudio} 
        onTouchStart={unlockAudio}
    >
      
      {notification && (
          <div 
            className="fixed top-4 left-4 right-4 z-[100] bg-[#1a1a1a]/95 backdrop-blur-md border border-[#d4af37]/50 p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 cursor-pointer"
            onClick={handleNotificationClick}
          >
              <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333] overflow-hidden flex-shrink-0">
                  {notification.avatar && notification.avatar.startsWith('http') ? (
                      <img src={notification.avatar} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-[#d4af37] text-black">
                          {notification.avatar || "🔔"}
                      </div>
                  )}
              </div>
              <div className="flex-1 min-w-0">
                  <h4 className="text-[#d4af37] text-xs font-bold truncate">{notification.title}</h4>
                  <p className="text-gray-300 text-xs truncate">{notification.content}</p>
              </div>
              <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse"></div>
          </div>
      )}

      {/* HEADER */}
      <div className="p-6 pt-12 bg-gradient-to-b from-[#1a1a1a] to-transparent sticky top-0 z-40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-3">
               <div className="relative w-12 h-12 rounded-full border-2 border-[#d4af37] bg-[#222] overflow-hidden group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                   {isUploadingAvatar ? (
                       <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white" size={20}/></div>
                   ) : (
                       <img src={getDisplayAvatar()} alt="Avatar" className="w-full h-full object-cover" />
                   )}
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={16} className="text-white"/></div>
               </div>
               <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarChange} />

               <div>
                   <h1 className="text-xl font-bold text-[#d4af37]">Xin chào, {guest.name}</h1>
                   <div className="flex items-center gap-2">
                       <p className="text-gray-400 text-xs">Ấn vào avatar để thay đổi</p>
                       
                       {!hasPermission && (
                           <button onClick={requestPermission} className="text-[10px] bg-[#d4af37] text-black px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                               <BellRing size={10} /> Bật thông báo
                           </button>
                       )}
                   </div>
               </div>
           </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto">
        {activeTab === 'wish' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>
                <h2 className="text-[#fadd7d] font-bold uppercase tracking-widest text-xs flex items-center gap-2 relative z-10"><HeartHandshake size={16}/> Gửi lưu bút</h2>
                {sent ? (
                    <div className="py-8 text-center animate-in zoom-in duration-300">
                        <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-500/30"><Send className="text-green-500" size={20} /></div>
                        <p className="text-green-500 font-bold mb-1">Đã gửi thành công!</p>
                        <button onClick={() => setSent(false)} className="text-xs text-[#d4af37] underline">Gửi tiếp</button>
                    </div>
                ) : (
                    <div className="space-y-4 relative z-10">
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Viết vài dòng tâm sự..." className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm min-h-[100px] text-gray-200 focus:border-[#d4af37] focus:outline-none resize-none"/>
                        {file && <div className="flex items-center gap-2 bg-[#222] p-2 rounded-lg border border-[#333]"><p className="text-xs truncate text-gray-300 flex-1">{file.name}</p><button onClick={() => setFile(null)}><Loader2 size={14}/></button></div>}
                        <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-[#222] rounded-xl"><ImagePlus size={20}/></button>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => e.target.files && setFile(e.target.files[0])}/>
                            <button onClick={handleSendConfession} disabled={uploading} className="flex-1 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold rounded-xl flex items-center justify-center gap-2">{uploading ? <Loader2 className="animate-spin"/> : <Send size={18}/>} Gửi ngay</button>
                        </div>
                    </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'chat' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
             {!activeChatTag && !previewGroup && (
                 <NetworkSection 
                     currentGuestId={guest.id} 
                     currentTags={guest.tags || ['general']} 
                     joinedGroups={joinedGroups}
                     onPreviewGroup={handlePreviewGroup} 
                     onInvitePerson={() => {}}
                     unreadGroupTags={unreadGroupTags} 
                 />
             )}
             {previewGroup && (
                 <div className="flex flex-col h-[65vh] justify-between bg-[#111] border border-[#333] rounded-2xl p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                     <div className="absolute top-0 left-0 w-full h-40 pointer-events-none"><div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#111] to-[#111] z-10"></div>{previewGroup.avatar_url && <img src={previewGroup.avatar_url} className="w-full h-full object-cover opacity-50 blur-sm"/>}</div>
                     <div className="relative z-10">
                         <button onClick={() => setPreviewGroup(null)} className="absolute -top-2 -left-2 p-2.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md border border-white/10 z-20"><ArrowLeft size={18}/></button>
                         <div className="mt-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-tr from-[#222] to-[#333] border border-[#d4af37]/50 rounded-2xl mx-auto flex items-center justify-center text-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.15)] mb-4 overflow-hidden">{previewGroup.avatar_url ? <img src={previewGroup.avatar_url} className="w-full h-full object-cover"/> : <Users size={36} strokeWidth={1.5} />}</div>
                            <h2 className="text-xl font-bold text-white">{previewGroup.name}</h2>
                            <p className="text-gray-400 text-xs mt-1">{loadingMembers ? "Đang tải thành viên..." : `${Math.max(previewMembers.length, previewGroup.member_count)} thành viên tham gia`}</p>
                         </div>
                         <div className="mt-8">
                             <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Thành viên tiêu biểu</h3>
                             <div className="flex -space-x-3 justify-center py-2 flex-wrap gap-y-2">{loadingMembers ? <Loader2 className="animate-spin text-[#d4af37]" /> : previewMembers.map((mem, idx) => (<div key={mem.id || idx} className="relative z-10" style={{ zIndex: 50 - idx }}>{mem.isHost ? (<div className="relative"><div className="w-12 h-12 rounded-full border-2 border-[#d4af37] bg-black flex items-center justify-center text-[#d4af37] font-bold text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)]">{mem.short}</div><div className="absolute -top-1.5 -right-1.5 bg-[#d4af37] text-black w-5 h-5 rounded-full flex items-center justify-center border border-black"><Crown size={10} fill="black" /></div></div>) : (<div className="w-12 h-12 rounded-full border-2 border-[#111] bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-gray-300">{mem.short}</div>)}</div>))}</div>
                             <p className="text-center text-[10px] text-gray-500 mt-3 italic opacity-70 px-4">{previewGroup.desc || "Chào mừng bạn tham gia nhóm chat!"}</p>
                         </div>
                     </div>
                     <div className="relative z-10 mt-4 space-y-3"><button onClick={handleJoinGroup} className="w-full py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[#d4af37]/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"><UserPlus size={18} /> Tham gia ngay</button></div>
                 </div>
             )}
             {activeChatTag && (
                 <div className="flex flex-col h-[70vh] animate-in slide-in-from-right-10 duration-300"><div className="flex-1 overflow-hidden relative border border-[#333] rounded-2xl bg-[#111] shadow-2xl"><ChatGroup currentUser={{...guest, avatar_url: getDisplayAvatar()}} groupTag={activeChatTag} onBack={() => setActiveChatTag(null)} onLeaveGroup={() => handleLeaveGroup(activeChatTag)} /></div></div>
             )}
           </div>
        )}
      </div>

      <div className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-[#111]/90 backdrop-blur-xl border border-[#333] rounded-2xl p-2 flex justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-md mx-auto">
            <NavButton active={activeTab === 'wish'} icon={<Ticket size={20} />} label="Lưu bút" onClick={() => setActiveTab('wish')} />
            <NavButton active={activeTab === 'chat'} icon={<Users size={20} />} label="Kết nối" onClick={() => setActiveTab('chat')} badge={unreadCount} />
            <NavButton active={activeTab === ('card' as any)} icon={<ImagePlus size={20} />} label="Xem thiệp" onClick={() => setActiveTab('card')} />
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick, badge }: any) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20 -translate-y-1' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      <div className="relative">
        {icon}
        {badge > 0 && <span className={`absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ${active ? 'ring-[#d4af37]' : 'ring-[#111]'}`}>{badge > 9 ? '9+' : badge}</span>}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}