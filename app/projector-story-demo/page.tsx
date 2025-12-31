"use client";
import ProjectorStory from '@/components/ProjectorStory';
import { Play } from 'lucide-react';
import { useState } from 'react';

export default function ProjectorStoryDemoPage() {
  const [showProjector, setShowProjector] = useState(false);

  // Mock data - Demo frames với ảnh và comments
  const demoFrames = [
    {
      id: '1',
      image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
      comments: [
        { user: 'Minh Anh', text: 'Xịn quá bạn ơi! 🔥' },
        { user: 'Tuấn Tú', text: 'Chúc mừng tốt nghiệp!' }
      ]
    },
    {
      id: '2',
      image_url: 'https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?w=800&q=80',
      comments: [
        { user: 'Lan Ngọc', text: 'Hôm nay đẹp trai thế =))' },
        { user: 'Hoàng', text: 'Nhớ khao nhé sếp' }
      ]
    },
    {
      id: '3',
      image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80',
      comments: [
        { user: 'Thu Trang', text: 'Tiệc vui quá!' },
        { user: 'Sơn', text: 'Bạn ơi, gặp lại nha!' }
      ]
    },
    {
      id: '4',
      image_url: 'https://images.unsplash.com/photo-1513315231840-2e0a9ae2a368?w=800&q=80',
      comments: [
        { user: 'Phương', text: 'Kỷ niệm đẹp lắm ❤️' },
        { user: 'Minh', text: 'Cố gắng lên bạn!' }
      ]
    }
  ];

  if (showProjector) {
    return (
      <ProjectorStory
        frames={demoFrames}
        eventName="Buổi Tiệc Kỷ Niệm"
        onClose={() => setShowProjector(false)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-[#1a1a1a] to-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-8 py-20">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#d4af37] to-[#b89628] bg-clip-text text-transparent">
              Máy Chiếu Kỷ Niệm
            </h1>
            <p className="text-gray-400 text-lg">
              Tạo video story Instagram/TikTok từ những kỷ niệm
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
            <div className="p-6 bg-[#222] border border-[#333] rounded-xl hover:border-[#d4af37]/50 transition-colors">
              <div className="text-3xl mb-3">🎬</div>
              <h3 className="font-bold text-lg mb-2">Cinematic Intro</h3>
              <p className="text-sm text-gray-400">Hiệu ứng máy chiếu mở lên ấn tượng</p>
            </div>

            <div className="p-6 bg-[#222] border border-[#333] rounded-xl hover:border-[#d4af37]/50 transition-colors">
              <div className="text-3xl mb-3">🎞️</div>
              <h3 className="font-bold text-lg mb-2">Film Strip</h3>
              <p className="text-sm text-gray-400">Phim chạy dọc cổ điển với lỗ 2 bên</p>
            </div>

            <div className="p-6 bg-[#222] border border-[#333] rounded-xl hover:border-[#d4af37]/50 transition-colors">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-bold text-lg mb-2">Live Comments</h3>
              <p className="text-sm text-gray-400">Bình luận xuất hiện linh hoạt</p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-6 pt-8">
            <button
              onClick={() => setShowProjector(true)}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold rounded-xl hover:shadow-2xl hover:shadow-[#d4af37]/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play size={20} />
              <span>Xem Demo Ngay</span>
              <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>

            <p className="text-gray-500 text-sm">
              💡 Tip: Dùng chức năng quay màn hình điện thoại để tạo video Story
            </p>
          </div>

          {/* Code Integration */}
          <div className="mt-16 p-6 bg-[#111] border border-[#333] rounded-xl text-left">
            <h3 className="font-bold text-lg mb-4 text-[#d4af37]">📝 Cách Sử Dụng</h3>
            <pre className="text-xs text-gray-300 overflow-x-auto">
{`import ProjectorStory from '@/components/ProjectorStory';

// Dữ liệu frames (ảnh + comments)
const frames = [
  {
    id: '1',
    image_url: 'https://...',
    comments: [
      { user: 'Tên', text: 'Bình luận' }
    ]
  }
];

// Render component
<ProjectorStory
  frames={frames}
  eventName="Tên Sự Kiện"
  onClose={() => {}}
  autoPlay={true}
/>`}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
