"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Text,
  Environment,
  Float,
  ContactShadows,
  RoundedBox,
  Sparkles,
  OrbitControls,
  Stars,
} from "@react-three/drei";
import * as THREE from "three";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
} from "@react-three/postprocessing";
import { X, Sparkles as SparklesIcon, Smartphone, RotateCcw, Volume2, VolumeX, Send, RefreshCw } from "lucide-react";
import RsvpModal from "@/components/RsvpModal";

// --- 1. CẤU HÌNH ---
const MY_NAME = "Bùi Đức Kiên";
const MUSIC_URL = "/music/bg-music.mp3"; 

// ✅ SỬ DỤNG FONT GOOGLE TRỰC TIẾP (Sửa lỗi dấu hỏi chấm ??)
const FONT_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxM.woff"; 

// --- 2. VẬT LIỆU ---
function PremiumGoldMaterial() {
  return (
    <meshPhysicalMaterial
      color="#ffeaae"
      roughness={0.2}
      metalness={1}
      clearcoat={1}
      clearcoatRoughness={0.15}
      reflectivity={1}
      emissive="#b8860b"
      emissiveIntensity={0.1}
    />
  );
}

function VelvetBlackMaterial() {
  return (
    <meshStandardMaterial
      color="#050505"
      roughness={0.9}
      metalness={0.1}
    />
  );
}

// --- 3. COMPONENT THIỆP 3D ---
function Card({ guestName }: { guestName: string }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const scale = Math.min(viewport.width / 7, viewport.height / 4) * 0.9;

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.4} floatingRange={[-0.05, 0.05]}>
      <group ref={group} scale={scale}>
        
        {/* ĐẾ & THÂN */}
        <RoundedBox args={[6.05, 3.55, 0.02]} radius={0.12} smoothness={4} position={[0, 0, -0.03]}>
          <PremiumGoldMaterial />
        </RoundedBox>
        <RoundedBox args={[6, 3.5, 0.05]} radius={0.1} smoothness={4} position={[0, 0, 0]}>
          <VelvetBlackMaterial />
        </RoundedBox>

        {/* NỘI DUNG CHỮ */}
        <group position={[0, 0, 0.06]}>
          <Text position={[0, 1.1, 0]} fontSize={0.14} color="#aaaaaa" letterSpacing={0.2} font={FONT_URL}>
            TRÂN TRỌNG KÍNH MỜI
          </Text>

          {/* Tên Khách (Đã sửa font) */}
          <Text
            position={[0, 0.25, 0]}
            fontSize={0.6}
            color="#fadd7d"
            font={FONT_URL}
            maxWidth={5.5}
            textAlign="center"
            lineHeight={1}
            outlineWidth={0.005}
            outlineColor="#b8860b"
          >
            {guestName}
          </Text>

          <Text position={[0, -0.6, 0]} fontSize={0.14} color="#888" maxWidth={5} letterSpacing={0.05} font={FONT_URL} textAlign="center">
            Tới tham dự Lễ Tốt Nghiệp 2025
          </Text>

          <Text position={[0, -1.2, 0]} fontSize={0.28} color="#fff" font={FONT_URL} letterSpacing={0.1}>
            {MY_NAME}
          </Text>
        </group>
        
        <Sparkles count={25} scale={[7, 5, 4]} size={3} speed={0.4} opacity={0.5} color="#ffeaae" />
      </group>
    </Float>
  );
}

// --- 4. COMPONENT PHỤ TRỢ ---
const RotatePrompt = () => (
    <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md animate-in fade-in duration-500">
        <div className="relative mb-8">
            <Smartphone className="w-16 h-16 text-gray-500 animate-pulse" />
            <RotateCcw className="absolute -right-4 -top-2 w-10 h-10 text-[#d4af37] animate-spin-slow" />
        </div>
        <h3 className="text-[#d4af37] text-xl font-bold uppercase tracking-widest mb-2">Trải nghiệm tốt nhất</h3>
        <p className="text-gray-400 text-sm max-w-[250px] leading-relaxed">Vui lòng <span className="text-white font-bold">xoay ngang điện thoại</span> để xem thiệp mời trọn vẹn.</p>
    </div>
);

const PortalOverlay = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

const BackgroundMusic = ({ play }: { play: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (play) {
      audioRef.current.play().catch((e) => console.log("Autoplay blocked:", e));
    } else {
      audioRef.current.pause();
    }
  }, [play]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  if (!play) return null;

  return (
    <button
      onClick={() => setIsMuted(!isMuted)}
      className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5 backdrop-blur-md group"
    >
      {isMuted ? <VolumeX size={24} className="text-gray-400 group-hover:text-white" /> : <Volume2 size={24} className="text-[#d4af37] animate-pulse" />}
    </button>
  );
};

// --- 5. MAIN COMPONENT (QUAN TRỌNG NHẤT) ---
// ✅ Định nghĩa kiểu dữ liệu để file page.tsx không bị báo đỏ nữa
interface InvitationProps {
    guestName?: string;
    guestId?: string;       // Nhận ID
    isConfirmed?: boolean;  // Nhận trạng thái
    initialAttendance?: string; // 👇 Thêm dòng này
    initialWish?: string;       // 👇 Thêm dòng này
}

export default function MobileInvitation({ guestName = "", guestId = "", isConfirmed = false, initialAttendance = "", initialWish = "" }: InvitationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);

  useEffect(() => {
    const checkOrientation = () => { setIsPortrait(window.innerHeight > window.innerWidth); };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return (
    <PortalOverlay>
      <div className="fixed inset-0 z-[99999] bg-[#020202] w-full h-[100dvh] overflow-hidden font-sans">
        
        <BackgroundMusic play={isOpen} />

        {/* Modal RSVP */}
        {isRsvpOpen && (
            <RsvpModal 
                defaultName={guestName} 
                guestId={guestId}
                hasConfirmed={isConfirmed}
                initialAttendance={initialAttendance} 
                initialWish={initialWish}
                onClose={() => setIsRsvpOpen(false)}
            />
        )}

        {/* MÀN HÌNH CHỜ (Landing Page) */}
        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-1000 ${isOpen ? 'opacity-0 pointer-events-none scale-110' : 'opacity-100 scale-100'}`}>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)]" />
             <div className="relative z-10 w-full max-w-sm mx-6 p-1">
                <div className="absolute inset-0 border border-[#d4af37]/30 rounded pointer-events-none" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#d4af37] rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#d4af37] rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#d4af37] rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#d4af37] rounded-br" />

                <div className="flex flex-col items-center py-16 px-6 text-center space-y-10 backdrop-blur-[2px]">
                    <div className="space-y-4">
                        <p className="text-[#d4af37] text-sm tracking-[0.3em] uppercase opacity-90 font-medium">Trân trọng kính mời</p>
                        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fadd7d] to-[#aa8e26] drop-shadow-md leading-tight break-words max-w-full">
                            {guestName}
                        </h1>
                    </div>
                    <div className="w-20 h-[1px] bg-[#d4af37]/50" />
                    <div className="space-y-3">
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Tham dự sự kiện</p>
                        <h2 className="text-3xl text-white uppercase tracking-widest font-light">Lễ Tốt Nghiệp</h2>
                        <p className="text-[#d4af37] text-4xl font-extrabold pt-2">2025</p>
                    </div>
                    
                    <button onClick={() => setIsOpen(true)} className="group relative px-10 py-4 bg-[#d4af37]/10 border border-[#d4af37]/50 rounded-full hover:bg-[#d4af37]/20 transition-all active:scale-95 mt-6 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                        <div className="flex items-center gap-3 text-[#d4af37] text-sm font-bold tracking-[0.2em] uppercase">
                            <SparklesIcon size={18} /><span>Mở Thiệp</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>

        {/* MÀN HÌNH CHÍNH (3D Viewer) */}
        {isOpen && (
            <div className="absolute inset-0 z-30 animate-in fade-in duration-1000">
                {isPortrait ? (
                    <RotatePrompt />
                ) : (
                    <>
                        <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5 backdrop-blur-md">
                            <X size={28} />
                        </button>

                        {/* ✅ NÚT GỬI (SẼ HIỆN Ở ĐÂY SAU KHI SỬA FILE NÀY) */}
                        <button 
                            onClick={() => setIsRsvpOpen(true)}
                            className={`absolute bottom-10 right-10 z-50 px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 animate-bounce-slow
                                ${isConfirmed 
                                    ? "bg-green-600 text-white shadow-green-900/50" 
                                    : "bg-[#d4af37] text-black shadow-[#d4af37]/50"
                                }`}
                        >
                            {isConfirmed ? <RefreshCw size={18} /> : <Send size={18} />}
                            <span>{isConfirmed ? "Đã xác nhận" : "Xác nhận tham dự"}</span>
                        </button>

                        <div className="absolute bottom-6 w-full text-center z-40 text-white/40 text-[10px] tracking-[0.4em] uppercase pointer-events-none">Chạm & Xoay để xem chi tiết</div>

                        <Canvas shadows camera={{ position: [0, 0, 10], fov: 35 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} dpr={[1, 1.5]}>
                           <color attach="background" args={['#020202']} />
                           <Stars radius={100} depth={50} count={1500} factor={4} saturation={0} fade speed={1} />
                           
                           <OrbitControls enableZoom={true} minDistance={6} maxDistance={15} autoRotate autoRotateSpeed={0.8} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
                           
                           <ambientLight intensity={0.2} />
                           <spotLight position={[5, 5, 8]} angle={0.4} penumbra={1} intensity={2} color="#ffeebb" castShadow />
                           <spotLight position={[-10, 2, -5]} angle={0.6} intensity={4} color="#4455ff" />
                           <pointLight position={[5, -2, 0]} intensity={0.5} color="#ffaa00" />
                           <Environment preset="city" blur={0.8} background={false} />
                           
                           <Card guestName={guestName} />
                           
                           <ContactShadows position={[0, -3, 0]} opacity={0.5} scale={20} blur={3} color="#000" />
                           <EffectComposer enableNormalPass={false}>
                                <Bloom luminanceThreshold={1.1} mipmapBlur intensity={0.5} radius={0.4} />
                                <Noise opacity={0.015} /> 
                                <ChromaticAberration offset={new THREE.Vector2(0.0005, 0.0005)} radialModulation={false} modulationOffset={0} />
                                <Vignette offset={0.3} darkness={0.6} />
                            </EffectComposer>
                        </Canvas>
                    </>
                )}
            </div>
        )}
      </div>
    </PortalOverlay>
  );
}