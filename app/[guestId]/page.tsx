import MobileInvitation from "@/components/3d/InvitationCard"; 
import { getGuestsFromSheet } from "@/lib/google-sheets";
import { Metadata } from "next";
import { notFound } from "next/navigation";

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
  
  // Gọi Google Sheet lấy dữ liệu
  const db = await getGuestsFromSheet();
  const guest = db[guestId];

  if (!guest) {
    return notFound(); 
  }

  return (
    <main className="w-full h-screen bg-black">
      <MobileInvitation guestName={guest.name} />
    </main>
  );
}