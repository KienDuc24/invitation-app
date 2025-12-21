import { ImageResponse } from 'next/og';
import { GUESTS_DB } from '@/app/data/guests';

// Cấu hình ảnh chuẩn
export const runtime = 'edge';
export const alt = 'Thiệp mời Lễ Tốt Nghiệp';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ guestId: string }> }) {
  // 1. Dùng await để lấy guestId (Fix lỗi Next.js 15)
  const { guestId } = await params;
  
  // Tra cứu tên khách
  const guest = GUESTS_DB[guestId];
  const name = guest ? guest.name : 'Khách Quý';

  // 2. Load font chữ (Dùng link trực tiếp cho ổn định)
  const fontData = await fetch(new URL('https://github.com/google/fonts/raw/main/ofl/inter/Inter-Bold.ttf', import.meta.url)).then((res) => res.arrayBuffer());

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
          backgroundColor: '#050505',
          border: '20px solid #d4af37',
          position: 'relative',
        }}
      >
        {/* Nền Gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, #222 0%, #050505 100%)',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
          <p style={{ color: '#d4af37', fontSize: 24, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20 }}>
            Trân trọng kính mời
          </p>
          
          {/* Tên Khách */}
          <h1
            style={{
              fontSize: 80,
              // ĐÃ SỬA: Xóa dòng color: '#fff' thừa gây lỗi
              background: 'linear-gradient(to bottom, #fadd7d, #aa8e26)',
              backgroundClip: 'text',
              // @ts-ignore: Bỏ qua lỗi check type của React cũ nếu có
              WebkitBackgroundClip: 'text',
              color: 'transparent', // Giữ lại dòng này để hiện màu gradient
              margin: 0,
              padding: '0 40px',
              textAlign: 'center',
              lineHeight: 1.2,
              textShadow: '0 4px 10px rgba(0,0,0,0.5)',
            }}
          >
            {name}
          </h1>

          <div style={{ width: 100, height: 2, background: '#d4af37', margin: '30px 0' }} />

          <p style={{ color: '#aaa', fontSize: 30, margin: 0 }}>
            Tới tham dự Lễ Tốt Nghiệp 2025
          </p>
          <p style={{ color: '#666', fontSize: 24, marginTop: 10 }}>
            Của Bùi Đức Kiên
          </p>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  );
}