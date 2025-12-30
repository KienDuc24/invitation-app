import { forwardRef } from 'react';

interface StoryTemplateProps {
  content: string;
  author: string;
  avatarUrl?: string;
  date: string;
  adminReply?: string;
  guestNumber?: number;
  postImage?: string;
  likesCount?: number;
  commentsCount?: number;
  commentsList?: { author: string; text: string; avatar?: string }[];
}

// Easter Eggs
const RANDOM_TITLES = [
  '🎓 Đội trưởng bữa tiệc',
  '🎉 Cây hài của sự kiện',
  '💎 Nhà tài trợ vàng',
  '🌟 Thanh niên nghiêm túc',
  '🚀 Tương lai sáng láng',
  '👑 Vị khách VIP',
  '💫 Ngôi sao của ngày',
];

const RANDOM_WEATHER = [
  '☀️ Trời nắng hạnh phúc',
  '🌧️ Mưa lời chúc',
  '⛈️ Bão cảm xúc',
  '🌈 Cầu vồng sự may mắn',
  '❄️ Tuyết yêu thương',
];

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const getLuckyNumber = () => Math.floor(Math.random() * 100) + 1;

// Concept A: Social Media Post Style (Instagram-like with Graduation Theme)
const ConceptA = forwardRef<HTMLDivElement, StoryTemplateProps>(
  ({ content, author, avatarUrl, date, postImage, likesCount = 0, commentsCount = 0, commentsList = [] }, ref) => {
    const randomTitle = getRandomItem(RANDOM_TITLES);
    
    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          fontFamily: "'Inter', sans-serif",
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          boxSizing: 'border-box',
        }}
      >
        {/* Floating Decorative Elements */}
        <div style={{ position: 'absolute', top: '80px', left: '60px', fontSize: '100px', opacity: 0.1 }}>🎓</div>
        <div style={{ position: 'absolute', bottom: '250px', right: '80px', fontSize: '90px', opacity: 0.08 }}>✨</div>

        {/* Golden Frame Border */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '16px',
            background: 'linear-gradient(to right, #d4af37, #f4d03f, #d4af37)',
            zIndex: 20,
          }}
        ></div>

        {/* Post Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginTop: '16px',
          }}
        >
          {/* Header - User Info */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid #333',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid #d4af37',
                overflow: 'hidden',
                background: '#333',
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
                    fontSize: '24px',
                    fontWeight: 'bold',
                  }}
                >
                  {author.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  margin: '0 0 2px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {author}
                <span style={{ fontSize: '14px', color: '#d4af37' }}>✓</span>
              </p>
              <p
                style={{
                  color: '#a0a0a0',
                  fontSize: '12px',
                  margin: '0',
                }}
              >
                {date} • 🎓 Lễ Tốt Nghiệp
              </p>
            </div>
          </div>

          {/* Post Image */}
          {postImage && (
            <div
              style={{
                width: '100%',
                maxHeight: '500px',
                overflow: 'hidden',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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

          {/* Post Caption */}
          <div style={{ padding: '20px 24px' }}>
            <p
              style={{
                color: 'white',
                fontSize: '18px',
                lineHeight: '1.5',
                margin: '0',
                fontWeight: '500',
              }}
            >
              {content}
            </p>
          </div>

          {/* Engagement Stats */}
          <div
            style={{
              padding: '12px 24px',
              borderTop: '1px solid #333',
              borderBottom: '1px solid #333',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '14px',
                color: '#a0a0a0',
              }}
            >
              <span style={{ color: '#d4af37', fontWeight: 'bold' }}>
                ❤️ {likesCount?.toLocaleString() || '0'} lượt thích
              </span>
              <span style={{ color: '#d4af37', fontWeight: 'bold' }}>
                💬 {commentsCount?.toLocaleString() || '0'} bình luận
              </span>
              <span style={{ color: '#d4af37', fontWeight: 'bold' }}>
                📤 Chia sẻ
              </span>
            </div>
          </div>

          {/* Comments Section */}
          <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: '300px' }}>
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
              💬 Bình luận nổi bật
            </p>
            {commentsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {commentsList.slice(0, 3).map((comment, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: '1px solid #d4af37',
                        overflow: 'hidden',
                        background: '#333',
                        flexShrink: 0,
                      }}
                    >
                      {comment.avatar ? (
                        <img
                          src={comment.avatar}
                          alt={comment.author}
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
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '600',
                          margin: '0 0 2px 0',
                        }}
                      >
                        {comment.author}
                      </p>
                      <p
                        style={{
                          color: '#d0d0d0',
                          fontSize: '12px',
                          margin: '0',
                          lineHeight: '1.4',
                          wordBreak: 'break-word',
                        }}
                      >
                        {comment.text}
                      </p>
                    </div>
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
                Hãy là người đầu tiên bình luận! ✨
              </p>
            )}
          </div>
        </div>

        {/* Footer - Event Info */}
        <div
          style={{
            backgroundColor: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid #d4af37',
            padding: '16px 24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              color: '#d4af37',
              fontSize: '14px',
              fontWeight: 'bold',
              margin: '0 0 4px 0',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {randomTitle}
          </p>
          <p
            style={{
              color: '#a0a0a0',
              fontSize: '12px',
              margin: '0',
            }}
          >
            Lễ Tốt Nghiệp Đức Kiên 2025
          </p>
        </div>

        {/* Golden Frame Border Bottom */}
        <div
          style={{
            height: '16px',
            background: 'linear-gradient(to right, #d4af37, #f4d03f, #d4af37)',
            zIndex: 20,
          }}
        ></div>
      </div>
    );
  }
);

// Concept B: Premium Graduation Diploma Style
const ConceptB = forwardRef<HTMLDivElement, StoryTemplateProps>(
  ({ content, author, avatarUrl, date }, ref) => {
    const randomTitle = getRandomItem(RANDOM_TITLES);
    
    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          fontFamily: "'Playfair Display', serif",
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 48px',
          boxSizing: 'border-box',
        }}
      >
        {/* Floating Decorative Elements - Graduation Symbols */}
        <div style={{ position: 'absolute', top: '120px', left: '80px', fontSize: '120px', opacity: 0.15 }}>🎓</div>
        <div style={{ position: 'absolute', bottom: '200px', right: '100px', fontSize: '100px', opacity: 0.12 }}>✨</div>
        <div style={{ position: 'absolute', top: '400px', right: '60px', fontSize: '80px', opacity: 0.1 }}>🌟</div>

        {/* Top Border - Premium Gold */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '40px',
            right: '40px',
            height: '20px',
            background: 'linear-gradient(to right, #d4af37, #f4d03f, #d4af37)',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 10px 30px rgba(212, 175, 55, 0.4)',
          }}
        ></div>

        {/* Bottom Border - Premium Gold */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '40px',
            right: '40px',
            height: '20px',
            background: 'linear-gradient(to right, #d4af37, #f4d03f, #d4af37)',
            borderRadius: '8px 8px 0 0',
            boxShadow: '0 -10px 30px rgba(212, 175, 55, 0.4)',
          }}
        ></div>

        {/* Left & Right Border Frames */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20px',
            bottom: '20px',
            width: '20px',
            background: 'linear-gradient(to bottom, transparent, #d4af37, transparent)',
            boxShadow: '5px 0 15px rgba(212, 175, 55, 0.3)',
          }}
        ></div>
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '20px',
            bottom: '20px',
            width: '20px',
            background: 'linear-gradient(to bottom, transparent, #d4af37, transparent)',
            boxShadow: '-5px 0 15px rgba(212, 175, 55, 0.3)',
          }}
        ></div>

        {/* Main Content Card */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '40px',
            maxWidth: '900px',
          }}
        >
          {/* Ceremony Header - 🎓 LỄ TỐT NGHIỆP */}
          <div>
            <p
              style={{
                fontSize: '56px',
                color: '#d4af37',
                margin: '0 0 12px 0',
                fontWeight: '800',
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              🎓 LỄ TỐT NGHIỆP
            </p>
            <div
              style={{
                width: '200px',
                height: '3px',
                background: 'linear-gradient(to right, transparent, #d4af37, transparent)',
                margin: '0 auto',
              }}
            ></div>
          </div>

          {/* Large Avatar - VIP Card Style */}
          <div
            style={{
              position: 'relative',
              width: '280px',
              height: '280px',
            }}
          >
            {/* Outer Circle - Gold Ring */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '5px solid #d4af37',
                boxShadow: '0 0 40px rgba(212, 175, 55, 0.5), inset 0 0 40px rgba(212, 175, 55, 0.2)',
              }}
            ></div>

            {/* Avatar Image */}
            <div
              style={{
                position: 'absolute',
                inset: '12px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
                border: '3px solid #d4af37',
                boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8)',
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
                    fontSize: '120px',
                    fontWeight: 'bold',
                  }}
                >
                  {author.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Verified Badge - Top Right */}
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                right: '-8px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#d4af37',
                border: '4px solid #0a0a0a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                boxShadow: '0 8px 20px rgba(212, 175, 55, 0.5)',
              }}
            >
              ✓
            </div>
          </div>

          {/* Guest Name - Large & Bold */}
          <div>
            <h1
              style={{
                fontSize: '72px',
                color: 'white',
                margin: '0 0 8px 0',
                fontWeight: '800',
                letterSpacing: '1px',
                textShadow: '0 4px 20px rgba(212, 175, 55, 0.3)',
              }}
            >
              {author}
            </h1>
            <p
              style={{
                fontSize: '28px',
                color: '#d4af37',
                margin: '0',
                fontStyle: 'italic',
                letterSpacing: '2px',
              }}
            >
              {randomTitle}
            </p>
          </div>

          {/* Blessing Text - Centered with Quote Marks */}
          <div
            style={{
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              border: '2px solid #d4af37',
              borderRadius: '20px',
              padding: '40px',
              position: 'relative',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Decorative Quote Marks */}
            <span
              style={{
                position: 'absolute',
                top: '8px',
                left: '16px',
                fontSize: '60px',
                color: '#d4af37',
                opacity: 0.3,
              }}
            >
              "
            </span>

            <p
              style={{
                fontSize: '52px',
                color: 'white',
                lineHeight: '1.5',
                margin: '0',
                fontWeight: '600',
                fontStyle: 'italic',
              }}
            >
              {content}
            </p>

            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '16px',
                fontSize: '60px',
                color: '#d4af37',
                opacity: 0.3,
              }}
            >
              "
            </span>
          </div>

          {/* Date & Event Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <p
              style={{
                fontSize: '36px',
                color: '#d4af37',
                fontWeight: 'bold',
                margin: '0',
                letterSpacing: '2px',
              }}
            >
              {date}
            </p>
            <p
              style={{
                fontSize: '24px',
                color: '#a0a0a0',
                margin: '0',
                letterSpacing: '1px',
              }}
            >
              Đức Kiên Graduation 2025
            </p>
          </div>
        </div>

        {/* Corner Decorations - Gold Squares */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '80px',
            width: '60px',
            height: '60px',
            border: '3px solid #d4af37',
            opacity: 0.4,
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
          }}
        ></div>
        <div
          style={{
            position: 'absolute',
            bottom: '120px',
            right: '80px',
            width: '60px',
            height: '60px',
            border: '3px solid #d4af37',
            opacity: 0.4,
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)',
          }}
        ></div>

        {/* Watermark at Bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: 0,
            right: 0,
            textAlign: 'center',
            opacity: 0.25,
          }}
        >
          <p
            style={{
              color: '#808080',
              fontSize: '18px',
              letterSpacing: '2px',
              margin: '0',
              fontWeight: '600',
            }}
          >
            ✨ LỄTỐTNGHIỆP ✨
          </p>
        </div>
      </div>
    );
  }
);

// Concept C: Chat Message Style (iMessage)
const ConceptC = forwardRef<HTMLDivElement, StoryTemplateProps>(
  ({ content, author, avatarUrl, date, guestNumber }, ref) => {
    const randomWeather = getRandomItem(RANDOM_WEATHER);
    const luckyNumber = getLuckyNumber();
    
    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          fontFamily: "'Inter', sans-serif",
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 48px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header - Conversation Title */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}
        >
          <p
            style={{
              color: '#d4af37',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: '0 0 16px 0',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            💬 Lời Chúc Tốt Nghiệp
          </p>
          <p
            style={{
              color: '#a0a0a0',
              fontSize: '28px',
              margin: '0',
            }}
          >
            Cuộc Hội Thoại Tâm Tình
          </p>
        </div>

        {/* Chat Messages Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {/* Typing Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#a0a0a0',
              fontSize: '28px',
            }}
          >
            <span style={{ color: '#d4af37' }}>👤 Đức Kiên</span>
            <span style={{ fontSize: '20px' }}>đang soạn...</span>
          </div>

          {/* Guest Message Bubble */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              gap: '16px',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '2px solid #d4af37',
                overflow: 'hidden',
                flexShrink: 0,
                background: '#333',
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
                    fontSize: '28px',
                    fontWeight: 'bold',
                  }}
                >
                  {author.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div
              style={{
                maxWidth: '800px',
                backgroundColor: '#222',
                borderRadius: '24px',
                padding: '24px 32px',
                border: '2px solid #333',
              }}
            >
              <p
                style={{
                  color: '#e0e0e0',
                  fontSize: '48px',
                  lineHeight: '1.4',
                  margin: '0',
                  fontWeight: '500',
                }}
              >
                {content}
              </p>
              <p
                style={{
                  color: '#a0a0a0',
                  fontSize: '28px',
                  margin: '12px 0 0 0',
                  textAlign: 'right',
                }}
              >
                {author} • {date}
              </p>
            </div>
          </div>

          {/* Admin Reaction */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px',
              alignItems: 'center',
              fontSize: '64px',
            }}
          >
            <span>❤️</span>
            <span>😍</span>
            <span>🎉</span>
            <span>✨</span>
          </div>
        </div>

        {/* Bottom Info Section */}
        <div
          style={{
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            border: '2px solid #d4af37',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginBottom: '24px',
              gap: '24px',
            }}
          >
            <div>
              <p
                style={{
                  color: '#d4af37',
                  fontSize: '40px',
                  fontWeight: 'bold',
                  margin: '0',
                }}
              >
                #{guestNumber || '?'}
              </p>
              <p
                style={{
                  color: '#a0a0a0',
                  fontSize: '24px',
                  margin: '8px 0 0 0',
                }}
              >
                Vị khách
              </p>
            </div>
            <div style={{ borderLeft: '2px solid #d4af37' }}></div>
            <div>
              <p
                style={{
                  color: '#d4af37',
                  fontSize: '40px',
                  fontWeight: 'bold',
                  margin: '0',
                }}
              >
                {luckyNumber}
              </p>
              <p
                style={{
                  color: '#a0a0a0',
                  fontSize: '24px',
                  margin: '8px 0 0 0',
                }}
              >
                Con số may mắn
              </p>
            </div>
          </div>
          <p
            style={{
              color: '#d4af37',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: '0',
            }}
          >
            {randomWeather}
          </p>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.3,
          }}
        >
          <p
            style={{
              color: '#808080',
              fontSize: '20px',
              letterSpacing: '2px',
              margin: '0',
            }}
          >
            ✨ Lễ Tốt Nghiệp Đức Kiên 2025 ✨
          </p>
        </div>
      </div>
    );
  }
);

// Main Component - Random Concept Selector
const StoryTemplate = forwardRef<HTMLDivElement, StoryTemplateProps>(
  (props, ref) => {
    // Use Concept A (Social Media Post) as default
    // Can change to random selection later:
    // const concepts = [ConceptA, ConceptB, ConceptC];
    // const randomConcept = concepts[Math.floor(Math.random() * concepts.length)];
    // return randomConcept({ ...props, ref });
    
    return <ConceptA {...props} ref={ref} />;
  }
);

ConceptA.displayName = 'ConceptA';
ConceptB.displayName = 'ConceptB';
ConceptC.displayName = 'ConceptC';
StoryTemplate.displayName = 'StoryTemplate';

export default StoryTemplate;
