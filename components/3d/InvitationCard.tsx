"use client";

import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { createPortal } from "react-dom";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Text, Environment, Float, ContactShadows, RoundedBox, Sparkles, OrbitControls, Stars, useGLTF, useVideoTexture } from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { X, Sparkles as SparklesIcon, Smartphone, RotateCcw, Volume2, VolumeX, Send, RefreshCw, Heart, Loader2, CheckCircle, Frown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";

// --- CẤU HÌNH ---
const MY_NAME = "Bùi Đức Kiên";
const MUSIC_URL = "/music/bg-music.mp3";
const FONT_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxM.woff";
const CAP_MODEL_URL = "/models/cap.glb";

// --- CÁC COMPONENT 3D (Giữ nguyên) ---
function MatteGoldMaterial() { return <meshStandardMaterial color="#cfa436" roughness={0.5} metalness={0.7} envMapIntensity={1} />; }
function SatinGoldMaterial() { return <meshStandardMaterial color="#eacda3" roughness={0.3} metalness={0.9} envMapIntensity={1.5} />; }
function DeepVelvetMaterial() { return <meshStandardMaterial color="#020202" roughness={0.95} metalness={0.05} envMapIntensity={0.2} />; }
const textGoldMaterial = new THREE.MeshStandardMaterial({ color: "#e6c35c", metalness: 0.8, roughness: 0.4, toneMapped: true });

function VideoPlane({ url }: { url: string }) {
    const texture = useVideoTexture(url, { unsuspend: 'canplay', muted: true, loop: true, start: true, crossOrigin: 'Anonymous', playsInline: true });
    return <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />;
}

function RandomVideoBack() {
    const [randomUrl] = useState(() => `/media/catmi_${Math.floor(Math.random() * 5) + 1}.mp4`);
    return (
        <group position={[0, 0, -0.09]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0, 0]}><planeGeometry args={[6.2, 4.0]} /><meshBasicMaterial color="#000000" /></mesh>
            <mesh position={[0, 0, 0.01]}><planeGeometry args={[5.8, 3.6]} />
                <Suspense fallback={<meshBasicMaterial color="#111" />}><VideoPlane url={randomUrl} /></Suspense>
            </mesh>
        </group>
    );
}

function GraduationCap({ visible }: { visible: boolean }) {
  const { scene } = useGLTF(CAP_MODEL_URL);
  const capRef = useRef<THREE.Group>(null);
  const clone = useMemo(() => scene.clone(), [scene]);
  useMemo(() => { clone.traverse((child) => { if ((child as THREE.Mesh).isMesh) { (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.8, metalness: 0.2 }); } }); }, [clone]);
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
  return <group ref={capRef} position={[0, 7.0, 0]} rotation={[0.1, 0, 0]} scale={0.75}><primitive object={clone} /></group>;
}
useGLTF.preload(CAP_MODEL_URL);

// --- 3D CARD TEXT (Sửa lại vị trí tên Bùi Đức Kiên) ---
function HeroCard({ guestName, startIntro }: { guestName: string, startIntro: boolean }) {
    const group = useRef<THREE.Group>(null);
    const { viewport } = useThree();
    const targetScale = Math.min(viewport.width / 7, viewport.height / 4.5) * 0.65;
    const [cardStabilized, setCardStabilized] = useState(false);
    const initialized = useRef(false);

    useFrame((state, delta) => {
        if (!group.current || !startIntro) return;
        if (!initialized.current) { group.current.rotation.y = -Math.PI * 2.5; initialized.current = true; }
        const currentScale = group.current.scale.x;
        const step = THREE.MathUtils.lerp(currentScale, targetScale, delta * 2.0);
        group.current.scale.set(step, step, step);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, delta * 2.0);
        group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, delta * 2.0);
        if (!cardStabilized && Math.abs(group.current.rotation.y) < 0.1) { setCardStabilized(true); }
    });

    const cardHeight = 3.9;
    const cardWidth = 6.1;

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
            <group ref={group} scale={0.001}>
                <GraduationCap visible={cardStabilized} />
                <group>
                    <RoundedBox args={[cardWidth + 0.25, cardHeight + 0.25, 0.04]} radius={0.2} smoothness={4} position={[0, 0, -0.06]}><MatteGoldMaterial /></RoundedBox>
                    <RoundedBox args={[cardWidth + 0.08, cardHeight + 0.08, 0.04]} radius={0.16} smoothness={4} position={[0, 0, -0.03]}><SatinGoldMaterial /></RoundedBox>
                    <RoundedBox args={[cardWidth, cardHeight, 0.08]} radius={0.12} smoothness={4} position={[0, 0, 0]}><DeepVelvetMaterial /></RoundedBox>
                    <RandomVideoBack />
                    <group position={[0, 0.1, 0.051]}>
                        <Text position={[0, 1.0, 0]} fontSize={0.14} color="#999" letterSpacing={0.2} font={FONT_URL}>TRÂN TRỌNG KÍNH MỜI</Text>
                        <Text position={[0, 0.2, 0]} fontSize={0.62} font={FONT_URL} maxWidth={5.5} textAlign="center" lineHeight={1} material={textGoldMaterial}>{guestName}</Text>
                        
                        <Text position={[0, -0.6, 0]} fontSize={0.12} color="#888" maxWidth={5} letterSpacing={0.1} font={FONT_URL} textAlign="center">TỚI THAM DỰ LỄ TỐT NGHIỆP CỦA</Text>
                        <Text position={[0, -0.9, 0]} fontSize={0.25} color="#eee" font={FONT_URL} letterSpacing={0.1}>{MY_NAME}</Text>
                         <Text position={[0, -1.3, 0]} fontSize={0.15} color="#d4af37" font={FONT_URL} letterSpacing={0.2}>2025</Text>
                    </group>
                    <Sparkles count={20} scale={[5.8, 3.6, 0.1]} size={1.2} speed={0.4} opacity={0.4} color="#ffd700" />
                </group>
            </group>
        </Float>
    );
}

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

// --- COMPONENT CHÍNH ---
interface InvitationProps {
    guestName?: string; guestId?: string; isConfirmed?: boolean; initialAttendance?: string; initialWish?: string;
}

export default function MobileInvitation({ guestName = "", guestId = "", isConfirmed = false, initialAttendance = "", initialWish = "" }: InvitationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [startIntro, setStartIntro] = useState(false);
  
  // State RSVP
  const [rsvpState, setRsvpState] = useState<'idle' | 'input' | 'success'>('idle');
  const [attendance, setAttendance] = useState(initialAttendance || "");
  const [wish, setWish] = useState(initialWish || "");
  const [loading, setLoading] = useState(false);

  // --- LOGIC CẬP NHẬT TRẠNG THÁI ---
  useEffect(() => {
      if (isConfirmed) {
          setRsvpState('success');
          setAttendance(initialAttendance || "Có tham dự");
          setWish(initialWish || "");
      } else {
          setRsvpState('idle');
          setAttendance("");
          setWish("");
      }
  }, [isConfirmed, initialAttendance, initialWish]);

  useEffect(() => {
    const checkOrientation = () => { setIsPortrait(window.innerHeight > window.innerWidth); };
    checkOrientation(); window.addEventListener('resize', checkOrientation); return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => { if (isOpen) setStartIntro(true); else setStartIntro(false); }, [isOpen]);

  const handleSubmit = async () => {
    if (!attendance) return;
    setLoading(true);
    try {
        const { error } = await supabase.from('guests').update({
            is_confirmed: true, attendance, wish 
        }).eq('id', guestId);
        if (error) throw error;
        setRsvpState('success');
        if (attendance === "Có tham dự") {
            const duration = 3000; const animationEnd = Date.now() + duration;
            const interval: any = setInterval(function() {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                confetti({ particleCount: 50 * (timeLeft / duration), startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000000, colors: ['#d4af37', '#ffffff', '#fadd7d'], origin: { x: Math.random(), y: Math.random() - 0.2 } });
            }, 250);
        }
        setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
        alert("Có lỗi xảy ra, thử lại sau nhé!");
    } finally {
        setLoading(false);
    }
  };

  return (
    <PortalOverlay>
      <div className="fixed inset-0 z-[99999] bg-[#050505] w-full h-[100dvh] overflow-hidden font-sans">
        
        <BackgroundMusic play={isOpen} />

        {/* --- LANDING PAGE --- */}
        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-1000 ${isOpen ? 'opacity-0 pointer-events-none scale-150' : 'opacity-100 scale-100'}`}>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)]" />
             
             <div className="relative z-10 w-full max-w-sm mx-6 flex flex-col items-center gap-6">
                
                {/* === CARD CHÍNH (Vẽ lại khung bằng CSS) === */}
                <div className="relative w-full py-16 px-6 flex flex-col items-center justify-center">
                    
                    {/* KHUNG VIỀN MẢNH (Vẽ bằng DIV, không dùng ảnh nữa) */}
                    <div className="absolute inset-0 z-0 border border-[#d4af37]/40 rounded-sm">
                        {/* 4 Góc vuông trang trí */}
                        <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#d4af37]" />
                        <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#d4af37]" />
                        <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#d4af37]" />
                        <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#d4af37]" />
                    </div>

                    {/* NỘI DUNG */}
                    <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                        
                        {/* 1. Lời mời */}
                        <div className="space-y-4">
                            <p className="text-[#d4af37] text-[10px] tracking-[0.3em] uppercase opacity-80 font-medium">Trân trọng kính mời</p>
                            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fadd7d] to-[#aa8e26] drop-shadow-md uppercase tracking-wide">
                                {guestName}
                            </h1>
                        </div>

                        {/* 2. Đường kẻ ngăn cách */}
                        <div className="w-12 h-[1px] bg-[#d4af37]/40" />

                        {/* 3. Sự kiện & Tên chủ tiệc */}
                        <div className="space-y-1">
                             <p className="text-gray-400 text-[9px] tracking-[0.2em] uppercase">Tới tham dự sự kiện</p>
                             <h2 className="text-xl font-bold text-white uppercase tracking-widest leading-tight mt-1">
                                Lễ Tốt Nghiệp
                             </h2>
                             {/* Chữ "Của Bùi Đức Kiên" chuyển xuống đây */}
                             <p className="text-[#d4af37] text-sm font-medium italic py-1">
                                Của Bùi Đức Kiên
                             </p>
                             <p className="text-3xl font-black text-[#d4af37] drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] pt-2">
                                2025
                             </p>
                        </div>

                        {/* 4. Nút bấm */}
                        <div className="pt-2">
                            <button
                                onClick={() => setIsOpen(true)}
                                className="group relative px-8 py-3 bg-[#d4af37]/10 border border-[#d4af37]/50 rounded-full hover:bg-[#d4af37]/20 transition-all shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                            >
                                <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold tracking-[0.2em] uppercase">
                                    <SparklesIcon size={16} /><span>Mở Thiệp</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* KHUNG RSVP (Giữ nguyên) */}
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
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-green-500 font-bold uppercase text-[10px] tracking-wider">
                                <CheckCircle size={14} /> <span>Đã xác nhận: {attendance}</span>
                            </div>
                            <button onClick={() => setRsvpState('idle')} className="px-2 py-1 bg-[#222] rounded text-gray-400 hover:text-white text-[10px] font-bold flex items-center gap-1">
                                <RefreshCw size={10} /> Sửa
                            </button>
                        </div>
                    )}
                </div>

             </div>
        </div>

        {/* --- 3D SCENE --- */}
        {isOpen && (
            <div className="absolute inset-0 z-30 animate-in fade-in duration-1000">
                {isPortrait ? (<RotatePrompt />) : (
                    <>
                        <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5 backdrop-blur-md"><X size={28} /></button>

                        <Canvas shadows camera={{ position: [0, 0, 15], fov: 30 }} gl={{ antialias: true, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.0 }} dpr={[1, 2]}>
                           <color attach="background" args={['#050505']} />
                           <SceneSetup />
                           <OrbitControls enableZoom={true} minDistance={10} maxDistance={25} autoRotate autoRotateSpeed={0.5} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
                           <Suspense fallback={null}><HeroCard guestName={guestName} startIntro={startIntro} /></Suspense>
                           <ContactShadows position={[0, -3.5, 0]} opacity={0.6} scale={20} blur={3} color="#000" />
                           <EffectComposer enableNormalPass={false}><Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.4} radius={0.6} /><Noise opacity={0.015} /><Vignette offset={0.3} darkness={0.6} /></EffectComposer>
                        </Canvas>
                    </>
                )}
            </div>
        )}
      </div>
    </PortalOverlay>
  );
}