"use client";

import { X } from "lucide-react";

import { useState } from "react";

interface BirthdayOverlayProps {
  onClose: () => void;
}

export default function BirthdayOverlay({ onClose }: BirthdayOverlayProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "🎂 Chúc mừng sinh nhật, Cùn!",
      content: "Catmi có một điều đặc biệt dành cho Cùn hôm nay. Hãy theo hướng dẫn này để nhận lời chúc từ Catmi nhé!",
      emoji: "🎂",
      action: "Tiếp theo →"
    },
    {
      title: "Bước 1: Tìm Catmi",
      content: "Nhìn xuống dưới cùng màn hình, bạn sẽ thấy bubble chat với mèo Catmi. Bấm vào nó để mở hộp thoại!",
      emoji: "🐱",
      action: "Tiếp theo →"
    },
    {
      title: "Bước 2: Nhắn tin chúc mừng",
      content: "Viết tin nhắn: \"chúc mừng sinh nhật\" hoặc \"sinh nhật\" và gửi cho Catmi.",
      emoji: "💬",
      action: "Tiếp theo →"
    },
    {
      title: "Bước 3: Nhận lời chúc từ Catmi",
      content: "Catmi sẽ trả lời bằng một bài thơ hay hoặc lời chúc ý nghĩa dành riêng cho Cùn. Hãy chọn loại lời chúc mà Cùn thích nhất!",
      emoji: "✨",
      action: "Bắt đầu thôi! 🎉",
      isLast: true
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#111] to-[#050505] border border-[#d4af37]/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#d4af37]/20 to-transparent p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#d4af37] mb-2">{currentStep.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all flex-shrink-0 ml-2"
            title="Đóng"
          >
            <X size={20} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Emoji Display */}
        <div className="w-full bg-black/50 py-12 flex justify-center items-center">
          <div className="text-8xl animate-bounce">{currentStep.emoji}</div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 text-center mb-6 leading-relaxed">
            {currentStep.content}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === step ? "bg-[#d4af37] w-6" : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 py-2 px-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-all font-bold text-sm"
              >
                ← Quay lại
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep.isLast) {
                  onClose();
                } else {
                  setStep(step + 1);
                }
              }}
              className="flex-1 py-2 px-4 bg-gradient-to-r from-[#d4af37] to-[#ffd700] hover:shadow-lg hover:shadow-[#d4af37]/40 text-black rounded-lg transition-all font-bold text-sm"
            >
              {currentStep.action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
