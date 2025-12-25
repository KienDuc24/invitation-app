import MobileInvitation from "@/components/3d/InvitationCard";
import { getGuestById } from "@/lib/supabase"; 
import { Metadata } from "next";
import { notFound } from "next/navigation";

// 1. Cấu hình để Next.js không cache dữ liệu (Luôn lấy mới nhất từ Supabase)
export const revalidate = 0; 
export const dynamic = 'force-dynamic';

interface GuestPageProps {
  params: Promise<{ guestId: string }>;
}

// 2. Hàm tạo SEO Title (Hiện tên khách trên tab trình duyệt/Google)
export async function generateMetadata({ params }: GuestPageProps): Promise<Metadata> {
  const { guestId } = await params;
  const guest = await getGuestById(guestId);

  if (!guest) return { title: "Thiệp mời Lễ Tốt Nghiệp 2025" };

  return {
    title: `Gửi ${guest.name} | Thiệp Mời`,
    openGraph: {
      title: `Gửi ${guest.name} | Thiệp Mời`,
      description: "Trân trọng kính mời bạn đến tham dự lễ tốt nghiệp của mình.",
    }
  };
}

// 3. Component chính
export default async function GuestPage({ params }: GuestPageProps) {
  const { guestId } = await params;
  
  // Gọi hàm lấy dữ liệu từ Supabase
  const guest = await getGuestById(guestId);

  // Nếu không thấy khách trong DB -> Trả về trang 404
  if (!guest) return notFound();

  return (
    <MobileInvitation 
      guestName={guest.name} 
      guestId={guest.id}
      isConfirmed={guest.isConfirmed} // Lưu ý: Đảm bảo hàm getGuestById trong lib/supabase.ts đã map 'is_confirmed' thành 'isConfirmed'
      initialAttendance={guest.attendance}
      initialWish={guest.wish}
    />
  );
}