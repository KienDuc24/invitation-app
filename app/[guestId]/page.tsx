// app/[guestId]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { GUESTS_DB } from "@/app/data/guests";
// LƯU Ý: Kiểm tra đường dẫn này. Dựa theo ảnh của bạn thì file nằm trong components/3d
import InvitationCard from "@/components/3d/InvitationCard"; 

// Định nghĩa kiểu Props mới (params là Promise)
type Props = {
  params: Promise<{ guestId: string }>;
};

// 1. Xử lý SEO (Metadata)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // QUAN TRỌNG: Phải có await
  const { guestId } = await params;
  const guest = GUESTS_DB[guestId];

  if (!guest) {
    return {
      title: "Thiệp mời Lễ Tốt Nghiệp 2025",
      description: "Trân trọng kính mời bạn tới tham dự.",
    };
  }

  return {
    title: `Gửi ${guest.name} | Thiệp Mời Tốt Nghiệp`,
    description: `Trân trọng kính mời ${guest.name} tới tham dự lễ tốt nghiệp của Bùi Đức Kiên.`,
  };
}

// 2. Giao diện chính (Page)
// Component phải có từ khóa 'async'
export default async function GuestPage({ params }: Props) {
  // QUAN TRỌNG: Phải có await để lấy guestId
  const { guestId } = await params;
  
  // Tra cứu trong sổ dữ liệu
  const guest = GUESTS_DB[guestId];

  // Nếu không tìm thấy tên trong sổ -> Trả về trang 404
  if (!guest) {
    return notFound(); 
  }

  // Nếu tìm thấy -> Hiển thị thiệp
  return (
    <main className="w-full h-screen bg-black">
      <InvitationCard guestName={guest.name} />
    </main>
  );
}