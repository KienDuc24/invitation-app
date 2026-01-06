"use client";
import { Music, Pause, Play } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';

interface FilmStoryTemplateProps {
  content: string;
  author: string;
  avatarUrl?: string;
  date: string;
  postImage?: string;
  commentsList?: { author: string; text: string; avatar?: string }[];
  likesCount?: number;
}

const FilmStoryTemplate = forwardRef<HTMLDivElement, FilmStoryTemplateProps>(
  ({
    content,
    author,
    avatarUrl,
    date,
    postImage,
    commentsList = [],
    likesCount = 0,
  }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number }[]>([]);
  const heartIdRef = useRef(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Floating hearts effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const newHeart = {
        id: heartIdRef.current++,
        left: Math.random() * 80 + 10,
      };
      setFloatingHearts((prev) => [...prev, newHeart]);

      // Remove heart after animation
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 3000);
    }, 800);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Film Frame Container - 9:16 Ratio */}
      <div
        ref={ref}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          aspectRatio: '9/16',
          backgroundColor: '#1a1a1a',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          borderLeft: '16px solid #0a0a0a',
          borderRight: '16px solid #0a0a0a',
        }}
      >
        {/* Film Holes - Left Side */}
        <div
          style={{
            position: 'absolute',
            left: '2px',
            top: 0,
            bottom: 0,
            width: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingTop: '8px',
            paddingBottom: '8px',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={`left-${i}`}
              style={{
                width: '8px',
                height: '10px',
                backgroundColor: '#333',
                borderRadius: '2px',
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        {/* Film Holes - Right Side */}
        <div
          style={{
            position: 'absolute',
            right: '2px',
            top: 0,
            bottom: 0,
            width: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingTop: '8px',
            paddingBottom: '8px',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={`right-${i}`}
              style={{
                width: '8px',
                height: '10px',
                backgroundColor: '#333',
                borderRadius: '2px',
                opacity: 0.8,
              }}
            />
          ))}
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
          loop
        />

        {/* Scrolling Content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            paddingLeft: '40px',
            paddingRight: '40px',
            paddingTop: '60px',
            paddingBottom: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            animation: isPlaying ? 'filmScroll 20s linear 0.5s forwards' : 'none',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '4px solid #d4af37',
              overflow: 'hidden',
              marginBottom: '24px',
              boxShadow: '0 0 40px rgba(212, 175, 55, 0.5)',
              background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={author}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #d4af37, #a48725)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 'bold',
                }}
              >
                {author.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Author Name */}
          <h2
            style={{
              color: '#d4af37',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
            }}
          >
            {author}
          </h2>

          {/* Post Image */}
          {postImage && (
            <div
              style={{
                width: '100%',
                maxWidth: '280px',
                aspectRatio: '1',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '24px',
                border: '2px solid #d4af37',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
              }}
            >
              <img
                src={postImage}
                alt="Post"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}

          {/* Content Box */}
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '2px solid #d4af37',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <p
              style={{
                color: 'white',
                fontSize: '20px',
                lineHeight: '1.6',
                margin: '0',
                fontStyle: 'italic',
              }}
            >
              "{content}"
            </p>
          </div>

          {/* Comments */}
          <div style={{ width: '100%', marginBottom: '32px' }}>
            <p
              style={{
                color: '#d4af37',
                fontSize: '12px',
                fontWeight: 'bold',
                margin: '0 0 12px 0',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              💬 Lời chúc từ bạn bè
            </p>
            {commentsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {commentsList.slice(0, 2).map((comment, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(30, 30, 30, 0.9)',
                      border: '1px solid #d4af37',
                      borderRadius: '12px',
                      padding: '12px',
                      textAlign: 'left',
                      animation: `fadeInUp 0.6s ease-out ${0.5 + idx * 0.3}s both`,
                    }}
                  >
                    <p
                      style={{
                        color: '#d4af37',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        margin: '0 0 4px 0',
                      }}
                    >
                      {comment.author}
                    </p>
                    <p
                      style={{
                        color: '#e0e0e0',
                        fontSize: '12px',
                        margin: '0',
                        lineHeight: '1.4',
                      }}
                    >
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  color: '#a0a0a0',
                  fontSize: '12px',
                  fontStyle: 'italic',
                  margin: '0',
                }}
              >
                Hãy là người đầu tiên gửi lời chúc! ✨
              </p>
            )}
          </div>

          {/* Stats */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <p
              style={{
                color: '#d4af37',
                fontSize: '24px',
                fontWeight: 'bold',
                margin: '0 0 4px 0',
              }}
            >
              ❤️ {likesCount?.toLocaleString() || '0'}
            </p>
            <p
              style={{
                color: '#a0a0a0',
                fontSize: '12px',
                margin: '0',
              }}
            >
              người yêu thích
            </p>
          </div>

          {/* Footer Credits */}
          <div style={{ borderTop: '2px solid #d4af37', paddingTop: '24px' }}>
            <p
              style={{
                color: '#a0a0a0',
                fontSize: '10px',
                margin: '0 0 8px 0',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Lễ Tốt Nghiệp
            </p>
            <h1
              style={{
                color: 'white',
                fontSize: '48px',
                fontWeight: 'black',
                margin: '0',
              }}
            >
              2026
            </h1>
            <p
              style={{
                color: '#d4af37',
                fontSize: '12px',
                margin: '8px 0 0 0',
                fontWeight: 'bold',
              }}
            >
              Đức Kiên
            </p>
          </div>
        </div>

        {/* Floating Hearts */}
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            style={{
              position: 'absolute',
              left: `${heart.left}%`,
              bottom: '10%',
              fontSize: '32px',
              animation: `floatHeart 3s ease-out forwards`,
              pointerEvents: 'none',
            }}
          >
            ❤️
          </div>
        ))}

        {/* Film Grain Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" /%3E%3C/filter%3E%3Crect width="400" height="400" filter="url(%23noise)" /%3E%3C/svg%3E")',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        ></div>

        {/* Control Button */}
        <button
          onClick={togglePlay}
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#d4af37',
            color: 'black',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(212, 175, 55, 0.4)',
            zIndex: 50,
            transition: 'all 0.2s ease',
            fontSize: '24px',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(-50%) scale(1.1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(212, 175, 55, 0.6)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(-50%) scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.4)';
          }}
        >
          {isPlaying ? <Pause fill="black" size={28} /> : <Play fill="black" size={28} className="ml-1" />}
        </button>

        {/* Initial Guide Overlay */}
        {!isPlaying && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 40,
              padding: '24px',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Music
              size={56}
              style={{
                color: '#d4af37',
                marginBottom: '16px',
                animation: 'bounce 1s infinite',
              }}
            />
            <h3
              style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                margin: '0 0 12px 0',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              🎬 Thước Phim Kỷ Niệm
            </h3>
            <p
              style={{
                color: '#d0d0d0',
                fontSize: '13px',
                margin: '0 0 20px 0',
                lineHeight: '1.6',
              }}
            >
              Bật quay màn hình của điện thoại, sau đó nhấn Play để ghi lại khoảnh khắc này kèm nhạc nền nhé!
            </p>
            <p
              style={{
                color: '#a0a0a0',
                fontSize: '11px',
                margin: '0',
                fontStyle: 'italic',
              }}
            >
              (Bấm nút vàng bên dưới để bắt đầu)
            </p>
          </div>
        )}
      </div>

      {/* Global Animations */}
      <style>{`
        @keyframes filmScroll {
          0% {
            opacity: 0;
            transform: translateY(100%);
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-120%);
          }
        }

        @keyframes floatHeart {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-150px) scale(1.3);
            opacity: 0;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
      `}</style>
    </div>
  );
  }
);

FilmStoryTemplate.displayName = 'FilmStoryTemplate';
export default FilmStoryTemplate;
