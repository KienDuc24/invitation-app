"use client";
import { Download, Heart, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Comment {
  user: string;
  text: string;
}

interface Frame {
  id: string;
  image_url: string;
  comments: Comment[];
  likes?: number;
  commentCount?: number;
}

interface ProjectorStoryProps {
  frames: Frame[];
  eventName?: string;
  authorName?: string;
  onClose?: () => void;
}

export default function ProjectorStory({
  frames = [],
  eventName = "Kỷ Niệm",
  authorName = "Guest",
  onClose
}: ProjectorStoryProps) {
  const [stage, setStage] = useState<'intro' | 'playing' | 'end'>('intro');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [currentCommentIndex, setCurrentCommentIndex] = useState(0);
  const [showComment, setShowComment] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadVideo = async () => {
    try {
      setIsDownloading(true);
      
      // Load all images first
      const loadedImages: HTMLImageElement[] = [];
      
      for (const frame of frames) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            loadedImages.push(img);
            resolve(null);
          };
          img.onerror = () => {
            console.warn('Failed to load image:', frame.image_url);
            reject(new Error(`Failed to load image: ${frame.image_url}`));
          };
          img.src = frame.image_url;
        });
      }

      // Create canvas (wider to fit film strips)
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Failed to get canvas context');

      // Record video
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9' 
      });
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${eventName}-${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      };

      mediaRecorder.start();

      // Helper function to draw film strip
      const drawFilmStrip = (startY: number) => {
        ctx.fillStyle = '#333';
        for (let i = 0; i < 12; i++) {
          const x = 50 + i * 90;
          ctx.fillRect(x, startY, 35, 24);
          ctx.strokeStyle = '#555';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, startY, 35, 24);
        }
      };

      // Helper function to draw sprocket holes
      const drawSprocketHoles = (isLeft: boolean) => {
        ctx.fillStyle = '#222';
        const x = isLeft ? 20 : canvas.width - 50;
        const holes = 8;
        const spacing = (canvas.height - 200) / holes;
        
        for (let i = 0; i < holes; i++) {
          const y = 100 + i * spacing;
          ctx.fillRect(x, y, 20, 12);
          ctx.strokeStyle = '#444';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, 20, 12);
        }
      };

      // Helper function to draw vignette
      const drawVignette = () => {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };

      // Helper function to draw film grain
      const drawFilmGrain = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < 100; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const size = Math.random() * 2;
          ctx.fillRect(x, y, size, 1);
        }
      };

      // Helper function to draw comment
      const drawComment = (comment: Comment, opacity: number) => {
        const x = 100;
        const y = canvas.height - 300;
        
        ctx.globalAlpha = opacity;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 20, y - 20, 300, 100);
        
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 20, y - 20, 300, 100);
        
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(comment.user, x, y + 10);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        const words = comment.text.split(' ');
        let line = '';
        let lineY = y + 40;
        
        for (const word of words) {
          if (line.length + word.length > 25) {
            ctx.fillText(line, x, lineY);
            line = word + ' ';
            lineY += 20;
          } else {
            line += word + ' ';
          }
        }
        if (line) ctx.fillText(line, x, lineY);
        
        ctx.globalAlpha = 1;
      };

      // Draw each frame for 3 seconds (90 frames at 30fps)
      let frameTime = 0;
      const frameDuration = 3000; // 3 seconds
      const animationDuration = loadedImages.length * frameDuration;
      const startTime = Date.now();

      const drawFrame = () => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= animationDuration) {
          mediaRecorder.stop();
          return;
        }

        const currentFrameIndex = Math.floor(elapsed / frameDuration);
        if (currentFrameIndex < loadedImages.length) {
          const img = loadedImages[currentFrameIndex];
          const frame = frames[currentFrameIndex];
          const frameProgress = (elapsed % frameDuration) / frameDuration;

          // Draw black background
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw top cinematic bar
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, 60);
          
          // Draw bottom cinematic bar
          ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

          // Draw top film strip
          drawFilmStrip(10);
          
          // Draw sprocket holes
          drawSprocketHoles(true);
          drawSprocketHoles(false);

          // Draw frame content area
          const frameLeft = 80;
          const frameTop = 120;
          const frameWidth = canvas.width - 160;
          const frameHeight = canvas.height - 240;

          // Draw frame border
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 8;
          ctx.strokeRect(frameLeft, frameTop, frameWidth, frameHeight);

          // Draw and center image with zoom effect
          const zoomFactor = 1 + frameProgress * 0.05; // Slight zoom
          const imgRatio = img.width / img.height;
          const frameRatio = frameWidth / frameHeight;
          
          let drawWidth = frameWidth;
          let drawHeight = frameHeight;
          let x = frameLeft;
          let y = frameTop;

          if (imgRatio > frameRatio) {
            drawWidth = frameHeight * imgRatio;
            x = frameLeft + (frameWidth - drawWidth) / 2;
          } else {
            drawHeight = frameWidth / imgRatio;
            y = frameTop + (frameHeight - drawHeight) / 2;
          }

          // Apply zoom
          const centerX = x + drawWidth / 2;
          const centerY = y + drawHeight / 2;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.scale(zoomFactor, zoomFactor);
          ctx.translate(-centerX, -centerY);
          
          ctx.drawImage(img, x, y, drawWidth, drawHeight);
          ctx.restore();

          // Draw vignette & film effects
          drawVignette();
          drawFilmGrain();

          // Frame info overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(frameLeft, frameTop + frameHeight - 30, frameWidth, 30);
          
          ctx.fillStyle = '#d4af37';
          ctx.font = '10px monospace';
          ctx.fillText(`Frame ${currentFrameIndex + 1} / ${frames.length}`, frameLeft + 10, frameTop + frameHeight - 12);
          
          ctx.fillStyle = '#999';
          ctx.fillText('35mm', frameLeft + frameWidth - 40, frameTop + frameHeight - 12);

          // Draw bottom film strip
          drawFilmStrip(canvas.height - 50);

          // Draw comments with animation
          if (frame.comments && frame.comments.length > 0) {
            // Stagger comments
            const commentIndex = Math.floor(frameProgress * frame.comments.length);
            if (commentIndex < frame.comments.length) {
              const comment = frame.comments[commentIndex];
              const commentProgress = (frameProgress * frame.comments.length) % 1;
              const opacity = Math.min(commentProgress * 3, 1) * Math.max(1 - (commentProgress - 0.7) * 3, 0);
              
              drawComment(comment, opacity);
            }
          }
        }

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
      
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Lỗi tạo video: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setIsDownloading(false);
    }
  };

  
  if (!frames || frames.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Không có ảnh để hiển thị</p>
          <button onClick={() => onClose?.()} className="px-6 py-2 bg-[#d4af37] text-black rounded-lg font-bold">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // Giai đoạn INTRO: Máy chiếu zoom
  useEffect(() => {
    if (stage !== 'intro') return;
    const timer = setTimeout(() => setStage('playing'), 3000);
    return () => clearTimeout(timer);
  }, [stage]);

  // Giai đoạn PLAYING: Xử lý comments lần lượt
  useEffect(() => {
    if (stage !== 'playing') return;

    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame || !currentFrame.comments || currentFrame.comments.length === 0) {
      // Không có comment, chuyển frame sau 3s
      const timer = setTimeout(() => {
        if (currentFrameIndex < frames.length - 1) {
          setCurrentFrameIndex(prev => prev + 1);
          setCurrentCommentIndex(0);
          setShowComment(false);
        } else {
          setStage('end');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (currentCommentIndex < currentFrame.comments.length) {
      // Hiển thị comment lần lượt
      const timer = setTimeout(() => {
        setShowComment(true);
      }, 200);

      const nextCommentTimer = setTimeout(() => {
        setShowComment(false);
        setCurrentCommentIndex(prev => prev + 1);
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearTimeout(nextCommentTimer);
      };
    } else {
      // Hết comment của frame này, chuyển frame
      const timer = setTimeout(() => {
        if (currentFrameIndex < frames.length - 1) {
          setCurrentFrameIndex(prev => prev + 1);
          setCurrentCommentIndex(0);
          setShowComment(false);
        } else {
          setStage('end');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [stage, currentFrameIndex, currentCommentIndex, frames]);

  const currentFrame = frames[currentFrameIndex];
  const currentComment = currentFrame?.comments[currentCommentIndex];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-[9999] font-sans text-white">
      {/* GIAI ĐOẠN 1: INTRO - MÁYM CHIẾU ZOOM */}
      {stage === 'intro' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          {/* Luồng sáng hình thang từ trên xuống (Trapezoid Light) */}
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2"
            style={{
              width: '100px',
              height: '800px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 30%, rgba(0,0,0,0) 100%)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
              animation: 'projectorLight 3s ease-in-out forwards',
              filter: 'blur(40px) brightness(1.5)',
            }}
          />

          {/* Fade out đen */}
          <div
            className="absolute inset-0 bg-black"
            style={{
              animation: 'fadeOutBlack 2.5s ease-in 0.5s forwards'
            }}
          />

          <style>{`
            @keyframes projectorLight {
              0% {
                transform: translate(-50%, -400px) scaleY(0.3);
                opacity: 0;
              }
              20% {
                opacity: 1;
              }
              80% {
                opacity: 1;
              }
              100% {
                transform: translate(-50%, 0) scaleY(1);
                opacity: 0;
              }
            }
            @keyframes fadeOutBlack {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* GIAI ĐOẠN 2: PLAYING - THƯỚC PHIM CHIẾU */}
      {stage === 'playing' && currentFrame && (
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-black">
          {/* Background film grain */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              rgba(0,0,0,0.15) 0px,
              rgba(0,0,0,0.15) 1px,
              transparent 1px,
              transparent 2px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(0,0,0,0.1) 0px,
              rgba(0,0,0,0.1) 1px,
              transparent 1px,
              transparent 2px
            )`,
          }} />

          {/* Main Film Frame Container */}
          <div className="relative flex items-center justify-center p-6" style={{ maxWidth: '500px', width: '100%' }}>
            {/* Film Strip Wrapper */}
            <div className="relative w-full">
              {/* Top Film Strip */}
              <div className="flex justify-center mb-6">
                <div className="flex gap-2">
                  {[...Array(12)].map((_, i) => (
                    <div key={`top-${i}`} className="w-4 h-6 bg-gray-800 border border-gray-700 rounded-sm" />
                  ))}
                </div>
              </div>

              {/* Frame Content */}
              <div className="relative border-4 border-gray-900 shadow-2xl overflow-hidden" style={{
                aspectRatio: '1 / 1.5',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
              }}>
                {/* Sprocket Holes - Left */}
                <div className="absolute left-[-30px] top-0 bottom-0 flex flex-col justify-around py-4 w-6 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={`left-${i}`}
                      className="w-5 h-3 bg-gray-950 border border-gray-700 rounded-sm shadow-inner"
                    />
                  ))}
                </div>

                {/* Sprocket Holes - Right */}
                <div className="absolute right-[-30px] top-0 bottom-0 flex flex-col justify-around py-4 w-6 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={`right-${i}`}
                      className="w-5 h-3 bg-gray-950 border border-gray-700 rounded-sm shadow-inner"
                    />
                  ))}
                </div>

                {/* Image with Vignette */}
                <div className="relative w-full h-full">
                  {currentFrame?.image_url ? (
                    <>
                      <img
                        src={currentFrame.image_url}
                        alt="frame"
                        className="w-full h-full object-contain"
                        loading="lazy"
                        style={{
                          filter: 'contrast(1.08) brightness(0.95) saturate(1.1)',
                          animation: 'filmFrameZoom 0.6s ease-out forwards'
                        }}
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect fill="%23333" width="400" height="600"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="16"%3EImage Not Available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      {/* Vignette Overlay */}
                      <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
                      }} />
                      {/* Film Scratch & Dust Effect */}
                      <div className="absolute inset-0 pointer-events-none opacity-5" style={{
                        backgroundImage: `linear-gradient(
                          90deg,
                          transparent 0%,
                          rgba(255,255,255,0.3) 2%,
                          transparent 4%,
                          transparent 8%,
                          rgba(255,255,255,0.2) 10%,
                          transparent 12%
                        )`,
                        backgroundSize: '200% 100%',
                        animation: 'filmScratch 4s linear infinite'
                      }} />
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                {/* Frame Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black via-black/80 to-transparent text-[10px] text-gray-400 font-mono space-y-1">
                  {currentFrame.likes !== undefined && (
                    <div className="flex items-center gap-1 text-[#d4af37]">
                      <Heart size={10} className="fill-[#d4af37]" />
                      <span>{currentFrame.likes}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>Frame {currentFrameIndex + 1} / {frames.length}</span>
                    <span>35mm</span>
                  </div>
                </div>
              </div>

              {/* Bottom Film Strip */}
              <div className="flex justify-center mt-6">
                <div className="flex gap-2">
                  {[...Array(12)].map((_, i) => (
                    <div key={`bottom-${i}`} className="w-4 h-6 bg-gray-800 border border-gray-700 rounded-sm" />
                  ))}
                </div>
              </div>
            </div>
          </div>


          {/* Comment Danmaku - Side Overlay */}
          <div className="absolute left-4 right-4 bottom-32 z-50 pointer-events-none">
            {showComment && currentComment && (
              <div className="max-w-xs mx-auto">
                <div
                  className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-lg border border-[#d4af37]/40 flex items-start gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300"
                  style={{ animation: 'commentSlide 3s ease-in-out forwards' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[#d4af37] font-bold text-xs truncate">
                      {currentComment.user}
                    </p>
                    <p className="text-white/90 text-xs line-clamp-2 mt-1">
                      {currentComment.text}
                    </p>
                  </div>
                  <Heart size={12} className="text-[#d4af37] fill-[#d4af37] flex-shrink-0 mt-1" />
                </div>
              </div>
            )}
          </div>

          {/* Cinematic Side Bars */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={() => onClose?.()}
            className="absolute top-6 right-6 z-[51] text-gray-400 hover:text-white transition-colors bg-black/50 p-2 rounded-lg hover:bg-black/70"
          >
            <X size={24} />
          </button>

          {/* Keyframe Animations */}
          <style>{`
            @keyframes filmFrameZoom {
              0% {
                transform: scale(0.95);
                opacity: 0;
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            @keyframes filmScratch {
              0% { backgroundPosition: 0% 0%; }
              100% { backgroundPosition: 100% 0%; }
            }
            @keyframes commentSlide {
              0% {
                opacity: 0;
                transform: translateY(10px);
              }
              10% {
                opacity: 1;
                transform: translateY(0);
              }
              85% {
                opacity: 1;
                transform: translateY(0);
              }
              100% {
                opacity: 0;
                transform: translateY(-10px);
              }
            }
          `}</style>
        </div>
      )}

      {/* GIAI ĐOẠN 3: END - CREDIT */}
      {stage === 'end' && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#d4af37] to-[#b89628] bg-clip-text text-transparent">
              {eventName}
            </h1>
            <p className="text-gray-400 text-sm">
              Được chia sẻ bởi <span className="text-[#d4af37] font-bold">{authorName}</span>
            </p>
            <p className="text-gray-500 text-xs">
              ✨ Cảm ơn đã xem kỷ niệm của chúng tôi
            </p>
          </div>

          <div className="flex gap-4 justify-center pt-4 flex-wrap">
            <button
              onClick={() => {
                setStage('playing');
                setCurrentFrameIndex(0);
                setCurrentCommentIndex(0);
                setShowComment(false);
              }}
              className="px-6 py-3 bg-[#d4af37] text-black rounded-lg font-bold hover:scale-105 transition-transform flex items-center gap-2"
            >
              🔄 Xem Lại
            </button>
            <button
              onClick={downloadVideo}
              disabled={isDownloading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              {isDownloading ? 'Đang tải...' : 'Tải Video'}
            </button>
            <button
              onClick={() => onClose?.()}
              className="px-6 py-3 bg-[#333] text-white rounded-lg font-bold hover:scale-105 transition-transform"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Nút đóng */}
      <button
        onClick={() => onClose?.()}
        className="absolute top-6 right-6 z-[51] text-gray-400 hover:text-white transition-colors bg-black/50 p-2 rounded-lg"
      >
        <X size={24} />
      </button>
    </div>
  );
}
