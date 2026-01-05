"use client";

import { Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import Image from "next/image";
import { ReactNode, useEffect, useRef, useState } from "react";

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
    guest?: { id: string; name: string }; // Thêm guest object
    isHidden?: boolean; // Ẩn Catmi khi đang xem nhóm chat
}

export default function CatmiChat({ guestName, guestStatus, guestTags, guestInfor, guest, isHidden = false }: CatmiChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState("welcome"); 
  
  // State mới: Quản lý xem ảnh phóng to
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // State kéo thả bubble
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Tính displayName dựa trên userName (state), không phải lúc render đầu
  const displayName = userName || guestName || guest?.name || 'đằng ấy';
  const guestId = guest?.id || guestName;

  const [messages, setMessages] = useState<{role: string, content: string, type?: string}[]>([
    { role: 'assistant', content: `Chào ${displayName}! Catmi nè 🔥. Cần hỏi gì về buổi lễ hơm?` }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage khi component mount
  useEffect(() => {
    const initChat = async () => {
      try {
        const saved = localStorage.getItem('catmi_chat_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return; // Nếu đã có chat history, không cần init lại
          }
        }
        
        // Lấy tên từ guest object (đã có từ server, không cần fetch)
        console.log('🔍 guest object keys:', Object.keys(guest || {}));
        console.log('🔍 guest object:', guest);
        const name = guest?.name || guestName;
        
        console.log('🔍 CatmiChat initChat:', { guestName, 'guest?.name': guest?.name, 'final name': name });
        
        if (name) {
          setUserName(name);
          // Set initial greeting với tên đúng
          setMessages([{
            role: 'assistant',
            content: `Chào ${name}! Catmi nè 🔥. Cần hỏi gì về buổi lễ hơm?`
          }]);
          
          // Tạo session nếu chưa có
          if (!sessionIdRef.current) {
            try {
              const sessionRes = await fetch('/api/chat/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  guest_id: name,
                  title: `Catmi Chat - ${name} - ${new Date().toLocaleString('vi-VN')}`
                }),
              });
              const sessionData = await sessionRes.json();
              if (sessionData && sessionData.id) {
                sessionIdRef.current = sessionData.id;
                console.log('✅ Chat session created:', sessionData.id);
              } else if (sessionData && sessionData.error) {
                console.warn('⚠️ Session creation warning:', sessionData.error);
              }
            } catch (sessionError) {
              console.error('❌ Failed to create chat session:', sessionError);
            }
          }
        }
      } catch (e) {
        console.error('Failed to initialize chat:', e);
      }
    };
    initChat();
  }, [guestName, guest?.name]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('catmi_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Update greeting message khi displayName thay đổi (khi fetch tên từ DB)
  useEffect(() => {
    if (userName && messages.length === 1 && messages[0].role === 'assistant') {
      const newGreeting = `Chào ${displayName}! Catmi nè 🔥. Cần hỏi gì về buổi lễ hơm?`;
      if (!messages[0].content.includes(displayName)) {
        setMessages([{ role: 'assistant', content: newGreeting }]);
      }
    }
  }, [userName, displayName]);

  // Xử lý kéo thả bubble với Mouse
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOpen) return; // Không kéo khi chat mở
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - bubblePos.x,
      y: e.clientY - bubblePos.y
    });
  };

  // Xử lý kéo thả bubble với Touch (mobile)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isOpen) return; // Không kéo khi chat mở
    
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - bubblePos.x,
      y: e.touches[0].clientY - bubblePos.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      setBubblePos({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;

      setBubblePos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart]);

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

  // Render text có chứa Link Markdown [Text](Url) hoặc ảnh
  const renderMessageContent = (text: string): ReactNode => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const imageRegex = /((?:https?:\/\/|\/)[^\s]*\.(?:png|jpg|jpeg|gif|webp))/gi;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    // Xử lý Markdown links trước
    const tempParts: (string | React.ReactElement)[] = [];
    lastIndex = 0;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tempParts.push(text.substring(lastIndex, match.index));
      }
      tempParts.push(
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
      tempParts.push(text.substring(lastIndex));
    }

    // Xử lý image URLs trong các parts
    tempParts.forEach((part, idx) => {
      if (typeof part === 'string') {
        const imageParts: (string | React.ReactElement)[] = [];
        let imgLastIndex = 0;
        let imgMatch;
        
        // Reset lastIndex cho global regex
        imageRegex.lastIndex = 0;

        while ((imgMatch = imageRegex.exec(part)) !== null) {
          if (imgMatch.index > imgLastIndex) {
            imageParts.push(part.substring(imgLastIndex, imgMatch.index));
          }
          const imageUrl = imgMatch[1];
          imageParts.push(
            <img
              key={`img-${idx}-${imgMatch.index}`}
              src={imageUrl}
              alt="Catmi"
              className="max-w-full h-auto rounded-lg my-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setPreviewImage(imageUrl)}
            />
          );
          imgLastIndex = imageRegex.lastIndex;
        }
        if (imgLastIndex < part.length) {
          imageParts.push(part.substring(imgLastIndex));
        }
        parts.push(...(imageParts.length > 0 ? imageParts : [part]));
      } else {
        parts.push(part);
      }
    });

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

          // Nếu API trả includeMap = true (user hỏi về event), auto thêm map
          if (data.includeMap) {
            setTimeout(() => {
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: '/media/map2d.png', 
                type: 'image' 
              }]);
            }, 500);
          }

          // Auto-save user message to database
          if (sessionIdRef.current && userName) {
            try {
              const userRes = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: sessionIdRef.current,
                  guest_id: userName,
                  role: 'user',
                  content: userMsg.content
                }),
              });
              if (!userRes.ok) {
                console.error('Failed to save user message:', await userRes.text());
              }
            } catch (saveError) {
              console.error('Error saving user message:', saveError);
            }
          }

          // Auto-save assistant message to database
          if (sessionIdRef.current && userName) {
            try {
              const assistantRes = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: sessionIdRef.current,
                  guest_id: userName,
                  role: 'assistant',
                  content: cleanText
                }),
              });
              if (!assistantRes.ok) {
                console.error('Failed to save assistant message:', await assistantRes.text());
              }
            } catch (saveError) {
              console.error('Error saving assistant message:', saveError);
            }
          }
      } 
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hic, Catmi bị ốm rồi...' }]);
      setCurrentMood("sad");
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm xóa lịch sử chat
  const clearHistory = () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat với Catmi?')) return;
    
    setMessages([
      { role: 'assistant', content: `Chào ${displayName}! Catmi nè 🔥. Cần hỏi gì về buổi lễ hơm?` }
    ]);
    localStorage.removeItem('catmi_chat_history');
    // Reset session để tạo session mới
    sessionIdRef.current = null;
    setUserName(null);
    alert('✅ Lịch sử đã được xóa!');
  };

  // Hàm xử lý nút "Thông tin buổi lễ" (gộp vị trí + thông tin)
  const handleShowEventInfo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/event-info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Hic, lỗi server 😭. Hãy thử lại nhé!' }]);
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      if (!data) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Hic, không tìm thấy thông tin sự kiện! 😢' }]);
        setIsLoading(false);
        return;
      }

      const content = `Thông tin buổi lễ của Đức Kiên:

        📍 **Địa điểm:** ${data.location_info || 'Chưa xác định'}
        🕐 **Thời gian:** ${data.time_info || 'Chưa xác định'}
        📞 **Liên hệ:** ${data.contact_info || 'Chưa xác định'}
        📍 **Vị trí hiện tại:** ${data.current_location || 'Đang ở nhà'}

        Xem bản đồ chi tiết: [Đại học Thủy lợi](https://maps.app.goo.gl/iZqvwJVA4CXNEYqm6)`;
      
      setMessages(prev => [...prev, { role: 'assistant', content }]);
      
      // Gửi bản đồ sau 500ms
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '/media/map2d.png', 
          type: 'image' 
        }]);
      }, 500);
    } catch (error: any) {
      console.error('Error fetching event info:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lỗi khi lấy thông tin sự kiện 😭. Hãy thử lại nhé!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Ẩn Catmi khi đang xem nhóm chat
  if (isHidden) return null;

  return (
    <>
      <div 
        ref={bubbleRef}
        className="fixed z-[9999] font-sans select-none touch-none"
        style={{
          right: '16px',
          bottom: '16px',
          transform: bubblePos.x !== 0 || bubblePos.y !== 0 ? `translate(${bubblePos.x}px, ${bubblePos.y}px)` : 'translate(0, 0)',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        
        {/* 1. NÚT TRÒN MỞ CHAT */}
        {!isOpen && (
          <button 
            onClick={() => setIsOpen(true)}
            className="group relative w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 border-2 border-orange-400 overflow-hidden"
            data-tutorial-catmi="true"
          >
            <div className="w-full h-full relative">
              <Image src={CATMI_EXPRESSIONS[currentMood] || CATMI_EXPRESSIONS['default']} alt="Catmi" fill className="object-cover" sizes="64px" unoptimized loading="eager" />
            </div>
          </button>
        )}
      </div>

      {/* 2. KHUNG CHAT - RIÊNG BIỆT */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-[340px] h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-orange-200 animate-in slide-in-from-bottom-10 fade-in duration-300 z-[10000]" onMouseDown={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-yellow-300 overflow-hidden relative">
                    <Image src={CATMI_EXPRESSIONS[currentMood] || CATMI_EXPRESSIONS['default']} alt="Avatar" fill className="object-cover" sizes="48px" unoptimized />
                </div>
                <div>
                    <h3 className="font-bold text-sm flex items-center gap-1">Catmi <Sparkles size={12} className="text-yellow-300" /></h3>
                    <p className="text-[10px] text-orange-100 opacity-90">Trợ lý ảo</p>
                </div>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={clearHistory} 
                title="Xóa lịch sử"
                className="hover:bg-white/20 p-1 rounded-full"
              >
                <Trash2 size={18} />
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
            </div>
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
                 
                 <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm break-words whitespace-pre-wrap overflow-hidden ${
                     msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                 }`}>
                    {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                 </div>
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
          <div className="p-3 bg-white border-t border-gray-100">
            {/* Suggestion Button */}
            <div className="flex gap-2 mb-2">
              <button 
                onClick={handleShowEventInfo}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-gradient-to-r from-blue-100 to-green-100 text-blue-700 rounded-lg text-xs font-bold hover:from-blue-200 hover:to-green-200 transition-colors disabled:opacity-50"
              >
                📍 Thông tin buổi lễ
              </button>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-black"
              />
              <button onClick={handleSend} className="w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 shadow-md"><Send size={18} /></button>
            </div>
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
    </>
  );
}