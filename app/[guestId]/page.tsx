import MobileInvitation from "@/components/3d/InvitationCard";
import GuestDashboard from "@/components/GuestDashboard"; 
import { getGuestById } from "@/lib/supabase"; 
import { Metadata } from "next";
import { notFound } from "next/navigation";
import CatmiChat from "@/components/CatmiChat"; 

// Tắt Cache để luôn lấy dữ liệu mới nhất
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
  
  const guest = await getGuestById(guestId);

  if (!guest) return notFound();

  const isConfirmed = guest.isConfirmed || guest.is_confirmed; 

  return (
    <>
      {/* 1. Giao diện chính */}
      {isConfirmed ? (
        <GuestDashboard guest={guest} />
      ) : (
        <MobileInvitation 
          guestName={guest.name} 
          guestId={guest.id}
          isConfirmed={isConfirmed}
          initialAttendance={guest.attendance}
          initialWish={guest.wish}
        />
      )}

      {/* 2. Catmi Chat - Truyền thêm guestInfor */}
      <CatmiChat 
          guestName={guest.name} 
          guestStatus={isConfirmed}
          guestTags={guest.tags} // Mảng tags: ['Bạn cấp 3', 'Thân thiết']
          guestInfor={guest.infor || guest.info} // 👇 TRUYỀN THÔNG TIN MỚI (Hỗ trợ cả 'infor' và 'info')
      />
    </>
  );
}