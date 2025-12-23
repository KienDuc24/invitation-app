"use client";

import { useState } from "react";
import { X, Send, CheckCircle, Loader2, RefreshCw } from "lucide-react";

// 👇 LINK WEB APP CỦA BẠN
const SCRIPT_URL =" https://script.google.com/macros/s/AKfycbx3FMwJ0ERwCUcDq8C6HMlXSfljxD4xBP71tYOPvl_nUBfditseGuYXaQAXuWMStIOA/exec";

interface RsvpModalProps {
  onClose: () => void;
  defaultName: string;
  guestId: string; // Nhận thêm ID
  hasConfirmed: boolean; // Nhận trạng thái từ Sheet
}

export default function RsvpModal({ onClose, defaultName, guestId, hasConfirmed }: RsvpModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Nếu đã confirm rồi thì đổi giao diện, chưa thì thôi
  const [isUpdateMode, setIsUpdateMode] = useState(hasConfirmed);

  const [formData, setFormData] = useState({
    name: defaultName || "",
    attendance: "Có tham dự",
    wish: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        // Gửi kèm ID để Sheet nhận diện
        body: JSON.stringify({ ...formData, id: guestId }), 
      });

      setSuccess(true);
      // Lưu tạm vào máy khách để cập nhật ngay lập tức (vì Google Sheet cần 1-2p mới update CSV)
      localStorage.setItem(`rsvp_${guestId}`, "true");
      
      setTimeout(() => {
        onClose();
        window.location.reload(); // Reload nhẹ để cập nhật trạng thái nếu cần
      }, 2000);
    } catch (error) {
      alert("Lỗi kết nối!");
    } finally {
      setLoading(false);
    }
  };

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
            {/* LOGIC HIỂN THỊ THÔNG BÁO */}
            {hasConfirmed && (
               <div className="mb-6 p-3 bg-[#d4af37]/10 border border-[#d4af37]/50 rounded-lg flex items-start gap-3">
                  <CheckCircle className="text-[#d4af37] shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-[#fadd7d] font-bold">Bạn đã xác nhận tham dự rồi.</p>
                    <p className="text-xs text-gray-400">Bạn có muốn thay đổi thông tin hoặc lời chúc không? Hãy điền lại bên dưới nhé.</p>
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
                    <button key={option} type="button" onClick={() => setFormData({...formData, attendance: option})} className={`p-3 rounded-lg text-sm font-medium transition-all border ${formData.attendance === option ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}>
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
      </div>
    </div>
  );
}