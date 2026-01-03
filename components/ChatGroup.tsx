"use client";

import { supabase } from "@/lib/supabase";
import {
    ArrowDown,
    ArrowLeft,
    Camera,
    Crown,
    Edit3,
    Grid,
    Image as ImageIcon,
    Info,
    Loader2,
    LogOut,
    Save,
    Send,
    UserPlus,
    Users,
    X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  image_url?: string;
  created_at: string;
  sender_avatar?: string;
}

interface ChatGroupProps {
  currentUser: any;
  groupTag: string;
  onBack: () => void; 
  onLeaveGroup?: () => void; 
}

export default function ChatGroup({ currentUser, groupTag, onBack, onLeaveGroup }: ChatGroupProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // State thông tin nhóm
  const [groupName, setGroupName] = useState(`Nhóm ${groupTag}`);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  
  // State Chỉnh sửa nhóm
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // State giao diện
  const [showInfo, setShowInfo] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false); 
  const [unreadInChat, setUnreadInChat] = useState(0); 
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  // --- 1. LẤY THÔNG TIN NHÓM TỪ DB ---
  useEffect(() => {
    const fetchGroupInfo = async () => {
        let name = groupTag === 'general' ? 'Hội trường chính' : `Nhóm ${groupTag}`;
        let avatar = null;

        const { data } = await supabase.from('chat_groups').select('*').eq('tag', groupTag).single();
        if (data) {
            if (data.name) name = data.name;
            if (data.avatar_url) avatar = data.avatar_url;
        }
        
        setGroupName(name);
        setGroupAvatar(avatar);
        setEditName(name); 
    };
    fetchGroupInfo();
  }, [groupTag]);

  // --- 2. HÀM CẬP NHẬT TRẠNG THÁI ĐÃ XEM ---
  const markAsRead = async () => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('group_tag', groupTag)
        .eq('guest_id', String(currentUser.id)); // Fix lỗi UUID/Text bằng ép kiểu tường minh

      if (error) console.error("❌ Lỗi cập nhật đã xem:", error.message);
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  };

  // --- 3. LOAD TIN NHẮN & REALTIME ---
  useEffect(() => {
    markAsRead(); // Cập nhật ngay khi vào nhóm

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('group_tag', groupTag)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    };
    
    fetchMessages();

    const channel = supabase.channel(`chat:${groupTag}`)
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `group_tag=eq.${groupTag}` 
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);

        const container = scrollContainerRef.current;
        if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
            
            if (newMsg.sender_id !== String(currentUser.id)) {
                if (isAtBottom) {
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                    markAsRead(); 
                } else {
                    setUnreadInChat(prev => prev + 1);
                    setShowScrollButton(true);
                }
            } else {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                markAsRead();
            }
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupTag, currentUser.id]);

  // --- 4. XỬ LÝ CUỘN ---
  const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (container.scrollHeight - container.scrollTop <= container.clientHeight + 50) { 
          if (unreadInChat > 0) {
              setShowScrollButton(false); 
              setUnreadInChat(0); 
              markAsRead(); 
          }
      }
  };

  const scrollToBottom = () => { 
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
      setShowScrollButton(false); 
      setUnreadInChat(0); 
      markAsRead(); 
  };

  // --- 5. GỬI TIN NHẮN ---
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && files.length === 0) || isSending) return;
    setIsSending(true);
    try {
      let imageUrls: string[] = [];
      if (files.length > 0) {
        imageUrls = await Promise.all(files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${groupTag}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error } = await supabase.storage.from('chat-media').upload(fileName, file);
          if (!error) {
            return supabase.storage.from('chat-media').getPublicUrl(fileName).data.publicUrl;
          }
          return "";
        }));
        imageUrls = imageUrls.filter(url => url); // Loại bỏ URLs rỗng
      }
      
      const userAvatar = currentUser.avatar_url || currentUser.shortName || currentUser.name?.charAt(0) || '?';

      const { error } = await supabase.from('messages').insert({ 
          group_tag: groupTag, 
          sender_id: String(currentUser.id), 
          sender_name: currentUser.name, 
          sender_avatar: userAvatar, 
          content: newMessage || "", 
          image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null 
      });

      if (!error) {
          setNewMessage(""); 
          setFiles([]);
          markAsRead();
      }
    } catch (e) { 
        console.error(e); 
    } finally { 
        setIsSending(false); 
    }
  };

  // --- 6. CẬP NHẬT THÔNG TIN NHÓM ---
  const handleUpdateGroupInfo = async () => {
    setIsSavingGroup(true);
    try {
        let newAvatarUrl = groupAvatar;
        if (editFile) {
            const fileExt = editFile.name.split('.').pop();
            const fileName = `${groupTag}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('group-avatars').upload(fileName, editFile, { upsert: true });
            if (!uploadError) {
                const { data } = supabase.storage.from('group-avatars').getPublicUrl(fileName);
                newAvatarUrl = data.publicUrl;
            }
        }
        const { error } = await supabase.from('chat_groups').upsert({
            tag: groupTag,
            name: editName,
            avatar_url: newAvatarUrl
        });
        if (!error) {
            setGroupName(editName);
            setGroupAvatar(newAvatarUrl);
            setIsEditingGroup(false);
            setEditFile(null);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setIsSavingGroup(false);
    }
  };

  return (
    <div className="flex h-full relative overflow-hidden bg-[#111]">
      {/* MODAL CHỈNH SỬA NHÓM */}
      {isEditingGroup && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-[#d4af37] font-bold text-center mb-4 uppercase text-xs tracking-widest">Cập nhật nhóm</h3>
                  <div className="flex justify-center mb-4 relative">
                      <div className="w-20 h-20 rounded-full border-2 border-[#d4af37] overflow-hidden bg-[#222] relative group">
                          <img 
                            src={editFile ? URL.createObjectURL(editFile) : (groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${groupTag}`)} 
                            className="w-full h-full object-cover" 
                            alt="Group"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                              <Camera size={24} className="text-white"/>
                          </div>
                      </div>
                      <input type="file" ref={groupAvatarInputRef} hidden accept="image/*" onChange={(e) => e.target.files && setEditFile(e.target.files[0])}/>
                  </div>
                  <div className="space-y-1 mb-4">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Tên nhóm</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-[#111] border border-[#333] rounded-lg p-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"/>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setIsEditingGroup(false)} className="flex-1 py-2 bg-[#222] text-gray-400 rounded-lg text-xs font-bold">Hủy</button>
                      <button onClick={handleUpdateGroupInfo} disabled={isSavingGroup} className="flex-1 py-2 bg-[#d4af37] text-black rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                          {isSavingGroup ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Lưu
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex flex-col h-full w-full">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#1a1a1a]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[#333] text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-8 h-8 rounded-full border border-[#333] bg-[#222] overflow-hidden flex-shrink-0">
                        {groupAvatar ? <img src={groupAvatar} className="w-full h-full object-cover" alt="Group"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 font-bold">{groupTag.substring(0,2).toUpperCase()}</div>}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-[#d4af37] text-sm truncate">{groupName}</h3>
                    </div>
                </div>
            </div>
            <div className="flex gap-1">
                <button onClick={() => setIsEditingGroup(true)} className="p-2 rounded-full text-gray-400 hover:text-[#d4af37] hover:bg-[#333] transition-colors"><Edit3 size={18} /></button>
                <button onClick={() => setShowInfo(!showInfo)} className={`p-2 rounded-full transition-colors ${showInfo ? 'text-[#d4af37] bg-[#333]' : 'text-gray-400 hover:text-white'}`}><Info size={20} /></button>
            </div>
        </div>

        {/* MESSAGES LIST */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[#111] relative">
          {messages.map((msg, index) => {
            const isMe = String(msg.sender_id) === String(currentUser.id);
            const isHost = msg.sender_name?.includes("(Chủ tiệc)") || msg.sender_name?.includes("Admin");
            const imageUrls = msg.image_url ? (msg.image_url.startsWith('[') ? JSON.parse(msg.image_url) : [msg.image_url]) : [];
            return (
              <div key={msg.id || index} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border overflow-hidden ${isHost ? "bg-black border-[#d4af37] text-[#d4af37]" : "bg-[#333] border-[#444] text-white"}`}>
                        {isHost ? <Crown size={12} fill="#d4af37" /> : msg.sender_avatar && msg.sender_avatar.startsWith("http") ? <img src={msg.sender_avatar} className="w-full h-full object-cover" alt="avt"/> : <span className="uppercase">{msg.sender_avatar || msg.sender_name?.charAt(0) || '?'}</span>}
                    </div>
                </div>
                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
                    {!isMe && <span className="text-[10px] text-gray-500 ml-1">{msg.sender_name}</span>}
                    <div className={`p-3 rounded-2xl text-sm shadow-sm min-w-0 ${isMe ? "bg-[#d4af37] text-black rounded-tr-none" : "bg-[#222] text-gray-200 rounded-tl-none border border-[#333]"}`}>
                       {imageUrls.length > 0 && (
                           <div className={`mb-2 grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : imageUrls.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                               {imageUrls.map((url: string, idx: number) => (
                                   <div key={idx} className="rounded-lg overflow-hidden cursor-pointer border border-black/10 group relative" onClick={() => setPreviewImage(url)}>
                                       <img src={url} className="w-full h-auto object-cover max-h-60" loading="lazy" alt="shared"/>
                                   </div>
                               ))}
                           </div>
                       )}
                       {msg.content && <p className="whitespace-pre-wrap leading-relaxed break-all overflow-hidden">{msg.content}</p>}
                    </div>
                    <span className="text-[9px] text-gray-600 px-1 select-none">{new Date(msg.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
          {showScrollButton && (
              <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10 animate-in slide-in-from-bottom-2 fade-in">
                  <button onClick={scrollToBottom} className="bg-[#d4af37] text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                      <ArrowDown size={14} /> {unreadInChat > 0 ? `Tin nhắn mới (${unreadInChat})` : "Cuộn xuống"}
                  </button>
              </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-3 bg-[#1a1a1a] border-t border-[#333]">
          {files.length > 0 && (
              <div className="flex items-center gap-2 mb-3 bg-[#111] p-2 rounded-lg border border-[#333] overflow-x-auto scrollbar-hide w-full shadow-lg animate-in slide-in-from-bottom-2">
                  {files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-[#222] p-2 rounded border border-[#333] flex-shrink-0">
                          <div className="w-10 h-10 relative rounded overflow-hidden border border-[#333]"><img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`preview-${idx}`}/></div>
                          <button onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-red-400 transition-colors"><X size={14}/></button>
                      </div>
                  ))}
              </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-[#222] text-gray-400 hover:text-white border border-[#333]"><ImageIcon size={20} /></button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={(e) => {
              const newFiles = e.target.files ? Array.from(e.target.files) : [];
              if (newFiles.length > 0) {
                setFiles(prev => [...prev.slice(0, 9), ...newFiles].slice(0, 10)); // Max 10 files
                e.target.value = ''; // Reset input
              }
            }}/>
            <div className="flex-1 bg-[#222] rounded-xl flex items-center px-3 py-1 border border-[#333]">
                <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Nhập tin nhắn..." className="w-full bg-transparent border-none focus:ring-0 text-white text-sm max-h-24 py-2 resize-none placeholder:text-gray-600 scrollbar-hide focus:outline-none" rows={1}/>
            </div>
            <button onClick={handleSendMessage} disabled={isSending || (!newMessage.trim() && files.length === 0)} className="p-3 rounded-xl bg-[#d4af37] text-black hover:bg-[#b89628] disabled:opacity-50 transition-all shadow-md active:scale-95">
                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className={`absolute top-0 right-0 h-full w-72 bg-[#1a1a1a] border-l border-[#333] transform transition-transform duration-300 z-30 shadow-2xl ${showInfo ? "translate-x-0" : "translate-x-full"}`}>
          <ChatInfoSidebar groupTag={groupTag} currentUser={currentUser} onClose={() => setShowInfo(false)} messages={messages} onLeave={onLeaveGroup}/>
      </div>

      {/* PREVIEW IMAGE */}
      {previewImage && (
          <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
              <button className="absolute top-4 right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"><X size={24}/></button>
              <img src={previewImage} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain cursor-zoom-out" alt="Preview"/>
          </div>
      )}
    </div>
  );
}

function ChatInfoSidebar({ groupTag, currentUser, onClose, messages, onLeave }: any) {
    const [activeTab, setActiveTab] = useState<'members' | 'media'>('members');
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [confirmPerson, setConfirmPerson] = useState<any>(null);
    const [isAddingMember, setIsAddingMember] = useState(false);

    const mediaList = messages.filter((m: any) => m.image_url);

    useEffect(() => {
        if (activeTab === 'members') {
            const fetchMembers = async () => {
                setLoading(true);
                // FETCH THÊM avatar_url TỪ BẢNG GUESTS
                const { data } = await supabase.from('group_members').select('guests(id, name, tags, avatar_url)').eq('group_tag', groupTag);
                const list = data?.map((i: any) => ({ 
                    id: i.guests.id, 
                    name: i.guests.name, 
                    avatar_url: i.guests.avatar_url, 
                    isAdmin: i.guests.tags?.includes('admin') 
                })) || [];
                if (!list.find(m => m.isAdmin)) list.unshift({ id: "admin", name: "Đức Kiên", isAdmin: true, avatar_url: null });
                setMembers(list);
                setLoading(false);
            };
            fetchMembers();
        }
    }, [activeTab, groupTag, isAdding, currentUser.avatar_url]);

    const fetchCandidates = async () => {
        setLoadingCandidates(true);
        const { data: allGuests } = await supabase.from('guests').select('id, name, tags');
        const currentMemberIds = members.map(m => String(m.id));
        const userTags = currentUser.tags || [];
        const available = allGuests?.filter((g: any) => {
            if (currentMemberIds.includes(String(g.id)) || String(g.id) === String(currentUser.id)) return false;
            const candidateTags = g.tags || [];
            return userTags.some((t: string) => candidateTags.includes(t));
        }) || [];
        setCandidates(available);
        setLoadingCandidates(false);
    };

    const handleAddMember = async (guestId: string) => {
        const person = candidates.find(c => c.id === guestId);
        if (person) {
            setConfirmPerson(person);
        }
    };

    const confirmAddMember = async () => {
        if (!confirmPerson) return;
        setIsAddingMember(true);
        try {
            await supabase.from('group_members').insert({ group_tag: groupTag, guest_id: String(confirmPerson.id) });
            setCandidates(prev => prev.filter(c => c.id !== confirmPerson.id));
            
            // Refresh members list
            const { data } = await supabase.from('group_members').select('guests(id, name, tags, avatar_url)').eq('group_tag', groupTag);
            const list = data?.map((i: any) => ({ 
                id: i.guests.id, 
                name: i.guests.name, 
                avatar_url: i.guests.avatar_url, 
                isAdmin: i.guests.tags?.includes('admin') 
            })) || [];
            if (!list.find(m => m.isAdmin)) list.unshift({ id: "admin", name: "Đức Kiên", isAdmin: true, avatar_url: null });
            setMembers(list);
            
            setConfirmPerson(null);
        } catch (error) { 
            alert("Lỗi khi thêm thành viên."); 
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (confirm("Bạn có muốn rời nhóm này?")) {
            try {
                await supabase.from('group_members').delete().match({ group_tag: groupTag, guest_id: String(currentUser.id) });
                if (onLeave) onLeave();
            } catch (error) { alert("Lỗi khi rời nhóm"); }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1a1a1a]">
            <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#111]">
                <h3 className="font-bold text-[#d4af37] text-sm uppercase">Thông tin nhóm</h3>
                <button onClick={onClose} className="p-1 hover:bg-[#333] rounded transition-colors"><X size={18} className="text-gray-400 hover:text-white"/></button>
            </div>
            <div className="flex border-b border-[#333] bg-[#222]">
                <button onClick={() => setActiveTab('members')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeTab === 'members' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-500 hover:text-white'}`}><Users size={14} /> Thành viên</button>
                <button onClick={() => setActiveTab('media')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeTab === 'media' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-500 hover:text-white'}`}><Grid size={14} /> Media ({mediaList.length})</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-[#1a1a1a]">
                {activeTab === 'members' ? (
                    <>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => { setIsAdding(!isAdding); if (!isAdding) fetchCandidates(); }} className={`flex-1 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${isAdding ? 'bg-[#333] border-[#555] text-white' : 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/20'}`}>
                                {isAdding ? <X size={14}/> : <UserPlus size={14}/>} {isAdding ? "Hủy" : "Thêm người"}
                            </button>
                            {groupTag !== 'general' && (
                                <button onClick={handleLeaveGroup} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 text-xs font-bold"><LogOut size={14}/></button>
                            )}
                        </div>
                        {isAdding && (
                            <div className="mb-4 p-3 bg-[#111] rounded-xl border border-[#333] animate-in zoom-in-95">
                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Người quen cùng nhóm:</p>
                                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
                                    {loadingCandidates ? <Loader2 className="animate-spin mx-auto text-gray-500" size={16}/> : candidates.length === 0 ? <p className="text-center text-xs text-gray-500">Không có ai phù hợp.</p> : 
                                        candidates.map(c => (
                                            <div key={c.id} className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg cursor-pointer group" onClick={() => handleAddMember(c.id)}>
                                                <span className="text-xs text-gray-300">{c.name}</span>
                                                <UserPlus size={14} className="text-[#d4af37] opacity-0 group-hover:opacity-100 transition-opacity"/>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                        <div className="space-y-3">
                            {loading ? <div className="text-center text-xs text-gray-500">Đang tải...</div> : members.map((mem, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-lg transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border ${mem.isAdmin ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-[#333] text-gray-300 border-[#444]'} overflow-hidden`}>
                                        {mem.avatar_url ? <img src={mem.avatar_url} className="w-full h-full object-cover" alt="avatar" /> : mem.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs truncate font-medium ${mem.isAdmin ? 'text-[#d4af37]' : 'text-gray-200'}`}>{mem.name}</p>
                                        {mem.isAdmin && <p className="text-[9px] text-gray-500">Quản trị viên</p>}
                                    </div>
                                    {mem.isAdmin && <Crown size={14} className="text-[#d4af37]" />}
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {mediaList.length === 0 ? <div className="col-span-3 text-center text-gray-500 text-xs py-10">Chưa có ảnh nào</div> : 
                            mediaList.flatMap((m: any) => {
                              const urls = m.image_url ? (m.image_url.startsWith('[') ? JSON.parse(m.image_url) : [m.image_url]) : [];
                              return urls.map((url: string, idx: number) => (
                                <div key={`${m.id}-${idx}`} className="aspect-square bg-[#222] rounded-lg overflow-hidden border border-[#333] cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                  <img src={url} className="w-full h-full object-cover" alt="media"/>
                                </div>
                              ));
                            })
                        }
                    </div>
                )}
            </div>

            {/* CONFIRMATION DIALOG */}
            {confirmPerson && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-[#333] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
                        <h3 className="text-lg font-bold text-white mb-2">Xác nhận thêm thành viên</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Bạn có chắc muốn thêm <span className="text-[#d4af37] font-bold">{confirmPerson.name}</span> vào nhóm này?
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmPerson(null)}
                                className="flex-1 py-2 rounded-lg bg-[#222] text-gray-300 hover:bg-[#333] font-bold text-sm transition-colors"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={confirmAddMember}
                                disabled={isAddingMember}
                                className="flex-1 py-2 rounded-lg bg-[#d4af37] text-black hover:bg-[#b89628] font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAddingMember ? <Loader2 size={16} className="animate-spin" /> : "Xác nhận"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}