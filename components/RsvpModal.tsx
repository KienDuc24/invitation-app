"use client";

import { useState, useEffect } from "react";
import { X, Send, CheckCircle, Loader2, RefreshCw, Frown, Heart } from "lucide-react";
import confetti from "canvas-confetti"; 
import { supabase } from "@/lib/supabase"; // 👈 QUAN TRỌNG: Import Supabase

interface RsvpModalProps {
  onClose: () => void;
  guestId: string;
  defaultName: string;
  hasConfirmed: boolean;
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
  
  // State để hứng lỗi nếu có
  const [errorMsg, setErrorMsg] = useState("");

  const isBusyPreviously = initialAttendance?.toLowerCase().includes("bận") || initialAttendance?.toLowerCase().includes("tiếc");

  const [viewMode, setViewMode] = useState<'form' | 'busy-screen'>(
    (hasConfirmed && isBusyPreviously) ? 'busy-screen' : 'form'
  );

  const [formData, setFormData] = useState({
    name: defaultName || "",
    attendance: initialAttendance || "Có tham dự",
    wish: initialWish || ""
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  // --- HÀM GỬI DỮ LIỆU MỚI (Dùng Supabase) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(""); // Reset lỗi

    try {
      console.log("Đang gửi RSVP cho ID:", guestId);

      // 1. Gửi lệnh Update lên Supabase
      const { error } = await supabase
        .from('guests')
        .update({
          is_confirmed: true,
          attendance: formData.attendance,
          wish: formData.wish,
          // name: formData.name // Không update tên để tránh bị sửa bậy
        })
        .eq('id', guestId); // Tìm đúng dòng có ID khách

      if (error) throw error; // Nếu có lỗi thì ném xuống catch

      // 2. Nếu thành công
      console.log("✅ Đã lưu thành công!");
      setSuccess(true);
      
      // Lưu tạm vào LocalStorage để nhớ trạng thái
      localStorage.setItem(`rsvp_${guestId}`, "true");

      // 3. Hiệu ứng pháo hoa
      if (formData.attendance === "Có tham dự") {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const random = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            
            confetti({
                particleCount,
                startVelocity: 30,
                spread: 360,
                ticks: 60,
                zIndex: 10000000,
                colors: ['#d4af37', '#ffffff', '#fadd7d'],
                origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 },
            });
            confetti({
                particleCount,
                startVelocity: 30,
                spread: 360,
                ticks: 60,
                zIndex: 10000000,
                colors: ['#d4af37', '#ffffff', '#fadd7d'],
                origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 },
            });
        }, 250);
      }

      // 4. Đóng modal và reload trang sau 2s
      setTimeout(() => {
        onClose();
        window.location.reload(); 
      }, 2000);

    } catch (error: any) {
      console.error("❌ Lỗi khi lưu:", error);
      setErrorMsg("Lỗi: " + (error.message || "Không thể lưu dữ liệu"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#111] border border-[#d4af37]/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(212,175,55,0.15)] animate-in zoom-in-95 duration-300 overflow-hidden">
        
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-50"><X size={24} /></button>

        {success ? (
          <div className="text-center py-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-[#d4af37] mb-2">Cảm ơn {formData.name}!</h3>
            <p className="text-gray-400 text-sm">
                {formData.attendance === "Có tham dự" 
                    ? "Hẹn gặp lại bạn tại buổi lễ nhé! ❤️" 
                    : "Đã ghi nhận phản hồi của bạn."}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'busy-screen' ? (
              <div className="text-center py-6 space-y-6">
                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto border border-gray-700">
                    <Frown className="w-10 h-10 text-gray-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#fadd7d] mb-2">Rất tiếc vì bạn vắng mặt!</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                    Chúng mình đã ghi nhận phản hồi:<br/>
                    <span className="text-white font-medium italic">"{initialAttendance}"</span>
                    </p>
                </div>
                
                <div className="pt-2 border-t border-white/10">
                  <button 
                    onClick={() => {
                      setFormData(prev => ({ ...prev, attendance: "Có tham dự" }));
                      setViewMode('form');
                    }}
                    className="w-full py-3 bg-[#d4af37]/10 border border-[#d4af37]/50 text-[#d4af37] rounded-xl text-sm font-bold hover:bg-[#d4af37] hover:text-black transition-all"
                  >
                    🎉 Mình sẽ tham gia!
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                
                {hasConfirmed && (
                   <div className="mb-6 p-3 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg flex items-center gap-3">
                      <div className="bg-[#d4af37]/20 p-1.5 rounded-full"><CheckCircle className="text-[#d4af37]" size={16} /></div>
                      <div>
                        <p className="text-xs text-[#fadd7d] font-bold uppercase tracking-wider">Đã xác nhận</p>
                        <p className="text-[10px] text-gray-400">Bạn đang cập nhật lại thông tin cũ.</p>
                      </div>
                   </div>
                )}

                <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#fadd7d] to-[#aa8e26] mb-8 uppercase tracking-widest">
                  {hasConfirmed ? "Cập Nhật RSVP" : "Xác Nhận RSVP"}
                </h2>
                
                {/* Hiển thị lỗi nếu có */}
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm text-center">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest ml-1">Tên khách mời</label>
                    <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        readOnly 
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-gray-400 font-medium cursor-not-allowed focus:outline-none select-none" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest ml-1">Bạn sẽ tham dự chứ?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, attendance: "Có tham dự"})} 
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${
                          formData.attendance === "Có tham dự" 
                            ? "bg-[#d4af37] border-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20 scale-[1.02]" 
                            : "bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500 hover:bg-[#222]"
                        }`}
                      >
                        <Heart className={`w-6 h-6 ${formData.attendance === "Có tham dự" ? "fill-black" : ""}`} />
                        <span className="text-xs font-bold uppercase">Chắc chắn rồi</span>
                      </button>

                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, attendance: "Rất tiếc, mình bận"})} 
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${
                          formData.attendance === "Rất tiếc, mình bận" 
                            ? "bg-gray-700 border-gray-600 text-white shadow-lg" 
                            : "bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500 hover:bg-[#222]"
                        }`}
                      >
                        <X className="w-6 h-6" />
                        <span className="text-xs font-bold uppercase">Tiếc quá, mình bận</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest ml-1">Lời nhắn gửi</label>
                    <textarea 
                        value={formData.wish} 
                        onChange={(e) => setFormData({...formData, wish: e.target.value})} 
                        className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-4 text-white h-24 resize-none focus:border-[#d4af37] focus:outline-none placeholder:text-gray-700 text-sm transition-colors" 
                        placeholder="Gửi vài lời chúc đến mình nhé..." 
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold text-lg py-3.5 rounded-xl hover:shadow-lg hover:shadow-[#d4af37]/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : (hasConfirmed ? <RefreshCw size={20} /> : <Send size={20} />)}
                    {hasConfirmed ? "CẬP NHẬT LẠI" : "GỬI XÁC NHẬN"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}