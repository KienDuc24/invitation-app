"use client";

import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Text,
  Environment,
  Float,
  ContactShadows,
  RoundedBox,
  Sparkles,
  OrbitControls,
  Stars,
  useGLTF,
  useVideoTexture,
} from "@react-three/drei";
import * as THREE from "three";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import { X, Sparkles as SparklesIcon, Smartphone, RotateCcw, Volume2, VolumeX, Send, RefreshCw } from "lucide-react";
import RsvpModal from "@/components/RsvpModal";

// --- CẤU HÌNH ---
const MY_NAME = "Bùi Đức Kiên";
const MUSIC_URL = "/music/bg-music.mp3"; 
const FONT_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxM.woff"; 
const CAP_MODEL_URL = "/models/cap.glb"; 

// --- VẬT LIỆU ---
function MatteGoldMaterial() {
  return <meshStandardMaterial color="#cfa436" roughness={0.5} metalness={0.7} envMapIntensity={1} />;
}
function SatinGoldMaterial() {
    return <meshStandardMaterial color="#eacda3" roughness={0.3} metalness={0.9} envMapIntensity={1.5} />;
}
function DeepVelvetMaterial() {
  return <meshStandardMaterial color="#020202" roughness={0.95} metalness={0.05} envMapIntensity={0.2} />;
}
const textGoldMaterial = new THREE.MeshStandardMaterial({
    color: "#e6c35c", metalness: 0.8, roughness: 0.4, toneMapped: true 
});

// --- COMPONENT VIDEO TEXTURE ---
function VideoPlane({ url }: { url: string }) {
    const texture = useVideoTexture(url, {
        unsuspend: 'canplay',
        muted: true,
        loop: true,
        start: true,
        crossOrigin: 'Anonymous',
        playsInline: true,
    });

    return (
        <meshBasicMaterial 
            map={texture} 
            toneMapped={false} 
            side={THREE.DoubleSide} 
        />
    );
}

// --- MẶT SAU: NỀN ĐEN + VIDEO ---
// --- MẶT SAU: NỀN ĐEN + VIDEO (ĐÃ SỬA Z-POSITION) ---
function RandomVideoBack() {
    const [randomUrl] = useState(() => {
        const id = Math.floor(Math.random() * 5) + 1; 
        return `/media/catmi_${id}.mp4`; 
    });

    return (
        // 👉 QUAN TRỌNG: Đẩy z lùi về -0.09 (vượt qua độ dày của hộp vàng)
        <group position={[0, 0, -0.09]} rotation={[0, Math.PI, 0]}>
            
            {/* 1. LỚP NỀN ĐEN (Che đi màu vàng của mặt lưng) */}
            <mesh position={[0, 0, 0]}>
                {/* Kích thước này che vừa đủ mặt lưng */}
                <planeGeometry args={[6.2, 4.0]} /> 
                <meshBasicMaterial color="#000000" />
            </mesh>

            {/* 2. LỚP VIDEO */}
            {/* Nổi lên trên nền đen một xíu (z=0.01) */}
            <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[5.8, 3.6]} />
                <Suspense fallback={<meshBasicMaterial color="#111" />}>
                    <VideoPlane url={randomUrl} />
                </Suspense>
            </mesh>


        </group>
    );
}

// --- MŨ CỬ NHÂN ---
function GraduationCap({ visible }: { visible: boolean }) {
  const { scene } = useGLTF(CAP_MODEL_URL);
  const capRef = useRef<THREE.Group>(null);
  const clone = useMemo(() => scene.clone(), [scene]);

  useMemo(() => {
    clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
                color: "#111", roughness: 0.8, metalness: 0.2
            });
        }
    });
  }, [clone]);

  useFrame((state, delta) => {
    if (!capRef.current) return;
    const targetY = visible ? 2.3 : 7.0;
    capRef.current.position.y = THREE.MathUtils.lerp(capRef.current.position.y, targetY, delta * 2.5);

    if (visible && capRef.current.position.y < 2.5) {
        const t = state.clock.getElapsedTime();
        capRef.current.position.y = 2.3 + Math.sin(t * 1.5) * 0.05;
        capRef.current.rotation.y = Math.sin(t) * 0.1;
    }
  });

  return (
    <group ref={capRef} position={[0, 7.0, 0]} rotation={[0.1, 0, 0]} scale={0.65}>
       <primitive object={clone} />
    </group>
  );
}
useGLTF.preload(CAP_MODEL_URL);

// --- TẤM THIỆP CHÍNH ---
function HeroCard({ guestName, startIntro }: { guestName: string, startIntro: boolean }) {
    const group = useRef<THREE.Group>(null);
    const { viewport } = useThree();
    
    // 👉 THAY ĐỔI: Giảm hệ số scale từ 0.85 xuống 0.75 để thiệp nhỏ hơn
    const targetScale = Math.min(viewport.width / 7, viewport.height / 4.5) * 0.7; 

    const [cardStabilized, setCardStabilized] = useState(false);
    const initialized = useRef(false);

    useFrame((state, delta) => {
        if (!group.current || !startIntro) return;
        if (!initialized.current) {
            group.current.rotation.y = -Math.PI * 2.5; 
            initialized.current = true;
        }

        const currentScale = group.current.scale.x;
        const step = THREE.MathUtils.lerp(currentScale, targetScale, delta * 2.0);
        group.current.scale.set(step, step, step);
        
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, delta * 2.0);
        group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, delta * 2.0);
        
        if (!cardStabilized && Math.abs(group.current.rotation.y) < 0.1) {
            setCardStabilized(true);
        }
    });

    const cardHeight = 3.9;
    const cardWidth = 6.1;

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
            <group ref={group} scale={0.001}> 
                
                <GraduationCap visible={cardStabilized} />

                <group>
                    {/* Các lớp vỏ thiệp */}
                    <RoundedBox args={[cardWidth + 0.25, cardHeight + 0.25, 0.04]} radius={0.2} smoothness={4} position={[0, 0, -0.06]}><MatteGoldMaterial /></RoundedBox>
                    <RoundedBox args={[cardWidth + 0.08, cardHeight + 0.08, 0.04]} radius={0.16} smoothness={4} position={[0, 0, -0.03]}><SatinGoldMaterial /></RoundedBox>
                    <RoundedBox args={[cardWidth, cardHeight, 0.08]} radius={0.12} smoothness={4} position={[0, 0, 0]}><DeepVelvetMaterial /></RoundedBox>

                    {/* MẶT SAU: NỀN ĐEN + VIDEO */}
                    <RandomVideoBack />

                    {/* MẶT TRƯỚC: CHỮ */}
                    <group position={[0, 0.1, 0.051]}> 
                        <Text position={[0, 1.0, 0]} fontSize={0.14} color="#999" letterSpacing={0.2} font={FONT_URL}>TRÂN TRỌNG KÍNH MỜI</Text>
                        <Text position={[0, 0.2, 0]} fontSize={0.62} font={FONT_URL} maxWidth={5.5} textAlign="center" lineHeight={1} material={textGoldMaterial}>{guestName}</Text>
                        <Text position={[0, -0.6, 0]} fontSize={0.14} color="#888" maxWidth={5} letterSpacing={0.05} font={FONT_URL} textAlign="center">Tới tham dự Lễ Tốt Nghiệp 2025</Text>
                        <Text position={[0, -1.2, 0]} fontSize={0.28} color="#eee" font={FONT_URL} letterSpacing={0.1}>{MY_NAME}</Text>
                    </group>

                    <Sparkles count={20} scale={[5.8, 3.6, 0.1]} size={1.2} speed={0.4} opacity={0.4} color="#ffd700" />
                </group>
            </group>
        </Float>
    );
}

// --- SCENE SETUP (Không đổi) ---
function SceneSetup() {
    return (
        <group>
            <Environment preset="city" blur={1} background={false} />
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5}  />
            <ambientLight intensity={0.4} />
            <spotLight position={[10, 10, 10]} angle={0.4} penumbra={1} intensity={6} color="#fff5e0" castShadow />
            <pointLight position={[-5, 0, 5]} intensity={2} color="#cceeff" />
            <pointLight position={[0, -5, 5]} intensity={1} color="#ffd700" />
        </group>
    )
}

// --- CÁC PHẦN UI KHÁC (GIỮ NGUYÊN) ---
const RotatePrompt = () => (
    <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md animate-in fade-in duration-500">
        <div className="relative mb-8"><Smartphone className="w-16 h-16 text-gray-500 animate-pulse" /><RotateCcw className="absolute -right-4 -top-2 w-10 h-10 text-[#d4af37] animate-spin-slow" /></div>
        <h3 className="text-[#d4af37] text-xl font-bold uppercase tracking-widest mb-2">Trải nghiệm tốt nhất</h3>
        <p className="text-gray-400 text-sm max-w-[250px] leading-relaxed">Vui lòng <span className="text-white font-bold">xoay ngang điện thoại</span> để xem thiệp mời trọn vẹn.</p>
    </div>
);
const PortalOverlay = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = 'unset'; }; }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};
const BackgroundMusic = ({ play }: { play: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    audioRef.current = new Audio(MUSIC_URL); audioRef.current.loop = true; audioRef.current.volume = 0.5;
    return () => { audioRef.current?.pause(); audioRef.current = null; };
  }, []);
  useEffect(() => { if (!audioRef.current) return; if (play) { audioRef.current.play().catch((e) => console.log("Autoplay blocked:", e)); } else { audioRef.current.pause(); } }, [play]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = isMuted; }, [isMuted]);
  if (!play) return null;
  return (
    <button onClick={() => setIsMuted(!isMuted)} className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5 backdrop-blur-md group">
      {isMuted ? <VolumeX size={24} className="text-gray-400 group-hover:text-white" /> : <Volume2 size={24} className="text-[#d4af37] animate-pulse" />}
    </button>
  );
};

interface InvitationProps {
    guestName?: string; guestId?: string; isConfirmed?: boolean; initialAttendance?: string; initialWish?: string;
}

export default function MobileInvitation({ guestName = "", guestId = "", isConfirmed = false, initialAttendance = "", initialWish = "" }: InvitationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [startIntro, setStartIntro] = useState(false);

  useEffect(() => {
    const checkOrientation = () => { setIsPortrait(window.innerHeight > window.innerWidth); };
    checkOrientation(); window.addEventListener('resize', checkOrientation); return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => { 
      if (isOpen) setStartIntro(true); 
      else setStartIntro(false);
  }, [isOpen]);

  return (
    <PortalOverlay>
      <div className="fixed inset-0 z-[99999] bg-[#050505] w-full h-[100dvh] overflow-hidden font-sans">
        <BackgroundMusic play={isOpen} />
        {isRsvpOpen && (<RsvpModal defaultName={guestName} guestId={guestId} hasConfirmed={isConfirmed} initialAttendance={initialAttendance} initialWish={initialWish} onClose={() => setIsRsvpOpen(false)} />)}

        {/* --- LANDING PAGE --- */}
        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-1000 ${isOpen ? 'opacity-0 pointer-events-none scale-150' : 'opacity-100 scale-100'}`}>
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
                        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fadd7d] to-[#aa8e26] drop-shadow-md leading-tight break-words max-w-full">{guestName}</h1>
                    </div>
                    <div className="w-20 h-[1px] bg-[#d4af37]/50" />
                    <div className="space-y-3">
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Tham dự sự kiện</p>
                        <h2 className="text-3xl text-white uppercase tracking-widest font-light">Lễ Tốt Nghiệp</h2>
                        <p className="text-[#d4af37] text-4xl font-extrabold pt-2">2025</p>
                    </div>
                    <button onClick={() => setIsOpen(true)} className="group relative px-10 py-4 bg-[#d4af37]/10 border border-[#d4af37]/50 rounded-full hover:bg-[#d4af37]/20 transition-all active:scale-95 mt-6 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                        <div className="flex items-center gap-3 text-[#d4af37] text-sm font-bold tracking-[0.2em] uppercase"><SparklesIcon size={18} /><span>Mở Thiệp</span></div>
                    </button>
                </div>
            </div>
        </div>

        {/* --- 3D SCENE --- */}
        {isOpen && (
            <div className="absolute inset-0 z-30 animate-in fade-in duration-1000">
                {isPortrait ? (<RotatePrompt />) : (
                    <>
                        <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5 backdrop-blur-md"><X size={28} /></button>
                        <button onClick={() => setIsRsvpOpen(true)} className={`absolute bottom-10 right-10 z-50 px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2 animate-bounce-slow ${isConfirmed ? "bg-green-600 text-white shadow-green-900/50" : "bg-[#d4af37] text-black shadow-[#d4af37]/50"}`}>{isConfirmed ? <RefreshCw size={18} /> : <Send size={18} />}<span>{isConfirmed ? "Đã xác nhận" : "Xác nhận tham dự"}</span></button>
                        <div className="absolute bottom-6 w-full text-center z-40 text-white/40 text-[10px] tracking-[0.4em] uppercase pointer-events-none">Chạm & Xoay để xem chi tiết</div>

                        <Canvas shadows camera={{ position: [0, 0, 15], fov: 30 }} gl={{ antialias: true, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.0 }} dpr={[1, 2]}>
                           <color attach="background" args={['#050505']} />
                           <SceneSetup />
                           <OrbitControls enableZoom={true} minDistance={10} maxDistance={25} autoRotate autoRotateSpeed={0.5} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
                           
                           <Suspense fallback={null}>
                             <HeroCard guestName={guestName} startIntro={startIntro} />
                           </Suspense>

                           <ContactShadows position={[0, -3.5, 0]} opacity={0.6} scale={20} blur={3} color="#000" />
                           <EffectComposer enableNormalPass={false}>
                                <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.4} radius={0.6} />
                                <Noise opacity={0.015} /> 
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