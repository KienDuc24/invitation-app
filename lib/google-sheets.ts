import Papa from 'papaparse';

// 👇 QUAN TRỌNG: DÁN LINK CSV CỦA BẠN VÀO ĐÂY (Link phải có đuôi .../pub?output=csv)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQ-umIuRyemVtMIEwgkXqzSTjIbxmSx5Tc8sMd4HDmjZNICE5yQqGPrkK9s3-PNNU_I_-AfRAMLpSC/pub?gid=0&single=true&output=csv";

export type GuestInfo = {
  id: string;
  name: string;
  isConfirmed: boolean;
  attendance?: string; // 👇 Thêm trường này: Lưu cụ thể là "Có tham dự" hay "Bận"
  wish?: string;       // 👇 Thêm trường này: Lưu lời chúc cũ
};

export async function getGuestsFromSheet(): Promise<Record<string, GuestInfo>> {
  // 1. Kiểm tra xem đã dán link chưa
  if (!SHEET_URL || SHEET_URL.includes("DÁN_LINK")) {
    console.error("❌ LỖI: Chưa dán link Google Sheet vào file lib/google-sheets.ts");
    return {};
  }

  try {
    // 2. Tải dữ liệu (no-store để luôn lấy mới nhất)
    const res = await fetch(SHEET_URL, { cache: 'no-store' });
    
    if (!res.ok) throw new Error(`Lỗi tải Sheet: ${res.status}`);
    
    const csvText = await res.text();
    
    // 3. Kiểm tra xem có bị nhầm link web (HTML) không
    if (csvText.trim().startsWith("<!DOCTYPE html>")) {
      console.error("❌ LỖI: Link sai! Bạn đang dùng link trang web, hãy dùng link CSV (File > Share > Publish to web).");
      return {};
    }

    // 4. Parse CSV
    const { data } = Papa.parse(csvText, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase() // Tự động chuyển tiêu đề về chữ thường (id, name, is_confirmed)
    });
    
    const guestsDB: Record<string, GuestInfo> = {};
    
    // 5. Chuyển đổi dữ liệu sang Object
    // @ts-ignore
    data.forEach((row: any) => {
      if (row.id && row.name) {
              const cleanId = row.id.toString().trim();
              
              // --- ĐOẠN LOGIC "BẤT TỬ" ---
              // 1. Lấy giá trị từ cột isconfirmed (do đã xóa gạch dưới ở trên)
              // 2. Hoặc lấy từ cột is_confirmed (phòng hờ)
              // 3. Chuyển về chữ thường và xóa khoảng trắng
              const rawStatus = String(row.isconfirmed || row.is_confirmed || row.xacnhan || "").toLowerCase().trim();
              
              // Chấp nhận: "true", "có", "yes", "1" là Đã xác nhận
              const isConfirmed = rawStatus === 'true' || rawStatus === 'có' || rawStatus === 'yes' || rawStatus === '1';

              // 👇 DEBUG: Nếu là bạn Phương (cas-2711), in ra xem máy đọc được gì
              if (cleanId === 'cas-2711') {
                console.log("-------------------------------------------------");
                console.log(`🔍 KIỂM TRA KHÁCH: ${row.name}`);
                console.log(`- Dữ liệu thô từ sheet: "${row.isconfirmed || row.is_confirmed}"`);
                console.log(`- Máy tính hiểu là: ${isConfirmed ? "ĐÃ XÁC NHẬN (True)" : "CHƯA (False)"}`);
                console.log("-------------------------------------------------");
              }

              guestsDB[cleanId] = { 
                id: cleanId,
                name: row.name.toString().trim(),
                isConfirmed: isConfirmed,
                attendance: row.attendance ? row.attendance.toString().trim() : undefined, // Lấy nếu có
                wish: row.wish ? row.wish.toString().trim() : undefined,                 // Lấy nếu có
              };
            }
          });

    console.log(`✅ Đã tải thông tin của ${Object.keys(guestsDB).length} khách.`);
    return guestsDB;

  } catch (error) {
    console.error("❌ Lỗi hệ thống khi đọc Sheet:", error);
    return {};
  }
}