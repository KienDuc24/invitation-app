import { createClient } from '@supabase/supabase-js';
import { ImageResponse } from 'next/og';

// Buat Supabase client cho Edge Runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Runtime edge để fetch được dữ liệu và generate image
export const runtime = 'edge'; 

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 2. Định nghĩa lại type cho params là Promise (Chuẩn Next.js 15)
type Props = {
  params: Promise<{ guestId: string }>;
};

export default async function Image({ params }: Props) {
  // 3. QUAN TRỌNG: Phải await params trước khi lấy guestId
  const { guestId } = await params;

  // 4. Xử lý ID trước: Decode, trim để tránh lỗi
  const cleanId = decodeURIComponent(guestId || '').trim();

  // 5. Gọi Supabase lấy thông tin ĐÚNG 1 KHÁCH
  const { data: guest } = await supabase
    .from('guests')
    .select('name, is_confirmed')
    .eq('id', cleanId)
    .single();

  // Fallback nếu không tìm thấy khách
  const guestName = guest?.name || "Bạn tôi";
  const statusText = guest?.is_confirmed ? "Đã xác nhận tham gia" : "Trân trọng kính mời";

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