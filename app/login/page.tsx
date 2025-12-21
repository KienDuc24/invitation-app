"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase"; // Import kết nối DB
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Gọi Supabase kiểm tra xem mã code có tồn tại không
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("code", code.toUpperCase()) // Chuyển thành chữ hoa cho chắc
      .single();

    if (error || !data) {
      setError("Mã khách mời không hợp lệ hoặc không tìm thấy!");
      setLoading(false);
    } else {
      // 2. Nếu đúng, lưu thông tin vào localStorage (tạm thời)
      // Để trang chủ biết ai đang đăng nhập
      localStorage.setItem("guest_name", data.name);
      localStorage.setItem("guest_id", data.id);
      
      // 3. Chuyển hướng về trang chủ
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md p-8 border border-white/20 rounded-2xl bg-white/5 backdrop-blur-lg shadow-2xl">
        <h1 className="text-3xl font-bold text-center mb-2">Check In</h1>
        <p className="text-gray-400 text-center mb-8">Nhập mã định danh trên vé mời của bạn</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              placeholder="Ví dụ: DEV01"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/50 border border-white/20 focus:border-yellow-500 focus:outline-none text-white placeholder-gray-600 text-center uppercase tracking-widest text-xl"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? "Đang kiểm tra..." : "Mở Thiệp"}
          </button>
        </form>
      </div>
    </div>
  );
}