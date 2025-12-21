import Papa from 'papaparse';

// Link Sheet của bạn
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRQ-umIuRyemVtMIEwgkXqzSTjIbxmSx5Tc8sMd4HDmjZNICE5yQqGPrkK9s3-PNNU_I_-AfRAMLpSC/pub?gid=0&single=true&output=csv";

export type GuestInfo = {
  id: string;
  name: string;
};

export async function getGuestsFromSheet(): Promise<Record<string, GuestInfo>> {
  try {
    const res = await fetch(SHEET_URL, { cache: 'no-store' });
    const csvText = await res.text();

    // --- THÊM ĐOẠN NÀY ĐỂ SOI LỖI ---
    console.log("▼▼▼ NỘI DUNG TẢI VỀ TỪ GOOGLE ▼▼▼");
    console.log(csvText.slice(0, 500)); // In thử 500 ký tự đầu xem là gì
    console.log("▲▲▲ HẾT ▲▲▲");
    // -------------------------------

    const { data } = Papa.parse(csvText, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase()
    });
    
    // ... (Phần dưới giữ nguyên)
    const guestsDB: Record<string, GuestInfo> = {};
    // @ts-ignore
    data.forEach((row: any) => {
      // Log từng dòng xem nó có nhận được id/name không
      // console.log("Đọc dòng:", row); 
      if (row.id && row.name) {
        guestsDB[row.id.toString().trim()] = { 
          id: row.id.toString().trim(),
          name: row.name.toString().trim() 
        };
      }
    });

    console.log(`✅ Tải thành công ${Object.keys(guestsDB).length} khách.`);
    return guestsDB;
  } catch (error) {
    console.error("Lỗi:", error);
    return {};
  }
}