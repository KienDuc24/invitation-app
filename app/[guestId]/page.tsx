import MobileInvitation from "@/components/3d/InvitationCard";
import GuestDashboard from "@/components/GuestDashboard"; 
import { getGuestById } from "@/lib/supabase"; 
import { Metadata } from "next";
import { notFound } from "next/navigation";

// 👇 QUAN TRỌNG: 2 dòng này để tắt Cache tuyệt đối
export const revalidate = 0; 
export const dynamic = 'force-dynamic';

interface GuestPageProps {
  params: Promise<{ guestId: string }>;
}

export async function generateMetadata({ params }: GuestPageProps): Promise<Metadata> {
  const { guestId } = await params;
  const guest = await getGuestById(guestId);
  if (!guest) return { title: "Thiệp mời Lễ Tốt Nghiệp 2025" };
  return { title: `Gửi ${guest.name} | Thiệp Mời` };
}

export default async function GuestPage({ params }: GuestPageProps) {
  const { guestId } = await params;
  
  // Lấy dữ liệu mới nhất từ Server
  const guest = await getGuestById(guestId);

  if (!guest) return notFound();

  // 👇 LOGIC KIỂM TRA:
  // Nếu database báo "is_confirmed" là true -> Vào Dashboard ngay
  // Lưu ý: Hàm getGuestById phải trả về đúng field isConfirmed hoặc is_confirmed
  const isConfirmed = guest.isConfirmed || guest.is_confirmed; 

  if (isConfirmed) {
    return <GuestDashboard guest={guest} />;
  }

  // Nếu chưa -> Hiện bìa thiệp để khách bấm nút Tham dự
  return (
    <MobileInvitation 
      guestName={guest.name} 
      guestId={guest.id}
      isConfirmed={isConfirmed}
      initialAttendance={guest.attendance}
      initialWish={guest.wish}
    />
  );
}