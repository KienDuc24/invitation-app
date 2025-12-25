"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Send, User, Loader2 } from "lucide-react";

interface ChatProps {
  currentUser: any; // Thông tin khách đang đăng nhập
  groupTag: string; // Tag của nhóm (VD: 'bạn cấp 3')
}

export default function ChatGroup({ currentUser, groupTag }: ChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // 1. Lấy tin nhắn cũ khi mới vào
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('group_tag', groupTag)
        .order('created_at', { ascending: true });
      
      if (data) {
        setMessages(data);
        setTimeout(scrollToBottom, 200);
      }
    };

    fetchMessages();

    // 2. Đăng ký Realtime (Lắng nghe tin nhắn mới)
    const channel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_tag=eq.${groupTag}` },
        (payload) => {
          // Khi có tin nhắn mới, thêm vào danh sách ngay lập tức
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    // Dọn dẹp khi thoát
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupTag]);

  // Hàm gửi tin nhắn
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgContent = newMessage.trim();
    setNewMessage(""); // Xóa ô nhập liệu ngay cho mượt

    try {
      // Gửi lên Supabase
      const { error } = await supabase.from('messages').insert({
        content: msgContent,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        group_tag: groupTag
      });

      if (error) console.error("Lỗi gửi tin:", error);
      
    } catch (error) {
      console.error("Lỗi:", error);
    }
  };

  return (
    <div className="flex flex-col h-[450px] bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Header Chat */}
      <div className="p-3 bg-[#1a1a1a] border-b border-[#333] flex justify-between items-center z-10 shadow-md">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h3 className="text-[#d4af37] font-bold text-xs uppercase tracking-wider">
            Live Chat
            </h3>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">#{groupTag}</div>
      </div>

      {/* Danh sách tin nhắn */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0a0a0a] to-[#111] scrollbar-thin scrollbar-thumb-gray-800">
        {messages.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
              <MessageCircleIcon />
              <p className="text-xs mt-2 italic">Chưa có tin nhắn nào...</p>
           </div>
        ) : (
           messages.map((msg, index) => {
             const isMe = msg.sender_id === currentUser.id;
             return (
               <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                 <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                    
                    {/* Avatar tròn (Chữ cái đầu) */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 shadow-lg ${
                        isMe 
                        ? 'bg-gradient-to-br from-[#d4af37] to-[#b89628] text-black' 
                        : 'bg-[#333] border border-gray-600 text-gray-300'
                    }`}>
                        {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    
                    {/* Bong bóng chat */}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMe 
                        ? 'bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#fadd7d] rounded-br-none' 
                        : 'bg-[#222] border border-[#333] text-gray-300 rounded-bl-none'
                    }`}>
                       {msg.content}
                    </div>
                 </div>
                 
                 {/* Tên người gửi (chỉ hiện cho người khác) */}
                 {!isMe && (
                    <span className="text-[9px] text-gray-600 ml-9 mt-1 block">
                        {msg.sender_name}
                    </span>
                 )}
               </div>
             )
           })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input gửi tin */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#1a1a1a] border-t border-[#333] flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-[#0a0a0a] border border-[#333] text-white text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/20 transition-all placeholder:text-gray-700"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="p-3 bg-[#d4af37] text-black rounded-xl hover:bg-[#b89628] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#d4af37]/10"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

// Icon trang trí khi trống
function MessageCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
    )
}