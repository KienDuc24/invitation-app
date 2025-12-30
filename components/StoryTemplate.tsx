import { forwardRef } from 'react';

interface StoryTemplateProps {
  content: string;
  author: string;
  avatarUrl?: string;
  date: string;
}

const StoryTemplate = forwardRef<HTMLDivElement, StoryTemplateProps>(
  ({ content, author, avatarUrl, date }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[1080px] h-[1920px] bg-black relative overflow-hidden flex flex-col justify-between p-12"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          fontFamily: "'Merriweather', serif",
        }}
      >
        {/* Top Border */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#d4af37] via-[#f4d03f] to-[#d4af37]"></div>

        {/* Bottom Border */}
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-[#d4af37] via-[#f4d03f] to-[#d4af37]"></div>

        {/* Main Content */}
        <div className="flex flex-col justify-center items-center flex-1 text-center z-10">
          {/* Quote Mark */}
          <div className="text-[#d4af37] text-9xl font-bold mb-8 leading-none opacity-30">"</div>

          {/* Content Text */}
          <p
            className="text-white text-5xl font-bold leading-tight mb-16 max-w-4xl"
            style={{
              lineHeight: '1.3',
              wordWrap: 'break-word',
              textShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
            }}
          >
            {content}
          </p>

          {/* Divider */}
          <div className="w-48 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mb-16"></div>

          {/* Author Info */}
          <div className="flex flex-col items-center gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full border-4 border-[#d4af37] overflow-hidden shadow-2xl">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={author}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#d4af37] to-[#a48725] flex items-center justify-center">
                  <span className="text-black text-5xl font-bold">
                    {author.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="text-[#d4af37] text-4xl font-bold tracking-wide">{author}</h3>

            {/* Date */}
            <p className="text-gray-400 text-2xl font-light tracking-widest">{date}</p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-12 left-12 w-16 h-16 border-2 border-[#d4af37] opacity-40"></div>
        <div className="absolute bottom-12 right-12 w-16 h-16 border-2 border-[#d4af37] opacity-40"></div>

        {/* Watermark */}
        <div className="absolute bottom-20 left-0 right-0 text-center opacity-20">
          <p className="text-gray-500 text-xl tracking-widest">✨ Kỷ Niệm Đặc Biệt ✨</p>
        </div>
      </div>
    );
  }
);

StoryTemplate.displayName = 'StoryTemplate';

export default StoryTemplate;
