"use client";

import { Heart, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ProjectorStoryProps {
  postImage?: string | string[];     // Ảnh chính của bài đăng (1 hoặc nhiều)
  content?: string;       // Caption
  comments?: any[];       // Danh sách comment
  authorName?: string;    // Tên người đăng
  onClose: () => void;    // Hàm đóng
}

interface ImageDimensions {
  [key: string]: { width: number; height: number } | null;
}

export default function ProjectorStory({ 
  postImage, 
  content, 
  comments = [], 
  authorName = "Bạn", 
  onClose 
}: ProjectorStoryProps) {
  const [stage, setStage] = useState<'countdown' | 'intro' | 'playing' | 'end'>('countdown');
  const [count, setCount] = useState(3);
  const [isMuted, setIsMuted] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Parse images array
  const images = (() => {
    if (Array.isArray(postImage)) {
      return postImage.filter(Boolean);
    }
    if (typeof postImage === 'string') {
      // Try to parse as JSON array
      if (postImage.startsWith('[')) {
        try {
          const parsed = JSON.parse(postImage);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [postImage];
        } catch {
          return [postImage];
        }
      }
      return [postImage];
    }
    return ["https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=600&fit=crop"];
  })();
  
  console.log('ProjectorStory - Total images:', images.length, 'Images:', images);

  // Load image dimensions
  useEffect(() => {
    const dims: ImageDimensions = {};
    images.forEach((imgUrl) => {
      if (imageDimensions[imgUrl]) {
        dims[imgUrl] = imageDimensions[imgUrl];
      } else {
        const img = new Image();
        img.onload = () => {
          setImageDimensions((prev) => ({
            ...prev,
            [imgUrl]: { width: img.naturalWidth, height: img.naturalHeight }
          }));
        };
        img.src = imgUrl;
      }
    });
  }, [images]);

  // Determine if image is landscape (width > height)
  const isLandscape = (imgUrl: string) => {
    const dims = imageDimensions[imgUrl];
    return dims && dims.width > dims.height;
  };

  // --- LOGIC CHUYỂN CẢNH ---
  useEffect(() => {
    // 1. Đếm ngược 3-2-1
    if (stage === 'countdown') {
      const timer = setInterval(() => {
        setCount((prev) => {
          if (prev === 1) {
            clearInterval(timer);
            setStage('intro');
            return 1;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    // 2. Intro Zoom (Lens Flare)
    if (stage === 'intro') {
      const timer = setTimeout(() => {
        setStage('playing');
        if (audioRef.current && !isMuted) audioRef.current.play().catch(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 3. Playing (Tự động kết thúc sau khi cuộn hết)
    if (stage === 'playing') {
      // Calculate duration: Cấp thời gian cho mỗi section (ảnh + comments + credits)
      // Mỗi ảnh = 1 section (h-screen), tổng sections = images.length + 2 (comments + credits)
      // Mỗi section = 3.5 giây (2s hiển thị + 1.5s delay để load ảnh tiếp theo)
      const totalSections = images.length + 2;
      const duration = totalSections * 3.0 * 1000;
      console.log('Playing stage - Images:', images.length, 'Total sections:', totalSections, 'Duration:', duration);
      const timer = setTimeout(() => setStage('end'), duration);
      return () => clearTimeout(timer);
    }
  }, [stage, isMuted, images.length]);

  // Toggle Âm thanh
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.play().catch(() => {});
      setIsMuted(false);
    } else {
      audioRef.current.pause();
      setIsMuted(true);
    }
  };

  const handleReplay = () => {
    setStage('countdown');
    setCount(3);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if(!isMuted) audioRef.current.play();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center">
      
      {/* BACKGROUND MUSIC */}
      <audio ref={audioRef} src="/music/bg-music.mp3" loop />

      {/* --- CÁC LỚP PHỦ HIỆU ỨNG (FILM OVERLAYS) --- */}
      {/* 1. Noise / Hạt nhiễu (Quan trọng cho vibe cũ) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.06] z-50 mix-blend-overlay"
        style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` 
        }} 
      />
      
      {/* 2. Vignette (Tối 4 góc) */}
      <div className="absolute inset-0 pointer-events-none z-40 bg-[radial-gradient(circle,transparent_40%,#000000_100%)] opacity-60" />

      {/* 3. Scratches (Vết xước dọc - giả lập bằng border) */}
      <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-white/5 z-40 pointer-events-none" />
      <div className="absolute right-1/3 top-0 bottom-0 w-[1px] bg-white/10 z-40 pointer-events-none" />


      {/* --- GIAI ĐOẠN 1: COUNTDOWN --- */}
      {stage === 'countdown' && (
        <div className="relative z-30 flex items-center justify-center w-full h-full projector-jitter">
          <div className="w-64 h-64 border-[4px] border-white/80 rounded-full flex items-center justify-center relative">
             <div className="absolute inset-0 border-t-[4px] border-transparent border-t-white/80 rounded-full animate-spin" />
             <div className="w-[1px] h-full bg-white/50 absolute" />
             <div className="h-[1px] w-full bg-white/50 absolute" />
             <span className="text-9xl font-black font-mono">{count}</span>
          </div>
        </div>
      )}

      {/* --- GIAI ĐOẠN 2: INTRO ZOOM --- */}
      {stage === 'intro' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black overflow-hidden">
           {/* Luồng sáng bùng nổ */}
           <div className="w-10 h-10 bg-white rounded-full shadow-[0_0_200px_100px_rgba(255,255,255,1)] animate-ping" />
        </div>
      )}

      {/* --- GIAI ĐOẠN 3: PHIM ĐANG CHẠY (PLAYING) --- */}
      {stage === 'playing' && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center light-flicker projector-jitter overflow-hidden">
          
          {/* Dải phim cuộl từ dưới lên */}
          {(() => {
            // Calculate animation duration based on number of sections
            // scrollDuration phải = duration để animation kết thúc cùng lúc clip kết thúc
            const totalSections = images.length + 2;
            const scrollDuration = totalSections * 3.5; // 3.5s per section (2s view + 1.5s delay)
            const translatePercentage = totalSections * 100; // Tính percentage để lướt hết tất cả sections
            
            return (
              <>
                <style>{`
                  @keyframes filmScrollDynamic {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-${translatePercentage}%); }
                  }
                  .film-scroll-container {
                    animation: filmScrollDynamic ${scrollDuration}s linear forwards;
                  }
                `}</style>
                
                <div className="absolute inset-0 w-full will-change-transform film-scroll-container">
                  
                  {/* IMAGES SECTION */}
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-full h-screen flex flex-col items-center justify-center py-0">
                      
                      {/* Viền phim đục lỗ - LEFT */}
                      <div className="absolute left-0 top-0 bottom-0 w-4 bg-black z-20 flex flex-col gap-2 py-2 items-center border-r border-white/20">
                          {Array.from({length: 48}).map((_,i) => <div key={i} className="w-1.5 h-1.5 bg-white/30 rounded-sm" />)}
                      </div>
                      
                      {/* Viền phim đục lỗ - RIGHT */}
                      <div className="absolute right-0 top-0 bottom-0 w-4 bg-black z-20 flex flex-col gap-2 py-2 items-center border-l border-white/20">
                          {Array.from({length: 48}).map((_,i) => <div key={i} className="w-1.5 h-1.5 bg-white/30 rounded-sm" />)}
                      </div>

                      {/* MAIN IMAGE FRAME - FILL CONTAINER */}
                      <div 
                        className="relative z-30 bg-white shadow-lg flex-1 flex items-center justify-center w-full h-screen"
                        style={{
                          aspectRatio: 'auto'
                        }}
                      >
                          <div className="relative overflow-hidden w-full h-full bg-gray-800" style={{ filter: 'sepia(0.3) contrast(1.25)' }}>
                             <img 
                                 src={img} 
                                 className="w-full h-full block bg-black"
                                 style={{
                                   objectFit: 'contain'
                                 }}
                                 alt="Memory"
                                 crossOrigin="anonymous"
                             />
                             {/* Date stamp */}
                             <div className="absolute bottom-2 right-2 text-[#d4af37] font-mono text-[10px] opacity-80 tracking-widest">
                                20 . 11 . 2025
                             </div>
                          </div>
                          
                      </div>
                      
                      {/* Image counter */}
                      {images.length > 1 && (
                        <div className="mt-2 text-[#d4af37] text-[8px] font-bold">
                          ({idx + 1}/{images.length})
                        </div>
                      )}
                      
                      {/* TEXT BELOW IMAGE - SMALL */}
                      <div className="text-center w-full px-2 mb-4">
                          <p className="text-white/80 font-serif italic text-[8px] line-clamp-1">"{content || "..."}"</p>
                          <p className="text-white/60 text-[6px] uppercase tracking-widest mt-0.5 font-bold">- {authorName} -</p>
                      </div>
                      
                      {/* LIVE COMMENTS DURING IMAGE DISPLAY */}
                      {comments.length > 0 && (
                        <div className="relative z-40 w-full px-4 max-h-[140px] overflow-y-auto scrollbar-hide">
                          <div className="space-y-2">
                            {comments.slice(0, 3).map((cmt, idx) => (
                              <div key={idx} className="bg-black/60 backdrop-blur border border-[#d4af37]/30 rounded px-3 py-2">
                                <p className="text-white/95 font-serif text-[8px] leading-tight line-clamp-2">
                                  "{cmt.content || cmt.text || cmt}"
                                </p>
                                <p className="text-[#d4af37] text-[7px] font-bold mt-1">
                                  — {cmt.guests?.name || cmt.user || "Ẩn danh"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* COMMENTS SECTION */}
                  {comments.length > 0 && (
                      <div className="relative w-full h-screen flex flex-col items-center justify-center gap-3 px-8 text-center py-0">
                          <h3 className="text-[#d4af37] uppercase tracking-[0.3em] text-xs font-bold opacity-70">Thoughts</h3>
                          
                          {comments.map((cmt, idx) => (
                              <div key={idx} className="relative">
                                  <p className="text-base font-serif text-white/90 leading-relaxed drop-shadow-md">
                                      "{cmt.content || cmt.text || cmt}"
                                  </p>
                                  <p className="text-[#d4af37] text-[10px] font-bold mt-0.5 uppercase tracking-wider">— {cmt.guests?.name || cmt.user || "Người bí ẩn"}</p>
                              </div>
                          ))}
                      </div>
                  )}

                  {/* CREDITS SECTION */}
                  <div className="relative w-full h-screen flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-2">Directed by</p>
                      <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-1">Đức Kiên</h1>
                      <p className="text-[#d4af37] font-serif italic text-xs">Graduation Ceremony 2025</p>
                      <div className="mt-4 animate-bounce">
                          <Heart className="w-5 h-5 text-red-600 fill-red-600 mx-auto" />
                      </div>
                  </div>

                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* --- GIAI ĐOẠN 4: KẾT THÚC (END SCREEN) --- */}
      {stage === 'end' && (
        <div className="relative z-50 text-center animate-in zoom-in duration-500">
            <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-widest">Hết phim</h2>
            <p className="text-gray-400 text-xs mb-8">Bạn có muốn xem lại khoảnh khắc này?</p>
            
            <div className="flex gap-4 justify-center">
                <button 
                    onClick={handleReplay}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <RotateCcw size={24} />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Replay</span>
                </button>

                <button 
                    onClick={onClose}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-14 h-14 border border-white/30 text-white rounded-full flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <X size={24} />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Đóng</span>
                </button>
            </div>
        </div>
      )}

      {/* UI CONTROLS (Luôn hiện ở góc) */}
      <div className="absolute top-6 right-6 z-[60] flex gap-4">
        <button onClick={toggleAudio} className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors">
            {isMuted ? <VolumeX size={20} className="text-gray-400"/> : <Volume2 size={20} className="text-[#d4af37] animate-pulse"/>}
        </button>
        <button onClick={onClose} className="p-3 bg-black/50 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition-colors">
            <X size={20} className="text-white"/>
        </button>
      </div>

      {/* REC BUTTON HINT (Gợi ý quay màn hình) */}
      {stage === 'playing' && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center z-50 pointer-events-none opacity-50">
              <div className="flex items-center gap-2 bg-red-600/20 px-4 py-1.5 rounded-full border border-red-500/50">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-red-200 font-bold uppercase tracking-widest">REC</span>
              </div>
          </div>
      )}

    </div>
  );
}
