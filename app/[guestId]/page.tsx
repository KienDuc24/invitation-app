import MobileInvitation from "@/components/3d/InvitationCard";
import GuestDashboard from "@/components/GuestDashboard"; 
import { getGuestById } from "@/lib/supabase"; 
import { Metadata } from "next";
import { notFound } from "next/navigation";
import CatmiChat from "@/components/CatmiChat"; // 👈 [QUAN TRỌNG] Import bé Miu vào

// 👇 2 dòng này để tắt Cache tuyệt đối, đảm bảo dữ liệu luôn mới
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
  
  // 1. Lấy dữ liệu khách từ Database
  const guest = await getGuestById(guestId);

  if (!guest) return notFound();

  // 2. Logic kiểm tra trạng thái Confirm
  // (Hỗ trợ cả 2 trường hợp tên biến snake_case hoặc camelCase)
  const isConfirmed = guest.isConfirmed || guest.is_confirmed; 

  // 3. Render giao diện
  return (
    <>
      {/* --- PHẦN 1: GIAO DIỆN CHÍNH (Thiệp hoặc Dashboard) --- */}
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

      {/* --- PHẦN 2: CATMI (Đã được "tiêm" não) --- 
          Tại đây mình truyền 2 prop quan trọng:
          - guestName: Để Catmi biết tên mà gọi.
          - guestStatus: Để Catmi biết nên giục điền form hay là khen ngợi.
      */}
      <CatmiChat 
          guestName={guest.name}      // 👈 Truyền tên khách thật vào đây
          guestStatus={isConfirmed}   // 👈 Truyền trạng thái thật vào đây
      />
    </>
  );
}