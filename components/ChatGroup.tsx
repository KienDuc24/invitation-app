"use client";

import { supabase } from "@/lib/supabase";
import { 
  Send, Image as ImageIcon, X, Loader2, Info, 
  Users, Grid, Crown, ZoomIn, ArrowLeft, ArrowDown 
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
}

export default function ChatGroup({ currentUser, groupTag, onBack }: ChatGroupProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // State giao diện
  const [showInfo, setShowInfo] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // State Scroll & New Message
  const [showScrollButton, setShowScrollButton] = useState(false); // Hiện nút scroll
  const [unreadInChat, setUnreadInChat] = useState(0); // Số tin mới khi đang ở trong chat
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupName = groupTag === 'general' ? 'Hội trường chính' : `Nhóm ${groupTag}`;

  // --- HÀM: ĐÁNH DẤU ĐÃ ĐỌC ---
  const markAsRead = async () => {
      await supabase
          .from('group_members')
          .update({ last_viewed_at: new Date().toISOString() })
          .match({ group_tag: groupTag, guest_id: currentUser.id });
  };

  // --- 1. FETCH & REALTIME ---
  useEffect(() => {
    // A. Đánh dấu đã đọc ngay khi mở
    markAsRead();

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('group_tag', groupTag)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${groupTag}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_tag=eq.${groupTag}` }, 
      (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        
        // B. Xử lý khi có tin nhắn mới đến
        const container = scrollContainerRef.current;
        if (container) {
            // Kiểm tra xem user có đang ở dưới cùng không
            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            
            if (isAtBottom) {
                // Nếu đang ở dưới -> Tự scroll xuống + Đánh dấu đã đọc
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                markAsRead(); 
            } else {
                // Nếu đang cuộn lên xem lịch sử -> Hiện thông báo
                setUnreadInChat(prev => prev + 1);
                setShowScrollButton(true);
            }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupTag]);

  // Scroll xuống cuối lần đầu
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, []);

  // --- XỬ LÝ SCROLL TAY ---
  const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      if (isAtBottom) {
          setShowScrollButton(false);
          setUnreadInChat(0);
          markAsRead(); // Đọc hết khi cuộn xuống đáy
      } else {
          // setShowScrollButton(true); // Có thể bật nếu muốn luôn hiện nút
      }
  };

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollButton(false);
      setUnreadInChat(0);
      markAsRead();
  };

  // --- 2. GỬI TIN NHẮN ---
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !file) || isSending) return;
    setIsSending(true);

    try {
      let imageUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const safeName = Math.random().toString(36).substring(2, 15); 
        const fileName = `${groupTag}/${Date.now()}_${safeName}.${fileExt}`;
        const { error } = await supabase.storage.from('chat-media').upload(fileName, file, { upsert: true });
        if (!error) {
            const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }
      }

      await supabase.from('messages').insert({
        group_tag: groupTag,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_avatar: currentUser.shortName || currentUser.name?.charAt(0) || '?',
        content: newMessage || "",
        image_url: imageUrl
      });

      setNewMessage("");
      setFile(null);
      // Gửi xong thì scroll xuống và đánh dấu đọc
      setTimeout(scrollToBottom, 100); 
      markAsRead();

    } catch (error) { console.error(error); } 
    finally { setIsSending(false); }
  };

  return (
    <div className="flex h-full relative overflow-hidden bg-[#111]">
      
      <div className="flex-1 flex flex-col h-full w-full">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333] bg-[#1a1a1a]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[#333] text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h3 className="font-bold text-[#d4af37] text-sm">{groupName}</h3>
                    <p className="text-[10px] text-green-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Đang trực tuyến
                    </p>
                </div>
            </div>
            <button onClick={() => setShowInfo(!showInfo)} className={`p-2 rounded-full transition-colors ${showInfo ? 'text-[#d4af37] bg-[#333]' : 'text-gray-400 hover:text-white'}`}>
                <Info size={20} />
            </button>
        </div>

        {/* LIST TIN NHẮN */}
        <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[#111] relative"
        >
          {messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const isHost = msg.sender_name.includes("(Chủ tiệc)") || msg.sender_name.includes("Admin");

            return (
              <div key={msg.id || index} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border ${isHost ? "bg-black border-[#d4af37] text-[#d4af37]" : "bg-[#333] border-[#444] text-white"}`}>
                        {isHost ? <Crown size={12} fill="#d4af37" /> : msg.sender_avatar}
                    </div>
                </div>
                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
                   {!isMe && <span className="text-[10px] text-gray-500 ml-1">{msg.sender_name}</span>}
                   <div className={`p-3 rounded-2xl text-sm shadow-sm ${isMe ? "bg-[#d4af37] text-black rounded-tr-none" : "bg-[#222] text-gray-200 rounded-tl-none border border-[#333]"}`}>
                      {msg.image_url && (
                          <div className="mb-2 rounded-lg overflow-hidden cursor-pointer border border-black/10 group relative" onClick={() => setPreviewImage(msg.image_url!)}>
                              <img src={msg.image_url} className="max-w-full h-auto object-cover max-h-60" loading="lazy" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24}/>
                              </div>
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

          {/* 🔥 NÚT THÔNG BÁO TIN MỚI (NỔI) */}
          {showScrollButton && unreadInChat > 0 && (
              <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10 animate-in slide-in-from-bottom-2 fade-in">
                  <button 
                      onClick={scrollToBottom}
                      className="bg-[#d4af37] text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-[#b89628] transition-transform active:scale-95"
                  >
                      <ArrowDown size={14} />
                      Tin nhắn mới ({unreadInChat})
                  </button>
              </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-3 bg-[#1a1a1a] border-t border-[#333]">
          {file && (
              <div className="flex items-center gap-3 mb-3 bg-[#111] p-2 rounded-lg border border-[#333] w-fit shadow-lg animate-in slide-in-from-bottom-2">
                  <div className="w-12 h-12 relative rounded overflow-hidden border border-[#333]"><img src={URL.createObjectURL(file)} className="w-full h-full object-cover" /></div>
                  <div className="flex flex-col"><span className="text-xs text-gray-300 max-w-[120px] truncate">{file.name}</span><span className="text-[10px] text-green-500">Sẵn sàng gửi</span></div>
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

      {/* SIDEBAR & LIGHTBOX (Giữ nguyên như cũ) */}
      <div className={`absolute top-0 right-0 h-full w-72 bg-[#1a1a1a] border-l border-[#333] transform transition-transform duration-300 z-30 shadow-2xl ${showInfo ? "translate-x-0" : "translate-x-full"}`}>
          <ChatInfoSidebar groupTag={groupTag} onClose={() => setShowInfo(false)} messages={messages} />
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

// Giữ nguyên ChatInfoSidebar
function ChatInfoSidebar({ groupTag, onClose, messages }: { groupTag: string, onClose: () => void, messages: Message[] }) {
    const [activeTab, setActiveTab] = useState<'members' | 'media'>('members');
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const mediaList = messages.filter(m => m.image_url);

    useEffect(() => {
        if (activeTab === 'members') {
            const fetchMembers = async () => {
                setLoading(true);
                const { data } = await supabase.from('group_members').select('guests(name, tags)').eq('group_tag', groupTag);
                const list = data?.map((i: any) => ({ name: i.guests.name, isAdmin: i.guests.tags?.includes('admin') })) || [];
                if (!list.find(m => m.isAdmin)) list.unshift({ name: "Đức Kiên (Chủ tiệc)", isAdmin: true });
                setMembers(list);
                setLoading(false);
            };
            fetchMembers();
        }
    }, [activeTab, groupTag]);

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
                    <div className="space-y-3">
                        {loading ? <div className="text-center text-xs text-gray-500">Đang tải...</div> : members.map((mem, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-lg transition-colors"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${mem.isAdmin ? 'bg-[#d4af37] text-black' : 'bg-[#333] text-gray-300'}`}>{mem.name.charAt(0)}</div><div className="flex-1 min-w-0"><p className={`text-xs truncate font-medium ${mem.isAdmin ? 'text-[#d4af37]' : 'text-gray-200'}`}>{mem.name}</p>{mem.isAdmin && <p className="text-[9px] text-gray-500 mt-0.5">Quản trị viên</p>}</div>{mem.isAdmin && <Crown size={14} className="text-[#d4af37]" />}</div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">{mediaList.length === 0 ? <div className="col-span-3 text-center text-gray-500 text-xs py-10">Chưa có ảnh nào</div> : mediaList.map((m) => (<div key={m.id} className="aspect-square bg-[#222] rounded-lg overflow-hidden border border-[#333] cursor-pointer" onClick={() => (window as any).open(m.image_url, '_blank')}><img src={m.image_url} className="w-full h-full object-cover"/></div>))}</div>
                )}
            </div>
        </div>
    );
}