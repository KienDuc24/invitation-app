// app/data/guests.ts

export type GuestInfor = {
  name: string; // Tên hiển thị trên thiệp
  // Bạn có thể thêm các trường khác nếu muốn (ví dụ: lời chúc riêng)
};

// Đây là nơi bạn dán danh sách khách mời vào
export const GUESTS_DB: Record<string, GuestInfor> = {
  // Ví dụ mẫu (Sau này bạn sẽ paste danh sách thật vào đây)
  "nguyen-van-a-839": { name: "Nguyễn Văn A" },
  "tran-thi-b-102":   { name: "Trần Thị B" },
  "le-van-c-999":     { name: "Lê Văn C" },
};