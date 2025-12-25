import { ImageResponse } from 'next/og';
import { getGuestsFromSheet } from '@/lib/google-sheets';

// 1. Runtime nodejs để fetch được Google Sheet ổn định
export const runtime = 'nodejs'; 

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 2. Định nghĩa lại type cho params là Promise (Chuẩn Next.js 15)
type Props = {
  params: Promise<{ guestId: string }>;
};

export default async function Image({ params }: Props) {
  // 3. QUAN TRỌNG: Phải await params trước khi lấy guestId
  const { guestId } = await params;

  // Load dữ liệu
  const guests = await getGuestsFromSheet();
  
  // 4. Xử lý ID: Decode, trim và lowercase để khớp chính xác nhất
  const cleanId = decodeURIComponent(guestId || '').trim();
  
  // Tìm khách (Lưu ý: guests[cleanId] phải khớp chính xác ID trong sheet)
  const guest = guests[cleanId];

  // Debug log: Xem logs trên Vercel để biết chính xác code đang nhận được gì
  console.log(`[OG-DEBUG] ID từ URL: "${cleanId}" | Tìm thấy: ${guest ? guest.name : "KHÔNG THẤY"}`);

  // Fallback
  const guestName = guest ? guest.name : "Bạn tôi";
  const statusText = guest?.isConfirmed ? "Đã xác nhận tham gia" : "Trân trọng kính mời";

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'linear-gradient(to bottom right, #1a1a1a, #000000)',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 40, left: 40, right: 40, bottom: 40,
          border: '2px solid #d4af37',
          opacity: 0.3,
          borderRadius: 20,
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            color: '#d4af37', 
            fontSize: 30, 
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            Lễ Tốt Nghiệp 2026
          </div>

          <div style={{ 
            color: 'white', 
            fontSize: 80, 
            fontWeight: 900, 
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: '900px',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            margin: '20px 0'
          }}>
            {guestName}
          </div>

          <div style={{ 
            backgroundColor: '#d4af37',
            color: 'black',
            padding: '10px 30px',
            borderRadius: 50,
            fontSize: 24,
            fontWeight: 'bold',
          }}>
            {statusText}
          </div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: 60,
          color: '#666',
          fontSize: 20,
        }}>
          invitation-app-brown.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}