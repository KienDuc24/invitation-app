"use client";

import { CATMI_CONFIG } from '@/lib/catmiConfig';
import { ChevronLeft, HelpCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

// Định nghĩa các bước hướng dẫn với target element để highlight
const STEPS = [
  {
    id: 'intro',
    gif: '/media/welcome.gif',
    title: 'Chào mừng!',
    content: 'Đây là thiệp tốt nghiệp online của Đức Kiên. Hướng dẫn 9 bước giúp bạn bắt đầu nhanh chóng. Bấm "?" để xem lại anytime!',
    buttonText: 'Bắt đầu',
    highlight: null,
    isCompact: false,
    tabToActivate: null
  },
  {
    id: 'avatar',
    gif: '/media/focus.gif',
    title: '1. Đổi ảnh đại diện',
    content: 'Click ảnh bạn ở góc trên cùng bên trái. Chọn ảnh từ máy để upload.',
    highlight: '[data-tutorial-avatar]',
    isCompact: true,
    tabToActivate: null,
    modalPosition: 'center'
  },
  {
    id: 'card-view',
    gif: '/media/thinking.gif',
    title: '2. Xem thiệp (2D & 3D)',
    content: 'Bấm "Xem thiệp" ở dưới. Chế độ 2D nhanh, 3D thì xoay được.',
    highlight: '[data-tutorial-view-card]',
    isCompact: true,
    tabToActivate: null,
    modalPosition: 'center'
  },
  {
    id: 'wish-write',
    gif: '/media/sassy.gif',
    title: '3. Viết lời chúc',
    content: 'Tab "Lưu bút" → viết lời chúc → thêm ảnh → gửi.',
    highlight: '[data-tutorial-wish-tab]',
    isCompact: true,
    tabToActivate: 'wish',
    modalPosition: 'bottom'
  },
  {
    id: 'wish-manage',
    gif: '/media/yessir.gif',
    title: '4. Quản lý lời chúc',
    content: 'Bấm "Của bạn" → chỉnh sửa ✏️, xóa 🗑️, hoặc tạo Story 📸.',
    highlight: '[data-tutorial-wish-manage]',
    isCompact: true,
    tabToActivate: 'wish',
    modalPosition: 'bottom'
  },
  {
    id: 'wish-interact',
    gif: '/media/happy.gif',
    title: '5. Tương tác lời chúc',
    content: 'Tab "Công khai" → thích ❤️, bình luận, tạo Story từ ảnh người khác.',
    highlight: '[data-tutorial-wish-public]',
    isCompact: true,
    tabToActivate: 'wish',
    modalPosition: 'bottom'
  },
  {
    id: 'chat-groups',
    gif: '/media/cute.gif',
    title: '6. Chat nhóm',
    content: 'Tab "Kết nối" → các nhóm → gửi tin nhắn/ảnh. Trò chuyện cùng những người bạn có điểm chung! ',
    highlight: '[data-tutorial-chat-groups-list]',
    isCompact: true,
    isMinimal: true,
    tabToActivate: 'chat',
    modalPosition: 'left'
  },
  {
    id: 'catmi',
    gif: '/media/focus.gif',
    title: '7. Catmi AI',
    content: 'Nút mèo 😸 ở góc dưới phải → hỏi/yêu cầu → tự động ẩn khi chat.',
    highlight: '[data-tutorial-catmi]',
    isCompact: true,
    tabToActivate: null,
    modalPosition: 'center'
  },
  {
    id: 'final',
    gif: '/media/success.gif',
    title: '8. Bắt đầu thôi!',
    content: 'Cập nhật ảnh đẹp → viết lời chúc → chat vui vẻ → tạo Story. Chia sẻ kỷ niệm cùng Kiên! 🎉',
    highlight: null,
    isCompact: false,
    tabToActivate: null,
    modalPosition: 'center'
  }
];

interface CatmiTutorialProps {
  disabled?: boolean;
}

interface Step {
  id: string;
  gif: string;
  title: string;
  content: string;
  buttonText?: string;
  highlight?: string | null;
  isCompact?: boolean;
  isMinimal?: boolean;
  tabToActivate?: string | null;
  modalPosition?: 'center' | 'top' | 'bottom' | 'left';
}

export default function CatmiTutorial({ disabled = false }: CatmiTutorialProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [iconPosition, setIconPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (disabled || !CATMI_CONFIG.enabled) return;
    
    const hasSeenTutorial = localStorage.getItem(CATMI_CONFIG.storageKey);
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => setIsOpen(true), CATMI_CONFIG.showDelay);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  // Cập nhật vị trí highlight element & emit tab change event
  useEffect(() => {
    if (!isOpen) return;
    
    const step = STEPS[currentStep] as Step;
    
    // Emit event để GuestDashboard thay đổi tab
    if (step.tabToActivate) {
      window.dispatchEvent(new CustomEvent('tutorial-tab-change', { 
        detail: { tab: step.tabToActivate } 
      }));
    }
    
    // Delay để chờ element render (đặc biệt khi tab thay đổi)
    let retryCount = 0;
    const maxRetries = 3;
    
    const tryHighlight = () => {
      if (step.highlight) {
        const element = document.querySelector(step.highlight);
        
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
          // Scroll element vào view
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(tryHighlight, 300); // Thử lại sau 300ms
        } else {
          setHighlightRect(null); // Nếu không tìm thấy sau nhiều lần thì clear
        }
      } else {
        setHighlightRect(null);
      }
    };
    
    const highlightTimer = setTimeout(tryHighlight, 500); // Initial delay 500ms
    
    return () => clearTimeout(highlightTimer);
  }, [currentStep, isOpen]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(CATMI_CONFIG.storageKey, 'true');
  };

  const openTutorial = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const resetTutorial = () => {
    localStorage.removeItem(CATMI_CONFIG.storageKey);
    setCurrentStep(0);
    setIsOpen(true);
  };

  const handleIconMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsDragging(true);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setIconPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) {
    return (
      <button
        onMouseDown={handleIconMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={isDragging ? undefined : openTutorial}
        className="fixed z-[9998] group cursor-grab active:cursor-grabbing"
        style={{
          left: iconPosition.x ? `${iconPosition.x}px` : 'auto',
          right: !iconPosition.x ? '24px' : 'auto',
          top: iconPosition.y ? `${iconPosition.y}px` : '56px',
        }}
        title="Bấm để xem hướng dẫn (kéo để di chuyển)"
      >
        <div className="relative bg-[#d4af37] rounded-full p-1.5 shadow-[0_0_12px_rgba(212,175,55,0.5)] hover:shadow-[0_0_20px_rgba(212,175,55,0.7)] transition-all duration-300 hover:scale-110 active:scale-95">
          <HelpCircle size={18} className="text-black" />
        </div>
      </button>
    );
  }

  const step = STEPS[currentStep] as Step;
  const isCompact = step.isCompact && step.highlight;

  return (
    <>
      {/* Spotlight Overlay - khi highlight element */}
      {highlightRect && isCompact && (
        <>
          {/* Overlay bên ngoài với spotlight - semi-transparent */}
          <div 
            className="fixed inset-0 z-[9997] pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 0%, transparent ${Math.max(Math.max(highlightRect.width, highlightRect.height) / 2 + 30, 80)}px, rgba(0, 0, 0, 0.7) 100%)`
            }}
          />
          
          {/* Highlight border neon */}
          <div 
            className="fixed z-[9997] pointer-events-none border-2 border-[#d4af37] rounded-lg shadow-[0_0_30px_rgba(212,175,55,0.8)] animate-pulse"
            style={{
              left: `${highlightRect.left - 8}px`,
              top: `${highlightRect.top - 8}px`,
              width: `${highlightRect.width + 16}px`,
              height: `${highlightRect.height + 16}px`,
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.8), inset 0 0 30px rgba(212, 175, 55, 0.3)'
            }}
          />
        </>
      )}

      {/* Modal - Compact hoặc Normal */}
      <div 
        className={`fixed z-[9999] transition-all duration-300 ${
          isCompact 
            ? `inset-0 flex justify-center p-3 sm:p-4 ${
                step.modalPosition === 'top' ? 'items-start pt-8 sm:pt-12' : 
                step.modalPosition === 'bottom' ? 'items-end pb-8 sm:pb-12' : 
                step.modalPosition === 'left' ? 'items-start pt-8 sm:items-center sm:justify-start sm:pl-6' :
                'items-center'
              }`
            : 'inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4'
        }`}
        onClick={isCompact ? undefined : handleClose}
      >
        <div 
          className={`bg-[#1a1a1a] border-2 border-[#d4af37] rounded-[1.5rem] overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.3)] relative flex flex-col ${
            isCompact 
              ? step.isMinimal ? 'w-5/6 sm:max-w-xs' : 'w-4/5 sm:max-w-xs'
              : 'w-full max-w-md'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Nút tắt */}
          <button 
            onClick={handleClose}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 text-gray-500 hover:text-white transition-colors z-20 hover:scale-110 active:scale-95 pointer-events-auto cursor-pointer"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>

          {/* Phần Hình Ảnh (GIF Mèo) */}
          <div className={`${isCompact ? step.isMinimal ? 'h-24 sm:h-32' : 'h-32 sm:h-40' : 'h-48 sm:h-64'} bg-gradient-to-b from-[#1a1a1a] to-[#111] flex items-center justify-center relative overflow-hidden border-b border-[#d4af37]/20`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#d4af3720_0%,_transparent_70%)]" />
            
            <img 
              src={step.gif} 
              alt="Catmi Guide" 
              className="h-full w-full object-contain relative z-10 drop-shadow-2xl"
              loading="lazy"
            />
          </div>

          {/* Phần Nội Dung */}
          <div className={`${isCompact ? step.isMinimal ? 'p-2 sm:p-3' : 'p-3 sm:p-4' : 'p-4 sm:p-6'} text-center space-y-1 sm:space-y-2 flex-1 flex flex-col max-h-[40vh] sm:max-h-none overflow-y-auto`}>
            <h2 className={`font-bold text-[#d4af37] uppercase tracking-wider leading-tight ${
              isCompact ? step.isMinimal ? 'text-xs sm:text-sm' : 'text-sm sm:text-base' : 'text-base sm:text-lg'
            }`}>
              {step.title}
            </h2>
            
            <p className={`text-gray-300 leading-relaxed font-light ${
              isCompact ? step.isMinimal ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-xs' : 'text-xs sm:text-sm'
            }`}>
              {step.content}
            </p>

            <div className="flex-1" />

            {/* Điều hướng */}
            <div className="flex items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 justify-center">
              {currentStep > 0 && (
                <button 
                  onClick={handlePrev}
                  className="p-1.5 sm:p-2 rounded-lg bg-[#333] text-gray-300 hover:text-white hover:bg-[#444] active:scale-95 transition-all"
                  title="Quay lại"
                >
                  <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}
              
              <button 
                onClick={handleNext}
                className="p-1.5 sm:p-2 rounded-lg bg-[#d4af37] text-black hover:bg-[#b89628] active:scale-95 transition-all shadow-lg shadow-[#d4af37]/20 hover:shadow-[#d4af37]/40"
                title="Tiếp tục"
              >
                <ChevronLeft size={18} className="sm:w-5 sm:h-5 rotate-180" />
              </button>
            </div>

            {/* Chỉ số bước */}
            <div className="flex justify-center gap-0.5 sm:gap-1 pt-1.5 sm:pt-2">
              {STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-0.5 sm:h-1 rounded-full transition-all duration-300 cursor-pointer hover:bg-[#d4af37]/70 ${
                    idx === currentStep ? 'w-4 sm:w-5 bg-[#d4af37]' : 'w-0.5 sm:w-1 bg-[#333]'
                  }`}
                  onClick={() => setCurrentStep(idx)}
                  title={`Bước ${idx + 1}`}
                />
              ))}
            </div>

            {/* Progress text */}
            <div className="text-[10px] sm:text-xs text-gray-500 pt-1">
              {currentStep + 1} / {STEPS.length}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// Export hook để reset từ component khác
export function useCatmiTutorial() {
  return {
    resetTutorial: () => {
      localStorage.removeItem('catmi_tutorial_seen_v1');
      window.location.reload();
    }
  };
}
