// components/CatmiChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";

// Định nghĩa kiểu dữ liệu tin nhắn
type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Props nhận vào để biết khách là ai
interface CatmiChatProps {
    guestName?: string;     // Tên khách (Lấy từ DB)
    guestStatus?: boolean;  // Trạng thái confirm (Lấy từ DB)
}

export default function CatmiChat({ guestName, guestStatus }: CatmiChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Tin nhắn chào mở đầu (Mặc định)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '[Welcome] Chào đằng ấy! Catmi nè 🔥. Cần hỏi gì về buổi tiệc hơm?' }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống khi có tin mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Hàm gửi tin nhắn
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Gọi API Next.js vừa tạo ở trên
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            // Gửi kèm lịch sử chat (bỏ tin nhắn đầu tiên nếu là welcome giả)
            messages: messages.filter(m => m.role !== 'system'), 
            // Gửi kèm thông tin khách để Catmi biết
            guestName: guestName || "Bạn giấu tên",
            guestStatus: guestStatus
        }),
      });

      const data = await res.json();

      // Hàm chọn màu dựa trên từ khóa trong Tag
        const getTagColor = (rawTag: string) => {
            const t = rawTag?.toLowerCase();
            
            // Nhóm tích cực (Hồng/Xanh lá)
            if (t.includes('welcome') || t.includes('happy') || t.includes('cute') || t.includes('success') || t.includes('applauding')) 
                return 'bg-pink-500 text-white border-pink-600';
            
            // Nhóm đanh đá/tiêu cực (Đỏ/Cam)
            if (t.includes('sassy') || t.includes('annoyed') || t.includes('angry') || t.includes('skeptical')) 
                return 'bg-red-500 text-white border-red-600';
            
            // Nhóm suy tư/hướng dẫn (Xanh dương)
            if (t.includes('thinking') || t.includes('guiding') || t.includes('deep focus')) 
                return 'bg-blue-500 text-white border-blue-600';
                
            // Nhóm mệt mỏi/ngủ (Xám)
            if (t.includes('tired') || t.includes('sleeping') || t.includes('goodbye')) 
                return 'bg-gray-500 text-white border-gray-600';

            return 'bg-purple-500 text-white'; // Mặc định
        };
        
      // Thêm câu trả lời của Catmi vào list
      setMessages(prev => [...prev, data]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '[Tired] Mất kết nối với hành tinh mẹ rồi...' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- HÀM XỬ LÝ HIỂN THỊ TAG CẢM XÚC ---
  // Ví dụ: "[Sassy] Sao anh hỏi nhiều thế?" -> Tách thành Tag "Sassy" và Text riêng
  const parseContent = (content: string) => {
    const match = content.match(/^\[(.*?)\]\s*([\s\S]*)/);
    if (match) {
        return { tag: match[1], text: match[2] };
    }
    return { tag: null, text: content };
  };

  // Màu sắc cho từng loại Tag (Optional - làm màu cho đẹp)
  const getTagColor = (tag: string) => {
      const t = tag?.toLowerCase();
      if (t?.includes('sassy') || t?.includes('angry')) return 'bg-red-500 text-white';
      if (t?.includes('happy') || t?.includes('welcome') || t?.includes('cute')) return 'bg-pink-500 text-white';
      if (t?.includes('thinking')) return 'bg-blue-400 text-white';
      return 'bg-gray-200 text-gray-700';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {/* Nút tròn mở Chat */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          {/* Hiệu ứng lửa cháy */}
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400/50 animate-ping opacity-75"></div>
          <span className="text-2xl">😼</span>
          
          {/* Tooltip nhỏ */}
          <span className="absolute -top-10 right-0 bg-white text-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold">
            Hỏi Catmi nè!
          </span>
        </button>
      )}

      {/* Cửa sổ Chat Box */}
      {isOpen && (
        <div className="w-[340px] h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-orange-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-yellow-300">
                    <span className="text-xl">🔥</span>
                </div>
                <div>
                    <h3 className="font-bold text-sm flex items-center gap-1">
                        Catmi <Sparkles size={12} className="text-yellow-300" />
                    </h3>
                    <p className="text-[10px] text-orange-100 opacity-90">Tinh linh lửa trại (AI)</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* List Tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50/30 scroll-smooth">
            {messages.map((msg, idx) => {
              const { tag, text } = parseContent(msg.content);
              const isUser = msg.role === 'user';

              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                   {!isUser && (
                       <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mr-2 text-xs border border-orange-200 mt-1">😼</div>
                   )}
                   
                   <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                       isUser 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                   }`}>
                      {/* Hiển thị Tag cảm xúc nếu có */}
                      {tag && !isUser && (
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold uppercase mb-1.5 tracking-wider ${getTagColor(tag)}`}>
                              {tag}
                          </span>
                      )}
                      <p className="leading-relaxed">{text}</p>
                   </div>
                </div>
              );
            })}
            
            {/* Loading Indicator */}
            {isLoading && (
               <div className="flex justify-start items-center gap-2 pl-8">
                   <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                   <span className="text-xs text-gray-400 italic">Catmi đang nghĩ...</span>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập tin nhắn..."
              disabled={isLoading}
              className="flex-1 bg-gray-100 text-black rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all"
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-orange-500/20"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}