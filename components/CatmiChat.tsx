// components/CatmiChat.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Sparkles, MapPin } from "lucide-react"; // Import thêm MapPin nếu thích icon
import Image from "next/image";

// ... (Giữ nguyên constant CATMI_EXPRESSIONS cũ) ...
const CATMI_EXPRESSIONS: Record<string, string> = {
    default: "/media/welcome.gif",   
    amazed: "/media/amazed.gif",    
    angry: "/media/angry.gif",      
    annoyed: "/media/annoyed.gif",    
    bye: "/media/bye.gif",          
    confused: "/media/confused.gif",  
    cute: "/media/cute.gif",        
    focus: "/media/focus.gif",      
    guild: "/media/guild.gif",
    guiding: "/media/guild.gif",
    happy: "/media/happy.gif",      
    mad: "/media/mad.gif",          
    question: "/media/question.gif",
    sad: "/media/sad.gif",          
    sassy: "/media/sassy.gif",      
    searching: "/media/searching.gif",
    success: "/media/success.gif",   
    teasing: "/media/teasing.gif",   
    thinking: "/media/thinking.gif",  
    tired: "/media/tired.gif",       
    welcome: "/media/welcome.gif",   
    yessir: "/media/yessir.gif",
    playful: "/media/teasing.gif",
    listening: "/media/focus.gif"
};

interface CatmiChatProps {
    guestName?: string;
    guestStatus?: boolean;
    guestTags?: string[];
    guestInfor?: string;
}

export default function CatmiChat({ guestName, guestStatus, guestTags, guestInfor }: CatmiChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState("welcome"); 

  const [messages, setMessages] = useState<{role: string, content: string, type?: string}[]>([
    { role: 'assistant', content: `Chào ${guestName || 'đằng ấy'}! Catmi nè 🔥. Cần hỏi gì về buổi tiệc hơm?` }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Hàm xử lý Tag cảm xúc
  const processResponse = (fullText: string) => {
    if (!fullText) return { cleanText: "", mood: "default", showMap: false };
    
    let mood = "default";
    let showMap = false;
    let cleanText = fullText;

    const match = fullText.match(/^\[(.*?)\]\s*([\s\S]*)/);
    if (match) {
        let tag = match[1].toLowerCase();
        cleanText = match[2];

        if (tag.includes('guiding') || tag.includes('guild')) {
            mood = 'guiding';
            showMap = true;
        } else {
             const foundKey = Object.keys(CATMI_EXPRESSIONS).find(k => tag.includes(k));
             if (foundKey) mood = foundKey;
        }
    }
    return { cleanText, mood, showMap };
  };

  // 👇 HÀM MỚI: Render text có chứa Link Markdown [Text](Url)
  const renderMessageContent = (text: string) => {
    // Regex tìm chuỗi [Text](Url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Đẩy phần text thường trước link vào
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Đẩy phần Link vào (hiển thị màu xanh, bấm được)
      parts.push(
        <a 
          key={match.index} 
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 underline font-bold hover:text-blue-800 mx-1"
        >
          {match[1]}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }
    // Đẩy phần text còn lại
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setCurrentMood("thinking");

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            messages: [...messages, userMsg],
            guestName,
            guestStatus,
            guestTags,
            guestInfor
        }),
      });

      const data = await res.json();
      
      if (data && data.content) {
          const { cleanText, mood, showMap } = processResponse(data.content);
          setCurrentMood(mood);

          setMessages(prev => [...prev, { role: 'assistant', content: cleanText }]);

          if (showMap) {
             setMessages(prev => [...prev, { 
                 role: 'assistant', 
                 content: '/media/map2d.png', // Đổi lại đúng tên file ảnh bạn up
                 type: 'image' 
             }]);
          }
      } 
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hic, Catmi bị ốm rồi...' }]);
      setCurrentMood("sad");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="group relative w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-orange-400 overflow-hidden"
        >
          <div className="w-full h-full relative">
            <Image src={CATMI_EXPRESSIONS[currentMood] || CATMI_EXPRESSIONS['default']} alt="Catmi" fill className="object-cover" sizes="64px" unoptimized />
          </div>
        </button>
      )}

      {isOpen && (
        <div className="w-[340px] h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-orange-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-yellow-300 overflow-hidden relative">
                    <Image src={CATMI_EXPRESSIONS[currentMood] || CATMI_EXPRESSIONS['default']} alt="Avatar" fill className="object-cover" sizes="48px" unoptimized />
                </div>
                <div>
                    <h3 className="font-bold text-sm flex items-center gap-1">Catmi <Sparkles size={12} className="text-yellow-300" /></h3>
                    <p className="text-[10px] text-orange-100 opacity-90">Tinh linh lửa trại</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50/30 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 {msg.role !== 'user' && (
                     <div className="w-8 h-8 rounded-full overflow-hidden mr-2 border border-orange-200 flex-shrink-0 relative">
                        <Image src={CATMI_EXPRESSIONS[currentMood] || CATMI_EXPRESSIONS['default']} alt="Bot" fill className="object-cover" sizes="32px" unoptimized />
                     </div>
                 )}
                 
                 {msg.type === 'image' ? (
                     <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-orange-300 shadow-sm cursor-pointer group">
                        <Image src={msg.content} alt="Map" fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                        <div className="absolute bottom-0 w-full bg-black/50 text-white text-[10px] p-1 text-center">Bấm để phóng to</div>
                     </div>
                 ) : (
                     <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                         msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                     }`}>
                        {/* 👇 DÙNG HÀM RENDER MỚI Ở ĐÂY */}
                        {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                     </div>
                 )}
              </div>
            ))}
            {isLoading && (
               <div className="flex justify-start items-center gap-2 pl-10">
                   <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                   <span className="text-xs text-gray-400 italic">Đang nhập...</span>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập tin nhắn..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-black"
            />
            <button onClick={handleSend} className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 shadow-md"><Send size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}