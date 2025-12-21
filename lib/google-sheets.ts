import Papa from 'papaparse';

// Dán cái link CSV bạn vừa copy ở Bước 1 vào đây
const SHEET_URL = process.env.NEXT_PUBLIC_SHEET_URL || '';
export type GuestInfo = {
  id: string;
  name: string;
};

// Hàm lấy toàn bộ danh sách khách từ Google Sheet
export async function getGuestsFromSheet(): Promise<Record<string, GuestInfo>> {
  try {
    // 1. Tải dữ liệu từ Google
    const res = await fetch(SHEET_URL, { 
      next: { revalidate: 60 } // Tự động cập nhật sau mỗi 60 giây (Next.js Cache)
    });
    const csvText = await res.text();

    // 2. Chuyển CSV thành JSON
    const { data } = Papa.parse(csvText, { header: true });
    
    // 3. Chuyển đổi sang format Key-Value để dễ tra cứu
    const guestsDB: Record<string, GuestInfo> = {};
    
    // @ts-ignore
    data.forEach((row: any) => {
      if (row.id && row.name) {
        guestsDB[row.id.trim()] = { 
          id: row.id.trim(),
          name: row.name.trim() 
        };
      }
    });

    return guestsDB;
  } catch (error) {
    console.error("Lỗi tải Google Sheet:", error);
    return {};
  }
}