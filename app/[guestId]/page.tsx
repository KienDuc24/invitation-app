import MobileInvitation from "@/components/3d/InvitationCard";
import GuestDashboard from "@/components/GuestDashboard";
import { getGuestById } from "@/lib/supabase";
import { Metadata } from "next";
import { notFound } from "next/navigation";

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
  // Chỉ cho phép vào dashboard nếu đã vote AND chọn "Có tham dự"
  const canAccessDashboard = isConfirmed && guest.attendance === "Có tham dự";

  return (
    <>
      {/* 1. Giao diện chính */}
      {canAccessDashboard ? (
        <GuestDashboard guest={guest} />
      ) : (
        <MobileInvitation 
          guestName={guest.name} 
          guestId={guest.id}
          isConfirmed={false}
          initialAttendance={guest.attendance}
          initialWish={guest.wish}
        />
      )}
    </>
  );
}