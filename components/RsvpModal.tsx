"use client";

import { useState, useEffect } from "react";
import { X, Send, CheckCircle, Loader2, RefreshCw, Frown } from "lucide-react"; // Thêm icon Frown

const SCRIPT_URL =" https://script.google.com/macros/s/AKfycbx3FMwJ0ERwCUcDq8C6HMlXSfljxD4xBP71tYOPvl_nUBfditseGuYXaQAXuWMStIOA/exec";

interface RsvpModalProps {
  onClose: () => void;
  guestId: string;
  defaultName: string;
  hasConfirmed: boolean;
  // 👇 Nhận thêm dữ liệu cũ để fill vào form
  initialAttendance?: string; 
  initialWish?: string;
}

export default function RsvpModal({ 
  onClose, 
  defaultName, 
  guestId, 
  hasConfirmed, 
  initialAttendance, 
  initialWish 
}: RsvpModalProps) {
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Xác định xem người dùng trước đó chọn "Bận" hay không
  // Lưu ý: String so sánh phải khớp với value bạn gửi lên sheet ("Rất tiếc, mình bận")
  const isBusyPreviously = initialAttendance?.includes("bận") || initialAttendance?.includes("tiếc");

  // State quản lý chế độ xem: 'form' (điền đơn) hoặc 'busy-screen' (thông báo bận)
  // Nếu đã confirm và là bận -> hiện màn hình busy. Ngược lại hiện form.
  const [viewMode, setViewMode] = useState<'form' | 'busy-screen'>(
    (hasConfirmed && isBusyPreviously) ? 'busy-screen' : 'form'
  );

  const [formData, setFormData] = useState({
    name: defaultName || "",
    // Nếu có dữ liệu cũ thì lấy, không thì mặc định "Có tham dự"
    attendance: initialAttendance || "Có tham dự",
    wish: initialWish || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: guestId }), 
      });

      setSuccess(true);
      localStorage.setItem(`rsvp_${guestId}`, "true");
      
      setTimeout(() => {
        onClose();
        window.location.reload(); 
      }, 2000);
    } catch (error) {
      alert("Lỗi kết nối!");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER GIAO DIỆN ---

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#111] border border-[#d4af37]/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#d4af37]">Cập nhật thành công!</h3>
          </div>
        ) : (
          <>
            {/* TRƯỜNG HỢP 1: ĐÃ XÁC NHẬN LÀ BẬN -> HIỆN MÀN HÌNH KHÁC */}
            {viewMode === 'busy-screen' ? (
              <div className="text-center py-6 space-y-4">
                <Frown className="w-16 h-16 text-gray-400 mx-auto" />
                <h2 className="text-xl font-bold text-[#fadd7d]">Rất tiếc vì bạn không thể tham gia!</h2>
                <p className="text-sm text-gray-400">
                  Chúng mình đã ghi nhận phản hồi của bạn: <br/>
                  <span className="text-white font-medium">"{initialAttendance}"</span>
                </p>
                <div className="pt-4">
                  <p className="text-xs text-gray-500 mb-2">Nếu bạn đổi ý và có thể tham gia, hãy bấm nút dưới đây:</p>
                  <button 
                    onClick={() => {
                      // Chuyển sang chế độ form và set lại trạng thái mặc định là có đi
                      setFormData(prev => ({ ...prev, attendance: "Có tham dự" }));
                      setViewMode('form');
                    }}
                    className="bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] px-4 py-2 rounded-lg text-sm hover:bg-[#d4af37]/30 transition-all"
                  >
                    Mình muốn tham gia!
                  </button>
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP 2: FORM ĐIỀN (MỚI HOẶC UPDATE) */
              <>
                {hasConfirmed && (
                   <div className="mb-6 p-3 bg-[#d4af37]/10 border border-[#d4af37]/50 rounded-lg flex items-start gap-3">
                      <CheckCircle className="text-[#d4af37] shrink-0 mt-1" size={20} />
                      <div>
                        <p className="text-sm text-[#fadd7d] font-bold">Bạn đã xác nhận trước đó.</p>
                        <p className="text-xs text-gray-400">Thông tin cũ đã được điền sẵn bên dưới.</p>
                      </div>
                   </div>
                )}

                <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#fadd7d] to-[#aa8e26] mb-6 uppercase tracking-wider">
                  {hasConfirmed ? "Cập Nhật Thông Tin" : "Xác Nhận Tham Dự"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-[#d4af37] uppercase mb-1 block">Tên hiển thị</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] focus:outline-none" />
                  </div>

                  <div>
                    <label className="text-xs text-[#d4af37] uppercase mb-2 block">Trạng thái</label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Có tham dự", "Rất tiếc, mình bận"].map((option) => (
                        <button 
                          key={option} 
                          type="button" 
                          onClick={() => setFormData({...formData, attendance: option})} 
                          className={`p-3 rounded-lg text-sm font-medium transition-all border ${
                            formData.attendance === option 
                            ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]" 
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#d4af37] uppercase mb-1 block">Lời nhắn gửi</label>
                    <textarea value={formData.wish} onChange={(e) => setFormData({...formData, wish: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white h-24 resize-none focus:border-[#d4af37] focus:outline-none" placeholder="Viết lời chúc..." />
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#d4af37] to-[#aa8e26] text-black font-bold py-3 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 mt-2">
                    {loading ? <Loader2 className="animate-spin" /> : (hasConfirmed ? <RefreshCw size={18} /> : <Send size={18} />)}
                    {hasConfirmed ? "CẬP NHẬT LẠI" : "GỬI XÁC NHẬN"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}