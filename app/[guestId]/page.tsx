import MobileInvitation from "@/components/3d/InvitationCard"; 
import { getGuestsFromSheet } from "@/lib/google-sheets";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 0; // 👈 Thêm dòng này: Bắt buộc Web tải mới mỗi giây
export const dynamic = 'force-dynamic'; // 👈 Thêm dòng này cho chắc chắn

type Props = {
  params: Promise<{ guestId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guestId } = await params;
  
  // Gọi Google Sheet lấy dữ liệu
  const db = await getGuestsFromSheet();
  const guest = db[guestId];

  if (!guest) return { title: "Thiệp mời Lễ Tốt Nghiệp 2025" };

  return {
    title: `Gửi ${guest.name} | Thiệp Mời`,
  };
}

export default async function GuestPage({ params }: Props) {
  const { guestId } = await params;
  const guests = await getGuestsFromSheet();
  const guest = guests[guestId];
  console.log("Khách:", guest.name, "| Trạng thái:", guest.isConfirmed);

  if (!guest) {
    return notFound(); 
  }

 return (
<MobileInvitation 
      guestName={guest.name} 
      guestId={guest.id}           // ✅ Sửa guestID -> guestId
      isConfirmed={guest.isConfirmed}
      initialAttendance={guest.attendance} // 👈 Truyền dữ liệu cũ (nếu có)
      initialWish={guest.wish} // 👈 Truyền dữ liệu cũ (nếu có)
    />
  );
}