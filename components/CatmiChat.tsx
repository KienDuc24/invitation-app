"use client";

import { Loader2, Send, Sparkles, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// ... (Giữ nguyên constant CATMI_EXPRESSIONS) ...
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
  
  // State mới: Quản lý xem ảnh phóng to
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  // Render text có chứa Link Markdown [Text](Url)
  const renderMessageContent = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a 
          key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 underline font-bold hover:text-blue-800 mx-1"
        >
          {match[1]}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }
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
            guestName, guestStatus, guestTags, guestInfor
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
                 content: '/media/map2d.png', 
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
      
      {/* 1. NÚT TRÒN MỞ CHAT */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="group relative w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-orange-400 overflow-hidden"
        >
          <div className="w-full h-full relative">
            <Image src={CATMI_EXPRESSIONS[currentMood] || CATMI_EXPRESSIONS['default']} alt="Catmi" fill className="object-cover" sizes="64px" unoptimized loading="eager" />
          </div>
        </button>
      )}

      {/* 2. KHUNG CHAT */}
      {isOpen && (
        <div className="w-[340px] h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-orange-200 animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
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

          {/* Body Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50/30 scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 {msg.role !== 'user' && (
                     <div className="w-8 h-8 rounded-full overflow-hidden mr-2 border border-orange-200 flex-shrink-0 relative">
                        <Image src={CATMI_EXPRESSIONS[currentMood] || CATMI_EXPRESSIONS['default']} alt="Bot" fill className="object-cover" sizes="32px" unoptimized />
                     </div>
                 )}
                 
                 {msg.type === 'image' ? (
                     // --- PHẦN HIỂN THỊ ẢNH (Bấm để xem) ---
                     <div 
                        onClick={() => setPreviewImage(msg.content)} // Sự kiện mở Lightbox
                        className="relative w-48 h-32 rounded-lg overflow-hidden border border-orange-300 shadow-sm cursor-pointer group hover:shadow-md transition-all"
                     >
                        <Image src={msg.content} alt="Map" fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                        
                        {/* Overlay icon Zoom */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                        </div>
                        <div className="absolute bottom-0 w-full bg-black/60 text-white text-[10px] p-1 text-center font-bold">Bấm để phóng to</div>
                     </div>
                 ) : (
                     <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                         msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                     }`}>
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

          {/* Footer Input */}
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

      {/* 3. LIGHTBOX XEM ẢNH FULLSCREEN (MỚI) */}
      {previewImage && (
          <div 
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)} // Bấm ra ngoài để đóng
          >
              {/* Nút đóng */}
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-5 right-5 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-50"
              >
                <X size={24}/>
              </button>

              {/* Ảnh Full */}
              <img 
                src={previewImage} 
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain cursor-zoom-out" 
                alt="Preview"
              />
          </div>
      )}

    </div>
  );
}