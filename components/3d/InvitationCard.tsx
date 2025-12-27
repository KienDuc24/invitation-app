"use client";

import { supabase } from "@/lib/supabase";
import { ContactShadows, Environment, Float, OrbitControls, RoundedBox, Sparkles, Stars, Text, useGLTF, useVideoTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { RotateCcw, Smartphone, Volume2, VolumeX, X } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";

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
    const targetScale = Math.min(viewport.width / 7, viewport.height / 4.5) * 0.7;
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
            <group ref={group} scale={0.001} rotation={[0, -Math.PI * 1.5, 0]}>
                <GraduationCap visible={cardStabilized} />
                <group>
                    <RoundedBox args={[6.35, 4.15, 0.04]} radius={0.2} smoothness={4} position={[0, 0, -0.06]}><MatteGoldMaterial /></RoundedBox>
                    <RoundedBox args={[6.1, 3.9, 0.08]} radius={0.12} smoothness={4} position={[0, 0, 0]}><DeepVelvetMaterial /></RoundedBox>
                    
                    <EventDetailsBack info={eventInfo} />

                    <group position={[0, 0.1, 0.051]}>
                        {/* Tiêu đề sự kiện */}
                        <Text position={[0, 1.5, 0]} fontSize={0.16} color="#ffd700" letterSpacing={0.15} font={FONT_URL}>LỄ TỐT NGHIỆP 2025</Text>
                        
                        <Text position={[0, 1.15, 0]} fontSize={0.14} color="#b8b8b8" letterSpacing={0.2} font={FONT_URL}>TRÂN TRỌNG KÍNH MỜI</Text>
                        
                        {/* Decorative line trên tên */}
                        <mesh position={[0, 0.75, 0]}>
                            <planeGeometry args={[3.2, 0.015]} />
                            <meshBasicMaterial color="#ffd700" />
                        </mesh>
                        
                        <Text position={[0, 0.25, 0]} fontSize={0.85} font={FONT_URL} maxWidth={5.5} textAlign="center" material={textGoldMaterial} letterSpacing={0.12}>{guestName}</Text>
                        
                        {/* Decorative line dưới tên */}
                        <mesh position={[0, -0.4, 0]}>
                            <planeGeometry args={[3.2, 0.015]} />
                            <meshBasicMaterial color="#ffd700" />
                        </mesh>

                        <Text position={[0, -0.85, 0]} fontSize={0.15} color="#d4af37" font={FONT_URL} letterSpacing={0.08}>Tới dự lễ tốt nghiệp của</Text>
                        <Text position={[0, -1.3, 0]} fontSize={0.35} color="#ffffff" font={FONT_URL} maxWidth={5} textAlign="center">{MY_NAME}</Text>
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
    }, [isConfirmed]);

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
        if (audioRef.current) audioRef.current.pause();
        if (onTabChange) onTabChange('chat'); 
    };

    return (
        <PortalOverlay>
            <div className="fixed inset-0 z-[99999] bg-[#050505] w-full h-[100dvh] overflow-hidden">
                {!isOpen ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000_100%)]" />
                        <div className="relative z-10 text-center space-y-8 px-6">
                            <div className="space-y-2">
                                <p className="text-sm tracking-widest text-[#999] uppercase font-sans">Lễ Tốt Nghiệp 2025</p>
                                <h1 className="text-4xl font-bold text-[#d4af37] uppercase font-sans leading-tight">{guestName}</h1>
                            </div>
                            <button 
                                onClick={() => setIsOpen(true)} 
                                className="px-12 py-4 bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-black font-black rounded-full font-sans uppercase tracking-widest shadow-lg shadow-[#d4af37]/30 hover:shadow-[#d4af37]/50 active:scale-95 transition-all duration-300 hover:scale-105"
                            >
                                XEM THIỆP 3D
                            </button>
                            <button onClick={handleCloseCard} className="block mx-auto text-gray-400 hover:text-gray-300 underline text-xs font-sans transition-colors">← Quay lại</button>
                        </div>
                    </div>
                ) : isPortrait ? (
                    <RotatePrompt onClose={handleCloseCard} />
                ) : (
                    <>
                        <button onClick={handleCloseCard} className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 shadow-lg hover:bg-white/20 hover:border-white/20 transition-all duration-300"><X size={28} /></button>
                        <button onClick={() => setIsMuted(!isMuted)} className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 shadow-lg hover:bg-white/20 transition-all duration-300">
                            {isMuted ? <VolumeX size={24} className="text-gray-400" /> : <Volume2 size={24} className="text-[#d4af37] animate-pulse" />}
                        </button>

                        <Canvas shadows camera={{ position: [0, 0, 15], fov: 30 }} dpr={[1, 2]}>
                            <color attach="background" args={['#050505']} />
                            <SceneSetup />
                            <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={0.5} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
                            <Suspense fallback={null}>
                                <HeroCard guestName={guestName} startIntro={true} eventInfo={eventInfo} />
                            </Suspense>
                            <ContactShadows position={[0, -3.5, 0]} opacity={0.6} scale={20} blur={3} color="#000" />
                            <EffectComposer enableNormalPass={false}>
                                <Bloom luminanceThreshold={1.2} intensity={0.4} radius={0.6} />
                                <Vignette offset={0.3} darkness={0.6} />
                            </EffectComposer>
                        </Canvas>
                    </>
                )}
            </div>
        </PortalOverlay>
    );
}