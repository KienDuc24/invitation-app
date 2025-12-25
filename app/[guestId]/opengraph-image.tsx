import { ImageResponse } from 'next/og';
import { getGuestsFromSheet } from '@/lib/google-sheets';

// 1. QUAN TRỌNG: Đổi runtime sang 'nodejs' để gọi được Google Sheets API
export const runtime = 'nodejs'; 

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { guestId: string } }) {
  // Lấy guestId từ URL
  const { guestId } = params;

  // 2. Load dữ liệu từ Google Sheet
  const guests = await getGuestsFromSheet();
  
  // 3. Xử lý ID: Decode để tránh lỗi ký tự lạ và trim khoảng trắng
  const cleanId = decodeURIComponent(guestId || '').trim();
  const guest = guests[cleanId];

  // Debug log (sẽ hiện trong terminal server khi request ảnh)
  console.log(`OG Image generation for ID: ${cleanId}, Found: ${guest?.name}`);

  // 4. Fallback
  const guestName = guest ? guest.name : "Bạn Mình";
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
        {/* Viền trang trí */}
        <div style={{
          position: 'absolute',
          top: 40, left: 40, right: 40, bottom: 40,
          border: '2px solid #d4af37',
          opacity: 0.3,
          borderRadius: 20,
        }} />

        {/* Nội dung chính */}
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

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: 60,
          color: '#666',
          fontSize: 20,
        }}>
          {/* Sửa dòng dưới này thành domain của bạn */}
          invitation-app-brown.vercel.app
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}