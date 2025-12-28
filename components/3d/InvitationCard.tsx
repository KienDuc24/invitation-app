"use client";

import { supabase } from "@/lib/supabase";
import { ContactShadows, Environment, Float, OrbitControls, RoundedBox, Sparkles, Stars, Text, useGLTF, useVideoTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { CheckCircle, Frown, Heart, ImagePlus, Loader2, MessageCircle, RefreshCw, RotateCcw, Send, Smartphone, Sparkles as SparklesIcon, Ticket, X } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";

// Confetti Component
const Confetti = ({ show }: { show: boolean }) => {
    if (!show) return null;
    const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1,
        color: ['#d4af37', '#ffd700', '#aa8e26', '#fff5e0'][Math.floor(Math.random() * 4)],
    }));

    return (
        <div className="fixed inset-0 pointer-events-none">
            {confettiPieces.map(piece => (
                <div
                    key={piece.id}
                    className="absolute w-2 h-2 animate-pulse"
                    style={{
                        left: `${piece.left}%`,
                        top: '-10px',
                        backgroundColor: piece.color,
                        animation: `fall ${piece.duration}s linear ${piece.delay}s forwards`,
                        borderRadius: '50%',
                    }}
                />
            ))}
            <style>{`
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

// --- TYPES ---
interface InvitationProps {
    guestName?: string;
    guestId?: string;
    isConfirmed?: boolean;
    initialAttendance?: string;
    initialWish?: string;
    onTabChange?: (tab: 'wish' | 'chat' | 'card') => void;
}

// --- CẤU HÌNH ---
const MY_NAME = "Bùi Đức Kiên";
const MUSIC_URL = "/music/bg-music.mp3";
const FONT_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxM.woff";
const CAP_MODEL_URL = "/models/cap.glb";

// --- CÁC COMPONENT 3D ---
function MatteGoldMaterial() { return <meshStandardMaterial color="#cfa436" roughness={0.5} metalness={0.7} envMapIntensity={1} />; }
function SatinGoldMaterial() { return <meshStandardMaterial color="#eacda3" roughness={0.3} metalness={0.9} envMapIntensity={1.5} />; }
function DeepVelvetMaterial() { return <meshStandardMaterial color="#020202" roughness={0.95} metalness={0.05} envMapIntensity={0.2} />; }
const textGoldMaterial = new THREE.MeshStandardMaterial({ color: "#ffd700", metalness: 0.95, roughness: 0.2, toneMapped: true, emissive: "#ffa500", emissiveIntensity: 0.3 });

function VideoPlane({ url }: { url: string }) {
    const texture = useVideoTexture(url, { unsuspend: 'canplay', muted: true, loop: true, start: true, crossOrigin: 'Anonymous', playsInline: true });
    return <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />;
}

// ✨ MẶT SAU THIỆP: Layout cách điệu, dễ đọc
function EventDetailsBack({ info }: { info: any }) {
    const [randomUrl] = useState(() => `/media/catmi_${Math.floor(Math.random() * 5) + 1}.mp4`);
    
    const time = String(info?.time_info || "Đang cập nhật...");
    const location = String(info?.location_info || "Đang cập nhật...");
    const contact = String(info?.contact_info || "Đang cập nhật...");

    const contentMaxWidth = 2.8; // Giảm để vừa vặn trong thẻ

    return (
        <group position={[0, 0, -0.09]} rotation={[0, Math.PI, 0]}>
            {/* Nền thiệp */}
            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[6.2, 4.0]} />
                <meshBasicMaterial color="#050505" />
            </mesh>
            
            {/* Video thu nhỏ nằm góc trái */}
            <group position={[-1.8, 0.85, 0.01]}>
                <mesh>
                    <planeGeometry args={[1.85, 1.4]} />
                    <Suspense fallback={<meshBasicMaterial color="#111" />}>
                        <VideoPlane url={randomUrl} />
                    </Suspense>
                </mesh>
                <mesh position={[0, 0, -0.005]}>
                    <planeGeometry args={[1.95, 1.5]} />
                    <meshBasicMaterial color="#d4af37" />
                </mesh>
            </group>

            {/* PHẦN NỘI DUNG VĂN BẢN */}
            <group position={[-0.05, 0.05, 0.02]}>
                {/* Tiêu đề */}
                <Text 
                    position={[0, 1.5, 0]} 
                    fontSize={0.26} 
                    color="#ffd700" 
                    font={FONT_URL} 
                    anchorX="left" 
                    anchorY="top"
                    maxWidth={contentMaxWidth}
                    letterSpacing={0.08}
                >
                    THÔNG TIN BUỔI LỄ
                </Text>

                {/* Thời gian */}
                <Text 
                    position={[0, 0.9, 0]} 
                    fontSize={0.095} 
                    color="#b8b8b8" 
                    font={FONT_URL} 
                    anchorX="left"
                    anchorY="top"
                    letterSpacing={0.12}
                >
                    THỜI GIAN
                </Text>
                <Text 
                    position={[0, 0.7, 0]} 
                    fontSize={0.2} 
                    color="#ffffff" 
                    font={FONT_URL} 
                    anchorX="left"
                    anchorY="top"
                    maxWidth={contentMaxWidth}
                    lineHeight={1.3}
                >
                    {time}
                </Text>

                {/* Địa điểm */}
                <Text 
                    position={[0, -0.1, 0]} 
                    fontSize={0.095} 
                    color="#b8b8b8" 
                    font={FONT_URL} 
                    anchorX="left"
                    anchorY="top"
                    letterSpacing={0.12}
                >
                    ĐỊA ĐIỂM
                </Text>
                <Text 
                    position={[0, -0.3, 0]} 
                    fontSize={0.18}
                    color="#ffffff" 
                    font={FONT_URL} 
                    anchorX="left"
                    anchorY="top"
                    maxWidth={contentMaxWidth}
                    lineHeight={1.3}
                >
                    {location}
                </Text>

                {/* Liên hệ */}
                <Text 
                    position={[0, -1.25, 0]} 
                    fontSize={0.095} 
                    color="#b8b8b8" 
                    font={FONT_URL} 
                    anchorX="left"
                    anchorY="top"
                    letterSpacing={0.12}
                >
                    LIÊN HỆ
                </Text>
                <Text 
                    position={[0, -1.5, 0]} 
                    fontSize={0.2}
                    color="#ffd700" 
                    font={FONT_URL} 
                    anchorX="left"
                    anchorY="top"
                    maxWidth={contentMaxWidth}
                >
                    {contact}
                </Text>
            </group>
            
            <Sparkles count={15} scale={[6, 4, 0.1]} size={0.5} speed={0.35} color="#d4af37" />
        </group>
    );
}

function GraduationCap({ visible }: { visible: boolean }) {
    const { scene } = useGLTF(CAP_MODEL_URL);
    const capRef = useRef<THREE.Group>(null);
    const clone = useMemo(() => scene.clone(), [scene]);
    useMemo(() => { 
        clone.traverse((child) => { 
            if ((child as THREE.Mesh).isMesh) { 
                (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.8, metalness: 0.2 }); 
            } 
        }); 
    }, [clone]);

    useFrame((state, delta) => {
        if (!capRef.current) return;
        const targetY = visible ? 2.3 : 7.0;
        capRef.current.position.y = THREE.MathUtils.lerp(capRef.current.position.y, targetY, delta * 2.5);
    });
    return <group ref={capRef} position={[0, 7.0, 0]} scale={0.65}><primitive object={clone} /></group>;
}

function HeroCard({ guestName, startIntro, eventInfo }: { guestName: string, startIntro: boolean, eventInfo: any }) {
    const group = useRef<THREE.Group>(null);
    const { viewport } = useThree();
    const targetScale = Math.min(viewport.width / 7, viewport.height / 4.5) * 0.65;
    const [cardStabilized, setCardStabilized] = useState(false);

    useFrame((state, delta) => {
        if (!group.current || !startIntro) return;
        const currentScale = group.current.scale.x;
        const step = THREE.MathUtils.lerp(currentScale, targetScale, delta * 2.0);
        group.current.scale.set(step, step, step);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, delta * 2.0);
        if (!cardStabilized && Math.abs(group.current.rotation.y) < 0.1) { setCardStabilized(true); }
    });

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <group ref={group} scale={0.1} rotation={[0, -Math.PI * 1.5, 0]}>
                <GraduationCap visible={cardStabilized} />
                <group>
                    <RoundedBox args={[6.35, 4.15, 0.04]} radius={0.2} smoothness={4} position={[0, 0, -0.06]}><MatteGoldMaterial /></RoundedBox>
                    <RoundedBox args={[6.1, 3.9, 0.08]} radius={0.12} smoothness={4} position={[0, 0, 0]}><DeepVelvetMaterial /></RoundedBox>
                    
                    <EventDetailsBack info={eventInfo} />

                    <group position={[0, 0.1, 0.051]}>
                        {/* Tiêu đề sự kiện */}
                        <Text position={[0, 1.5, 0]} fontSize={0.18} color="#ffd700" letterSpacing={0.18} font={FONT_URL} anchorX="center" anchorY="middle">LỄ TỐT NGHIỆP 2025</Text>
                        
                        <Text position={[0, 1.0, 0]} fontSize={0.11} color="#999999" letterSpacing={0.25} font={FONT_URL} anchorX="center" anchorY="middle">TRÂN TRỌNG KÍNH MỜI</Text>

                        <Text position={[0, 0.22, 0]} fontSize={0.52} font={FONT_URL} maxWidth={5.5} textAlign="center" material={textGoldMaterial} letterSpacing={0.08} anchorX="center" anchorY="middle">{guestName}</Text>
                        
                        <Text position={[0, -0.7, 0]} fontSize={0.12} color="#b8b8b8" font={FONT_URL} letterSpacing={0.1} anchorX="center" anchorY="middle">Tới dự lễ tốt nghiệp của</Text>
                        <Text position={[0, -1.2, 0]} fontSize={0.32} color="#ffffff" font={FONT_URL} maxWidth={5} textAlign="center" anchorX="center" anchorY="middle">{MY_NAME}</Text>
                    </group>
                    <Sparkles count={25} scale={[5.8, 3.6, 0.1]} size={1.2} color="#ffd700" speed={0.4} />
                </group>
            </group>
        </Float>
    );
}

function SceneSetup() {
    return (
        <group>
            <Environment preset="city" blur={1} background={false} />
            <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5}  />
            <ambientLight intensity={0.4} />
            <spotLight position={[10, 10, 10]} angle={0.4} penumbra={1} intensity={6} color="#fff5e0" castShadow />
            <pointLight position={[-5, 0, 5]} intensity={2} color="#cceeff" />
        </group>
    )
}

const RotatePrompt = ({ onClose }: { onClose: () => void }) => (
    <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md animate-in fade-in duration-500">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors">
            <X size={32} />
        </button>
        <div className="relative mb-8"><Smartphone className="w-16 h-16 text-gray-500 animate-pulse" /><RotateCcw className="absolute -right-4 -top-2 w-10 h-10 text-[#d4af37] animate-spin-slow" /></div>
        <h3 className="text-[#d4af37] text-xl font-bold uppercase tracking-widest mb-2 font-sans">Trải nghiệm tốt nhất</h3>
        <p className="text-gray-400 text-sm max-w-[250px] leading-relaxed font-sans">Vui lòng <span className="text-white font-bold">xoay ngang điện thoại</span> để xem thiệp mời trọn vẹn.</p>
    </div>
);

const PortalOverlay = ({ children }: { children: React.ReactNode }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = 'unset'; }; }, []);
    if (!mounted) return null;
    return createPortal(children, document.body);
};

export default function MobileInvitation({ 
    guestName = "", 
    guestId = "", 
    isConfirmed = false, 
    initialAttendance = "", 
    initialWish = "",
    onTabChange 
}: InvitationProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    const [startIntro, setStartIntro] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [eventInfo, setEventInfo] = useState<any>(null);
    const [rsvpState, setRsvpState] = useState<'idle' | 'input' | 'success'>('idle');
    const [attendance, setAttendance] = useState(initialAttendance || "");
    const [wish, setWish] = useState(initialWish || "");
    const [previousWish, setPreviousWish] = useState(initialWish || "");
    const [loading, setLoading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [confirmedAttendance, setConfirmedAttendance] = useState(initialAttendance || "");
    const touchStartXRef = useRef<number>(0);
    
    useEffect(() => {
        const getInfo = async () => {
            try {
                const { data } = await supabase.from('event_info').select('*').eq('id', 'main_event').single();
                setEventInfo(data);
            } catch (e) { console.error("Event Info Fetch Error", e); }
        };
        getInfo();
        
        const checkOrientation = () => { setIsPortrait(window.innerHeight > window.innerWidth); };
        checkOrientation(); 
        window.addEventListener('resize', checkOrientation); 
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    useEffect(() => {
        if (isConfirmed) { setIsOpen(true); }
        // Nếu đã vote nhưng không phải "Có tham dự", hiển thị modal xác nhận
        if (initialAttendance && initialAttendance !== "Có tham dự") {
            setRsvpState('success');
            setConfirmedAttendance(initialAttendance);
        }
    }, [isConfirmed, initialAttendance]);

    useEffect(() => {
        if (isOpen && !isPortrait) {
            // Delay một chút để Canvas render xong
            const timer = setTimeout(() => setStartIntro(true), 500);
            return () => clearTimeout(timer);
        } else {
            setStartIntro(false);
        }
    }, [isOpen, isPortrait]);

    // Handle ESC key to close card
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleCloseCard();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(MUSIC_URL);
            audioRef.current.loop = true;
            audioRef.current.volume = 0.5;
        }
        const audio = audioRef.current;
        if (isOpen && !isPortrait) {
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
        return () => audio.pause();
    }, [isOpen, isPortrait]);

    const handleCloseCard = () => {
        setIsClosing(true);
        setTimeout(() => {
            if (audioRef.current) audioRef.current.pause();
            setIsOpen(false);
            setIsClosing(false);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            if (onTabChange) onTabChange('chat');
        }, 300);
    };

    const handleOpenCard = async () => {
        setIsOpen(true);
        try {
            // Lock to landscape on mobile
            const screenOrientation = screen.orientation as any;
            if (screenOrientation?.lock) {
                try {
                    await screenOrientation.lock('landscape');
                } catch (err) {
                    console.log('Orientation lock not available:', err);
                }
            }
            await document.documentElement.requestFullscreen();
        } catch (err) {
            console.log('Fullscreen not available:', err);
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartXRef.current - touchEndX;
        // Swipe từ phải sang trái > 80px để đóng card
        if (diff > 80) {
            handleCloseCard();
        }
    };

    const handleSubmit = async () => {
        if (!guestId) return;
        setLoading(true);
        try {
            // Luôn set is_confirmed: true khi user vote
            // is_confirmed = đã hoàn thành vote, không phải là có đi hay không
            const updateData: any = {
                attendance,
                wish,
                is_confirmed: true,
            };

            const { error } = await supabase
                .from('guests')
                .update(updateData)
                .eq('id', guestId);
            
            if (error) throw error;
            
            console.log('Attendance:', attendance);
            
            // Trigger confetti nếu "Có tham dự"
            if (attendance === "Có tham dự") {
                console.log('Setting confetti to true');
                setShowConfetti(true);
                setConfirmedAttendance("Có tham dự");
                setPreviousWish(wish);
                setTimeout(() => setShowConfetti(false), 3000);
                
                // Redirect after success
                setTimeout(() => {
                    window.location.href = `/${guestId}`;
                }, 2000);
            } else {
                // Nếu "Bận" hoặc không tham dự được - chỉ lưu trạng thái, không redirect
                setConfirmedAttendance(attendance);
                setPreviousWish(wish);
                setRsvpState('success');
            }
        } catch (err) {
            console.error('RSVP Error:', err);
            setRsvpState('idle');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PortalOverlay>
            <Confetti show={showConfetti} />
            <div 
                className="fixed inset-0 z-[99999] bg-[#050505] transition-opacity duration-300"
                style={{
                    fontFamily: 'Playfair Display, Georgia, serif',
                    opacity: isClosing ? 0 : 1
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {!isOpen ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-1000 overflow-y-auto bg-[#050505]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)]" />
                        
                        <div className="relative z-10 w-full max-w-sm px-3 flex flex-col items-center gap-6">
                            
                            {/* === CARD CHÍNH === */}
                            <div className="relative w-full py-20 px-6 flex flex-col items-center justify-center">
                                
                                {/* KHUNG VIỀN MẢNH */}
                                <div className="absolute inset-0 z-0 border border-[#d4af37]/40 rounded-sm">
                                    <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
                                    <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
                                    <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
                                    <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />
                                </div>

                                <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                                    <div className="space-y-2">
                                        <p className="text-[#999999] text-[10px] tracking-[0.25em] uppercase opacity-90 font-medium">Trân trọng kính mời</p>
                                    </div>
                                    <div className="py-6">
                                        <h1 
                                            className="text-4xl font-black text-transparent uppercase tracking-[0.08em] leading-relaxed relative overflow-visible"
                                            style={{
                                                backgroundImage: 'linear-gradient(135deg, #fadd7d 0%, #ffd700 25%, #aa8e26 50%, #ffd700 75%, #fadd7d 100%)',
                                                backgroundSize: '200% 200%',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                                animation: 'shine 3s ease-in-out infinite',
                                            }}
                                        >
                                            {guestName}
                                        </h1>
                                        <style>{`
                                            @keyframes shine {
                                                0% { background-position: 0% 50%; }
                                                50% { background-position: 100% 50%; }
                                                100% { background-position: 0% 50%; }
                                            }
                                        `}</style>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[#999999] text-[9px] tracking-[0.25em] uppercase">Tới tham dự sự kiện</p>
                                        <h2 className="text-base font-bold text-white uppercase tracking-[0.15em]">Lễ Tốt Nghiệp</h2>
                                        <p className="text-[#d4af37] text-sm font-medium italic">Của Bùi Đức Kiên</p>
                                        <p className="text-3xl font-black text-[#ffd700] drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">2025</p>
                                    </div>
                                    <div className="pt-3">
                                        <button
                                            onClick={handleOpenCard}
                                            className="group relative px-8 py-3 bg-[#d4af37]/10 border border-[#d4af37]/50 rounded-full hover:bg-[#d4af37]/20 transition-all shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                                        >
                                            <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold tracking-[0.2em] uppercase">
                                                <SparklesIcon size={16} /><span>Mở Thiệp</span>
                                            </div>
                                        </button>
                                        <p className="text-center text-gray-400 text-[10px] mt-2 italic">Lịch dự kiến • Vui lòng kiểm tra chi tiết</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* KHUNG RSVP */}
                            <div className="w-full bg-[#111]/50 backdrop-blur-sm border border-[#333]/50 rounded-xl p-4 animate-in slide-in-from-bottom-6 duration-700">
                                {rsvpState === 'idle' && (
                                    <div>
                                        <p className="text-center text-gray-400 text-[10px] uppercase tracking-widest mb-3">Bạn sẽ tham dự chứ?</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => { setAttendance("Có tham dự"); setRsvpState('input'); }} className="flex flex-col items-center gap-1.5 p-3 bg-[#d4af37] text-black rounded-lg hover:scale-105 transition-transform">
                                                <Heart className="fill-black w-4 h-4" />
                                                <span className="font-bold uppercase text-[10px]">Tham dự</span>
                                            </button>
                                            <button onClick={() => { setAttendance("Rất tiếc, mình bận"); setRsvpState('input'); }} className="flex flex-col items-center gap-1.5 p-3 bg-[#222] border border-[#333] text-gray-400 rounded-lg hover:bg-[#333] hover:text-white transition-colors">
                                                <Frown className="w-4 h-4" />
                                                <span className="font-bold uppercase text-[10px]">Mình bận</span>
                                            </button>
                                        </div>
                                        <p className="text-center text-gray-400 text-[10px] mt-3 italic">Chi tiết ở mặt sau thiệp • Cập nhật trực tiếp</p>
                                    </div>
                                )}
                                {rsvpState === 'input' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#d4af37] text-[10px] font-bold uppercase">
                                                {attendance === "Có tham dự" ? "Gửi lời chúc nhé:" : "Nhắn gửi đôi lời:"}
                                            </span>
                                            <button onClick={() => setRsvpState('idle')} className="text-gray-500 hover:text-white"><X size={14}/></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={wish}
                                                onChange={(e) => setWish(e.target.value)}
                                                placeholder="Viết lời chúc..."
                                                className="flex-1 bg-[#222] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                                            />
                                            <button
                                                onClick={handleSubmit}
                                                disabled={loading}
                                                className="bg-[#d4af37] text-black px-3 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {rsvpState === 'success' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2 text-green-500 font-bold uppercase text-[10px] tracking-wider">
                                                <CheckCircle size={14} /> Đã xác nhận
                                            </div>
                                            <button onClick={() => { setRsvpState('idle'); setAttendance(""); setWish(previousWish); }} className="px-2 py-1 bg-[#222] rounded text-gray-400 hover:text-white text-[10px] font-bold flex items-center gap-1">
                                                <RefreshCw size={10} /> Thay đổi
                                            </button>
                                        </div>
                                        {confirmedAttendance !== "Có tham dự" && (
                                            <div className="bg-[#1a1a1a] border border-orange-500/30 rounded-lg p-3 text-center">
                                                <p className="text-orange-400 text-xs font-bold uppercase tracking-wider">
                                                    Bạn đã chọn "{confirmedAttendance}"
                                                </p>
                                                <p className="text-gray-400 text-[9px] mt-2">
                                                    Nếu thay đổi ý định, bấm "Thay đổi" ở trên để cập nhật lựa chọn
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                ) : isPortrait ? (
                    <RotatePrompt onClose={handleCloseCard} />
                ) : (
                    <>
                        {/* CLOSE BUTTON - Với pulse animation */}
                        <button 
                            onClick={handleCloseCard} 
                            className="fixed top-6 right-6 z-[999999] p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all duration-200 shadow-lg hover:shadow-xl animate-pulse"
                            title="Đóng thiệp (ESC / Swipe)"
                        >
                            <X size={28} />
                        </button>

                        {/* MUTE BUTTON */}
                        <button
                            onClick={() => {
                                setIsMuted(!isMuted);
                                if (audioRef.current) {
                                    audioRef.current.volume = isMuted ? 0.5 : 0;
                                }
                            }}
                            className="fixed top-6 right-24 z-[999999] p-3 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all duration-200 shadow-lg hover:shadow-xl"
                            title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                        >
                            {isMuted ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                            )}
                        </button>

                        {/* FULLSCREEN INDICATOR */}
                        <div className="fixed top-6 left-6 z-[999999] text-[10px] text-gray-400 font-mono tracking-widest uppercase backdrop-blur-sm bg-black/40 px-3 py-2 rounded-full border border-white/10">
                            ⚫ Fullscreen Mode
                        </div>

                        <Canvas shadows camera={{ position: [0, 0, 15], fov: 30 }} gl={{ antialias: true, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.0 }} dpr={[1, 2]}>
                            <color attach="background" args={['#050505']} />
                            <SceneSetup />
                            <OrbitControls enableZoom={true} minDistance={10} maxDistance={25} autoRotate autoRotateSpeed={0.5} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
                            <Suspense fallback={null}><HeroCard guestName={guestName} startIntro={startIntro} eventInfo={eventInfo} /></Suspense>
                            <ContactShadows position={[0, -3.5, 0]} opacity={0.6} scale={20} blur={3} color="#000" />
                            <EffectComposer enableNormalPass={false}><Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.4} radius={0.6} /><Noise opacity={0.015} /><Vignette offset={0.3} darkness={0.6} /></EffectComposer>
                        </Canvas>

                        {/* NAV BUTTON - HIDDEN IN FULLSCREEN MODE */}
                        {onTabChange && (
                            <div className="fixed bottom-6 left-6 right-6 z-[999999] hidden">
                                <div className="bg-[#111]/90 backdrop-blur-xl border border-[#333] rounded-2xl p-2 flex justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-md mx-auto">
                                    <NavButton icon={<Ticket size={20} />} label="Lưu bút" onClick={() => onTabChange('wish')} active={false} />
                                    <NavButton icon={<MessageCircle size={20} />} label="Trò chuyện" onClick={() => onTabChange('chat')} active={false} />
                                    <NavButton icon={<ImagePlus size={20} />} label="Xem thiệp" onClick={() => {}} active={true} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </PortalOverlay>
    );
}

function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all ${active ? 'bg-[#d4af37] text-black' : 'text-gray-500 hover:text-white'}`}>
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  )
}