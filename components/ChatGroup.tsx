"use client";

import { supabase } from "@/lib/supabase";
import { 
  Send, Image as ImageIcon, X, Loader2, Info, 
  Users, Grid, Crown, ZoomIn, ArrowLeft, ArrowDown, 
  LogOut, UserPlus, Camera, Edit3, Save 
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
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // State thông tin nhóm (Tên & Avatar)
  const [groupName, setGroupName] = useState(`Nhóm ${groupTag}`);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  
  // State Chỉnh sửa nhóm
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // State giao diện khác
  const [showInfo, setShowInfo] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false); 
  const [unreadInChat, setUnreadInChat] = useState(0); 
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  // --- HÀM: LẤY THÔNG TIN NHÓM TỪ DB ---
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

  // --- HÀM: LƯU THÔNG TIN NHÓM ---
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
              alert("Cập nhật nhóm thành công!");
          } else {
              alert("Lỗi cập nhật nhóm.");
          }

      } catch (error) {
          console.error(error);
      } finally {
          setIsSavingGroup(false);
      }
  };

  const markAsRead = async () => {
      await supabase.from('group_members').update({ last_viewed_at: new Date().toISOString() }).match({ group_tag: groupTag, guest_id: currentUser.id });
  };

  useEffect(() => {
    markAsRead();
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('group_tag', groupTag).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
    const channel = supabase.channel(`chat:${groupTag}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_tag=eq.${groupTag}` }, 
      (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        const container = scrollContainerRef.current;
        if (container) {
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            if (isAtBottom) { setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); markAsRead(); } 
            else { setUnreadInChat(prev => prev + 1); setShowScrollButton(true); }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupTag]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView(); }, []);

  const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (container.scrollHeight - container.scrollTop <= container.clientHeight + 50) { setShowScrollButton(false); setUnreadInChat(0); markAsRead(); }
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); setShowScrollButton(false); setUnreadInChat(0); markAsRead(); };

  // --- [SỬA ĐỔI QUAN TRỌNG] ---
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !file) || isSending) return;
    setIsSending(true);
    try {
      let imageUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${groupTag}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error } = await supabase.storage.from('chat-media').upload(fileName, file);
        if (!error) imageUrl = supabase.storage.from('chat-media').getPublicUrl(fileName).data.publicUrl;
      }
      
      // 1. LẤY AVATAR TỪ URL NẾU CÓ, NẾU KHÔNG DÙNG SHORTNAME
      const userAvatar = currentUser.avatar_url || currentUser.shortName || currentUser.name?.charAt(0) || '?';

      await supabase.from('messages').insert({ 
          group_tag: groupTag, 
          sender_id: currentUser.id, 
          sender_name: currentUser.name, 
          sender_avatar: userAvatar, // <-- Dùng biến này
          content: newMessage || "", 
          image_url: imageUrl 
      });

      setNewMessage(""); setFile(null); setTimeout(scrollToBottom, 100); markAsRead();
    } catch (e) { console.error(e); } finally { setIsSending(false); }
  };

  return (
    <div className="flex h-full relative overflow-hidden bg-[#111]">
      
      {/* MODAL CHỈNH SỬA NHÓM */}
      {isEditingGroup && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-[#d4af37] font-bold text-center mb-4 uppercase text-xs tracking-widest">Cập nhật thông tin nhóm</h3>
                  
                  <div className="flex justify-center mb-4 relative">
                      <div className="w-20 h-20 rounded-full border-2 border-[#d4af37] overflow-hidden bg-[#222] relative group">
                          <img src={editFile ? URL.createObjectURL(editFile) : (groupAvatar || `https://placehold.co/100x100/222/d4af37?text=${groupTag.substring(0,2).toUpperCase()}`)} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                              <Camera size={24} className="text-white"/>
                          </div>
                      </div>
                      <input type="file" ref={groupAvatarInputRef} hidden accept="image/*" onChange={(e) => e.target.files && setEditFile(e.target.files[0])}/>
                  </div>

                  <div className="space-y-1 mb-4">
                      <label className="text-[10px] text-gray-500 font-bold uppercase">Tên nhóm</label>
                      <input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#111] border border-[#333] rounded-lg p-2 text-sm text-white focus:border-[#d4af37] focus:outline-none"
                        placeholder="Đặt tên nhóm..."
                      />
                  </div>

                  <div className="flex gap-2">
                      <button onClick={() => { setIsEditingGroup(false); setEditFile(null); }} className="flex-1 py-2 bg-[#222] text-gray-400 rounded-lg text-xs font-bold hover:bg-[#333]">Hủy</button>
                      <button onClick={handleUpdateGroupInfo} disabled={isSavingGroup} className="flex-1 py-2 bg-[#d4af37] text-black rounded-lg text-xs font-bold hover:bg-[#b89628] flex items-center justify-center gap-1">
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
                        {groupAvatar ? <img src={groupAvatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 font-bold">{groupTag.substring(0,2).toUpperCase()}</div>}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-[#d4af37] text-sm truncate">{groupName}</h3>
                        <p className="text-[10px] text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-1">
                <button onClick={() => setIsEditingGroup(true)} className="p-2 rounded-full text-gray-400 hover:text-[#d4af37] hover:bg-[#333] transition-colors">
                    <Edit3 size={18} />
                </button>
                <button onClick={() => setShowInfo(!showInfo)} className={`p-2 rounded-full transition-colors ${showInfo ? 'text-[#d4af37] bg-[#333]' : 'text-gray-400 hover:text-white'}`}>
                    <Info size={20} />
                </button>
            </div>
        </div>

        {/* LIST TIN NHẮN */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[#111] relative">
          {messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const isHost = msg.sender_name.includes("(Chủ tiệc)") || msg.sender_name.includes("Admin");
            return (
              <div key={msg.id || index} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="flex flex-col items-center gap-1">
                    {/* 2. HIỂN THỊ AVATAR LÀ ẢNH NẾU CÓ URL */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border overflow-hidden ${isHost ? "bg-black border-[#d4af37] text-[#d4af37]" : "bg-[#333] border-[#444] text-white"}`}>
                        {isHost ? (
                            <Crown size={12} fill="#d4af37" />
                        ) : msg.sender_avatar && msg.sender_avatar.startsWith("http") ? (
                            <img src={msg.sender_avatar} className="w-full h-full object-cover" alt="avt"/>
                        ) : (
                            msg.sender_avatar
                        )}
                    </div>
                </div>
                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
                   {!isMe && <span className="text-[10px] text-gray-500 ml-1">{msg.sender_name}</span>}
                   <div className={`p-3 rounded-2xl text-sm shadow-sm ${isMe ? "bg-[#d4af37] text-black rounded-tr-none" : "bg-[#222] text-gray-200 rounded-tl-none border border-[#333]"}`}>
                      {msg.image_url && (
                          <div className="mb-2 rounded-lg overflow-hidden cursor-pointer border border-black/10 group relative" onClick={() => setPreviewImage(msg.image_url!)}>
                              <img src={msg.image_url} className="max-w-full h-auto object-cover max-h-60" loading="lazy" />
                          </div>
                      )}
                      {msg.content && <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>}
                   </div>
                   <span className="text-[9px] text-gray-600 px-1 select-none">{new Date(msg.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
          {showScrollButton && unreadInChat > 0 && (
              <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10 animate-in slide-in-from-bottom-2 fade-in">
                  <button onClick={scrollToBottom} className="bg-[#d4af37] text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-[#b89628] transition-transform active:scale-95">
                      <ArrowDown size={14} /> Tin nhắn mới ({unreadInChat})
                  </button>
              </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-3 bg-[#1a1a1a] border-t border-[#333]">
          {file && (
              <div className="flex items-center gap-3 mb-3 bg-[#111] p-2 rounded-lg border border-[#333] w-fit shadow-lg animate-in slide-in-from-bottom-2">
                  <div className="w-12 h-12 relative rounded overflow-hidden border border-[#333]"><img src={URL.createObjectURL(file)} className="w-full h-full object-cover" /></div>
                  <button onClick={() => setFile(null)} className="p-1.5 hover:bg-[#333] rounded-full text-gray-400 hover:text-red-400 transition-colors"><X size={14}/></button>
              </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-[#222] text-gray-400 hover:text-white border border-[#333]"><ImageIcon size={20} /></button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => e.target.files && setFile(e.target.files[0])}/>
            <div className="flex-1 bg-[#222] rounded-xl flex items-center px-3 py-1 border border-[#333]">
                <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Nhập tin nhắn..." className="w-full bg-transparent border-none focus:ring-0 text-white text-sm max-h-24 py-2 resize-none placeholder:text-gray-600 scrollbar-hide focus:outline-none" rows={1}/>
            </div>
            <button onClick={handleSendMessage} disabled={isSending || (!newMessage.trim() && !file)} className="p-3 rounded-xl bg-[#d4af37] text-black hover:bg-[#b89628] disabled:opacity-50 transition-all shadow-md active:scale-95">
                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className={`absolute top-0 right-0 h-full w-72 bg-[#1a1a1a] border-l border-[#333] transform transition-transform duration-300 z-30 shadow-2xl ${showInfo ? "translate-x-0" : "translate-x-full"}`}>
          <ChatInfoSidebar 
            groupTag={groupTag} 
            currentUser={currentUser} 
            onClose={() => setShowInfo(false)} 
            messages={messages}
            onLeave={onLeaveGroup}
          />
      </div>
      {previewImage && (
          <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
              <button className="absolute top-4 right-4 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"><X size={24}/></button>
              <img src={previewImage} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain cursor-zoom-out" />
          </div>
      )}
    </div>
  );
}

// --- SIDEBAR CẬP NHẬT ---
function ChatInfoSidebar({ groupTag, currentUser, onClose, messages, onLeave }: any) {
    const [activeTab, setActiveTab] = useState<'members' | 'media'>('members');
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // State cho tính năng ADD MEMBER
    const [isAdding, setIsAdding] = useState(false);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    const mediaList = messages.filter((m: any) => m.image_url);

    // Fetch members
    useEffect(() => {
        if (activeTab === 'members') {
            const fetchMembers = async () => {
                setLoading(true);
                const { data } = await supabase.from('group_members').select('guests(id, name, tags)').eq('group_tag', groupTag);
                const list = data?.map((i: any) => ({ id: i.guests.id, name: i.guests.name, isAdmin: i.guests.tags?.includes('admin') })) || [];
                if (!list.find(m => m.isAdmin)) list.unshift({ id: "admin", name: "Đức Kiên", isAdmin: true });
                setMembers(list);
                setLoading(false);
            };
            fetchMembers();
        }
    }, [activeTab, groupTag, isAdding]); // Reload khi isAdding tắt

    // --- HÀM LẤY DANH SÁCH MỜI (CẬP NHẬT LOGIC LỌC TAG) ---
    const fetchCandidates = async () => {
        setLoadingCandidates(true);
        // 1. Lấy tất cả guests kèm tags
        const { data: allGuests } = await supabase.from('guests').select('id, name, tags');
        
        // 2. Lấy ID những người đang trong nhóm
        const currentMemberIds = members.map(m => m.id);
        
        // 3. Lấy Tags của user hiện tại
        const userTags = currentUser.tags || [];

        // 4. Lọc
        const available = allGuests?.filter((g: any) => {
            // Loại bỏ những người đã ở trong nhóm hoặc là chính mình
            if (currentMemberIds.includes(g.id) || g.id === currentUser.id) return false;

            // Kiểm tra "Cùng Tag": Người được mời phải có ít nhất 1 tag trùng với người mời
            const candidateTags = g.tags || [];
            const hasCommonTag = userTags.some((t: string) => candidateTags.includes(t));

            return hasCommonTag;
        }) || [];

        setCandidates(available);
        setLoadingCandidates(false);
    };

    const handleAddMember = async (guestId: string) => {
        try {
            await supabase.from('group_members').insert({
                group_tag: groupTag,
                guest_id: guestId
            });
            // Update UI
            setCandidates(prev => prev.filter(c => c.id !== guestId));
            alert("Đã thêm thành viên thành công!");
        } catch (error) {
            console.error(error);
            alert("Lỗi khi thêm thành viên.");
        }
    };

    const handleLeaveGroup = async () => {
        if (confirm("Bạn có chắc chắn muốn rời khỏi nhóm này không?")) {
            try {
                await supabase.from('group_members').delete().match({ group_tag: groupTag, guest_id: currentUser.id });
                if (onLeave) onLeave();
            } catch (error) {
                alert("Lỗi khi rời nhóm");
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1a1a1a]">
            <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#111]">
                <h3 className="font-bold text-[#d4af37] text-sm uppercase">Thông tin nhóm</h3>
                <button onClick={onClose} className="p-1 hover:bg-[#333] rounded transition-colors"><X size={18} className="text-gray-400 hover:text-white"/></button>
            </div>
            
            {/* TABS */}
            <div className="flex border-b border-[#333] bg-[#222]">
                <button onClick={() => setActiveTab('members')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeTab === 'members' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-500 hover:text-white'}`}><Users size={14} /> Thành viên</button>
                <button onClick={() => setActiveTab('media')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeTab === 'media' ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-gray-500 hover:text-white'}`}><Grid size={14} /> Media ({mediaList.length})</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#1a1a1a] relative">
                {activeTab === 'members' ? (
                    <>
                        {/* NÚT TÍNH NĂNG */}
                        <div className="flex gap-2 mb-4">
                             {/* Nút THÊM THÀNH VIÊN */}
                            <button 
                                onClick={() => { setIsAdding(!isAdding); if (!isAdding) fetchCandidates(); }}
                                className={`flex-1 py-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${isAdding ? 'bg-[#333] border-[#555] text-white' : 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/20'}`}
                            >
                                {isAdding ? <X size={14}/> : <UserPlus size={14}/>} {isAdding ? "Hủy" : "Thêm người"}
                            </button>
                            
                             {/* Nút RỜI NHÓM (Chỉ hiện nếu không phải nhóm General) */}
                            {groupTag !== 'general' && (
                                <button onClick={handleLeaveGroup} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 text-xs font-bold">
                                    <LogOut size={14}/>
                                </button>
                            )}
                        </div>

                        {/* LIST ADD MEMBER */}
                        {isAdding && (
                            <div className="mb-4 p-3 bg-[#111] rounded-xl border border-[#333] animate-in zoom-in-95">
                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Người quen (Cùng nhóm):</p>
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {loadingCandidates ? <Loader2 className="animate-spin mx-auto text-gray-500" size={16}/> : candidates.length === 0 ? <p className="text-center text-xs text-gray-500">Không tìm thấy ai phù hợp.</p> : 
                                        candidates.map(c => (
                                            <div key={c.id} className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg cursor-pointer group" onClick={() => handleAddMember(c.id)}>
                                                <span className="text-xs text-gray-300">{c.name}</span>
                                                <div className="w-5 h-5 bg-[#d4af37] text-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><UserPlus size={10}/></div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}

                        {/* LIST MEMBERS */}
                        <div className="space-y-3">
                            {loading ? <div className="text-center text-xs text-gray-500">Đang tải...</div> : members.map((mem, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-lg transition-colors"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${mem.isAdmin ? 'bg-[#d4af37] text-black' : 'bg-[#333] text-gray-300'}`}>{mem.name.charAt(0)}</div><div className="flex-1 min-w-0"><p className={`text-xs truncate font-medium ${mem.isAdmin ? 'text-[#d4af37]' : 'text-gray-200'}`}>{mem.name}</p>{mem.isAdmin && <p className="text-[9px] text-gray-500 mt-0.5">Quản trị viên</p>}</div>{mem.isAdmin && <Crown size={14} className="text-[#d4af37]" />}</div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-3 gap-2">{mediaList.length === 0 ? <div className="col-span-3 text-center text-gray-500 text-xs py-10">Chưa có ảnh nào</div> : mediaList.map((m: any) => (<div key={m.id} className="aspect-square bg-[#222] rounded-lg overflow-hidden border border-[#333] cursor-pointer" onClick={() => (window as any).open(m.image_url, '_blank')}><img src={m.image_url} className="w-full h-full object-cover"/></div>))}</div>
                )}
            </div>
        </div>
    );
}