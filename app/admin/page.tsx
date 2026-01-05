 "use client";

import ChatGroup from "@/components/ChatGroup";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  CheckCircle,
  Hash,
  Heart,
  Info,
  Loader2,
  Lock,
  Map,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Users,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const dynamic = 'force-dynamic';

interface AdminGroupInfo {
    tag: string;
    name: string;
    avatar_url?: string;
    member_count?: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  
  const [guests, setGuests] = useState<any[]>([]);
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'wishes' | 'chat' | 'info'>('overview');

  const [chatGroups, setChatGroups] = useState<AdminGroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [unreadGroupTags, setUnreadGroupTags] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastUnreadTimes, setLastUnreadTimes] = useState<Record<string, string>>({});
  const [showChatSidebar, setShowChatSidebar] = useState<boolean>(false);
  
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [commentsByConfession, setCommentsByConfession] = useState<Record<string, any[]>>({});
  const [likersByConfession, setLikersByConfession] = useState<Record<string, any[]>>({});
  const [likesCounts, setLikesCounts] = useState<Record<string, number>>({});
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [selectedConfessionForLikers, setSelectedConfessionForLikers] = useState<any>(null);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  
  const [eventInfo, setEventInfo] = useState({
    time_info: "",
    location_info: "",
    contact_info: "",
    current_location: ""
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [adminUser, setAdminUser] = useState<any>(null);
  const [selectedConfessionDetail, setSelectedConfessionDetail] = useState<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const SECRET_PIN = "2025"; 

  // --- 1. KHỞI TẠO AUDIO ---
  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) audioContextRef.current = new AudioContext();
  }, []);

  const playNotiSound = () => {
    try {
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } catch (e) { console.error(e); }
  };

  // Helper function to parse image URLs (handles both old single URL and new JSON array format)
  const parseImageUrls = (imageData: string | null): string[] => {
    if (!imageData) return [];
    try {
      const parsed = JSON.parse(imageData);
      return Array.isArray(parsed) ? parsed : [imageData];
    } catch {
      return imageData ? [imageData] : [];
    }
  };

  // Fetch comments and likers when modal opens
  useEffect(() => {
    if (selectedConfessionDetail) {
      const fetchData = async () => {
        console.log('🔄 [Admin Modal Effect] Fetching data for confession:', String(selectedConfessionDetail.id).substring(0, 8));
        
        // Fetch comments via API endpoint (includes guest data)
        const response = await fetch(`/api/confessions/comments?confessionId=${selectedConfessionDetail.id}`);
        const data = await response.json();
        const comments = data.comments || [];
        
        console.log('💬 [Admin Modal Effect] Comments fetched:', comments?.length || 0);
        
        setCommentsByConfession(prev => ({
          ...prev,
          [selectedConfessionDetail.id]: comments || []
        }));

        // Fetch likers
        const { data: likes } = await supabase
          .from('confession_likes')
          .select('*, guests(id, name, avatar_url)')
          .eq('confession_id', selectedConfessionDetail.id);
        
        console.log('❤️ [Admin Modal Effect] User likes fetched:', likes?.length || 0);
        
        let likers: any[] = likes?.map((l: any) => l.guests) || [];
        
        // Add admin liker if exists
        if (selectedConfessionDetail.likes_count > 0 && adminUser) {
          console.log('✨ [Admin Modal Effect] Adding admin to likers');
          likers.unshift({
            id: adminUser.id,
            name: adminUser.name,
            avatar_url: adminUser.avatar_url,
            isAdmin: true
          });
        }
        
        // Update source of truth array
        console.log('📊 [Admin Modal Effect] Setting likers, total:', likers.length);
        setLikersByConfession(prev => ({
          ...prev,
          [selectedConfessionDetail.id]: likers
        }));
        
        // ✅ IMPORTANT: Also update likesCounts
        setLikesCounts(prev => ({
          ...prev,
          [selectedConfessionDetail.id]: likers.length
        }));
        
        console.log('✅ [Admin Modal Effect] Data fetched and set');
      };

      fetchData();
      
      // Setup realtime subscription for comments
      const commentsChannel = supabase.channel(`admin:comments:${selectedConfessionDetail.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'confession_comments', filter: `confession_id=eq.${selectedConfessionDetail.id}` },
          (payload: any) => {
            console.log('💬 [Admin Realtime] New comment inserted:', payload.new.id);
            // Refetch comments to get complete data with guest info
            (async () => {
              const response = await fetch(`/api/confessions/comments?confessionId=${selectedConfessionDetail.id}`);
              const data = await response.json();
              setCommentsByConfession(prev => ({
                ...prev,
                [selectedConfessionDetail.id]: data.comments || []
              }));
            })();
          }
        )
        .subscribe();
      
      return () => { supabase.removeChannel(commentsChannel); };
    }
  }, [selectedConfessionDetail?.id, adminUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECRET_PIN) {
      setIsAuthenticated(true);
      fetchData();
      if (audioContextRef.current) audioContextRef.current.resume();
    } else {
      alert("Sai mã PIN!");
      setPin("");
    }
  };

  // --- 2. FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    
    // Lấy thông tin sự kiện
    const { data: infoData } = await supabase.from('event_info').select('*').eq('id', 'main_event').single();
    if (infoData) {
        setEventInfo({
            time_info: infoData.time_info || "",
            location_info: infoData.location_info || "",
            contact_info: infoData.contact_info || "",
            current_location: infoData.current_location || ""
        });
    }

    const { data: guestsData } = await supabase.from('guests').select('*').order('is_confirmed', { ascending: false });
    const { data: confessionsData } = await supabase.from('confessions').select('*, guests(name, avatar_url)').order('created_at', { ascending: false });
    const { data: groupsInfoData } = await supabase.from('chat_groups').select('*');
    // Fetch group members để tính member_count chính xác
    const { data: groupMembersData } = await supabase.from('group_members').select('group_tag');

    const groupsInfoMap: Record<string, any> = {};
    groupsInfoData?.forEach((g: any) => { groupsInfoMap[g.tag] = g; });

    // Tính member_count từ group_members table
    const memberCountMap: Record<string, number> = {};
    groupMembersData?.forEach((m: any) => {
        memberCountMap[m.group_tag] = (memberCountMap[m.group_tag] || 0) + 1;
    });

    let adminData: any = null;
    
    if (guestsData) {
        setGuests(guestsData);
        const foundAdmin = guestsData.find((g: any) => g.tags && g.tags.includes('admin'));
        adminData = foundAdmin ? {
            id: foundAdmin.id, 
            name: foundAdmin.name,
            avatar_url: foundAdmin.avatar_url,
            shortName: "AD", 
            tags: foundAdmin.tags 
        } : { id: 'admin-host-id', name: 'Đức Kiên', avatar_url: null, shortName: 'DK', tags: ['admin'] };
        setAdminUser(adminData);

        const tags = new Set<string>(['general']);
        guestsData.forEach((g: any) => {
            if (g.tags && Array.isArray(g.tags)) {
                g.tags.forEach((t: string) => { if (t !== 'admin') tags.add(t); });
            }
        });

        const formattedGroups: AdminGroupInfo[] = Array.from(tags).map(tag => {
            const info = groupsInfoMap[tag];
            return {
                tag: tag,
                name: info?.name || (tag === 'general' ? 'Hội trường chính' : `Nhóm ${tag}`),
                avatar_url: info?.avatar_url,
                member_count: memberCountMap[tag] || 0
            };
        });
        setChatGroups(formattedGroups);

        // Fetch unread messages từ database
        if (adminData?.id) {
            const { data: adminGroupMembers } = await supabase
                .from('group_members')
                .select('group_tag, last_viewed_at')
                .eq('guest_id', adminData.id);

            const unreadMap: Record<string, number> = {};
            const unreadTags: string[] = [];
            const unreadTimesMap: Record<string, string> = {};

            // Tính unread cho từng nhóm
            for (const groupMember of adminGroupMembers || []) {
                const { data: messages } = await supabase
                    .from('messages')
                    .select('created_at', { count: 'exact' })
                    .eq('group_tag', groupMember.group_tag)
                    .gt('created_at', groupMember.last_viewed_at || '1970-01-01');
                
                const count = messages?.length || 0;
                if (count > 0) {
                    unreadMap[groupMember.group_tag] = count;
                    unreadTags.push(groupMember.group_tag);
                    
                    // Fetch tin nhắn chưa đọc mới nhất
                    const { data: lastMsg } = await supabase
                        .from('messages')
                        .select('created_at')
                        .eq('group_tag', groupMember.group_tag)
                        .gt('created_at', groupMember.last_viewed_at || '1970-01-01')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    
                    if (lastMsg?.created_at) {
                        unreadTimesMap[groupMember.group_tag] = lastMsg.created_at;
                    }
                }
            }

            setUnreadCounts(unreadMap);
            setUnreadGroupTags(unreadTags);
            setLastUnreadTimes(unreadTimesMap);
            console.log('💬 [Admin] Unread messages:', unreadMap);
        }
    }
    // 🔄 Set confessions to state - CRITICAL FIX
    if (confessionsData) {
      console.log('📝 [Admin] Confessions fetched:', confessionsData.length);
      setConfessions(confessionsData);
    } else {
      console.log('⚠️ [Admin] No confessions data');
      setConfessions([]);
    }

    // Fetch comments and likes for all confessions - batch queries
    if (confessionsData && adminData) {
      const confessionIds = confessionsData.map(c => c.id);
      console.log('🔄 [Admin] Fetching comments and likes for confessions:', confessionIds.length);
      
      // Batch fetch ALL comments at once
      const { data: allComments } = await supabase
        .from('confession_comments')
        .select('*, guests(id, name, avatar_url)')
        .in('confession_id', confessionIds);
      
      console.log('💬 [Admin] Comments fetched:', allComments?.length || 0);
      
      // Batch fetch ALL likes at once with guest data
      const { data: allLikes } = await supabase
        .from('confession_likes')
        .select('*, guests(id, name, avatar_url)')
        .in('confession_id', confessionIds);
      
      console.log('❤️ [Admin] Likes fetched:', allLikes?.length || 0);
      
      // Calculate on client side
      const commentsMap: Record<string, any[]> = {};
      const likersByConfessionMap: Record<string, any[]> = {};
      const likesCountsMap: Record<string, number> = {};
      const commentsCountMap: Record<string, number> = {};
      
      confessionsData.forEach((confession) => {
        // Get comments for this confession
        const confComments = allComments?.filter(c => c.confession_id === confession.id) || [];
        commentsMap[confession.id] = confComments;
        commentsCountMap[confession.id] = confComments.length + (confession.admin_comment ? 1 : 0);

        // Build likers array with full user data
        const userLikers = allLikes
          ?.filter(l => l.confession_id === confession.id)
          .map((l: any) => l.guests) || [];
        
        // Add admin if liked
        if (confession.likes_count > 0) {
          const adminLiker = {
            id: adminData.id,
            name: adminData.name,
            avatar_url: adminData.avatar_url,
            isAdmin: true
          };
          likersByConfessionMap[confession.id] = [adminLiker, ...userLikers];
          likesCountsMap[confession.id] = userLikers.length + 1; // user likes + admin
          console.log(`👥 [Admin] Confession ${String(confession.id).substring(0, 8)}: ${userLikers.length} users + admin = ${likesCountsMap[confession.id]}`);
        } else {
          likersByConfessionMap[confession.id] = userLikers;
          likesCountsMap[confession.id] = userLikers.length;
          console.log(`👥 [Admin] Confession ${String(confession.id).substring(0, 8)}: ${userLikers.length} users`);
        }
      });
      
      console.log('📊 [Admin] Likers map built:', Object.keys(likersByConfessionMap).length);
      console.log('📊 [Admin] Likes counts:', likesCountsMap);
      console.log('💬 [Admin] Comments counts:', commentsCountMap);
      setCommentsByConfession(commentsMap);
      setLikersByConfession(likersByConfessionMap);
      setLikesCounts(likesCountsMap);
      // Store comments count too for display
    }
    
    console.log('✅ [Admin] Data loading complete');
    setLoading(false);
  };

  const fetchLikers = async (confessionId: string) => {
    try {
      console.log('🔄 [Admin fetchLikers] Fetching likers for:', confessionId);
      
      const { data: likes } = await supabase
        .from('confession_likes')
        .select('*, guests(id, name, avatar_url)')
        .eq('confession_id', confessionId);
      
      console.log('❤️ [Admin fetchLikers] User likes fetched:', likes?.length || 0);
      
      let likersList: any[] = likes?.map((l: any) => l.guests) || [];
      
      // Add admin liker if exists
      const confession = confessions.find(c => c.id === confessionId);
      console.log('🔍 [Admin fetchLikers] Found confession:', confession?.id, 'likes_count:', confession?.likes_count);
      
      if (confession?.likes_count > 0 && adminUser) {
        console.log('✨ [Admin fetchLikers] Adding admin to likers');
        likersList.unshift({
          id: 'admin',
          name: adminUser.name,
          avatar_url: adminUser.avatar_url,
          isAdmin: true
        });
      } else if (confession?.likes_count > 0 && !adminUser) {
        console.log('⚠️ [Admin fetchLikers] Admin like flag set but adminUser not loaded');
      }
      
      console.log('📊 [Admin fetchLikers] Final likers list:', likersList.length);
      setLikersByConfession(prev => ({ ...prev, [confessionId]: likersList }));
      
      // Calculate total likes count
      const totalLikes = likersList.length;
      console.log('💯 [Admin fetchLikers] Total likes:', totalLikes);
      setLikesCounts(prev => ({ ...prev, [confessionId]: totalLikes }));
      
      console.log('✅ [Admin fetchLikers] Likers fetched and set');
    } catch (error) {
      console.error('❌ [Admin fetchLikers] Error:', error);
    }
  };

  // Helper function to get like count for a confession
  const getLikeCount = (confessionId: string): number => {
    return likesCounts[confessionId] || 0;
  };

  // Helper function to get comment count for a confession
  const getCommentCount = (confessionId: string): number => {
    const confession = confessions.find(c => c.id === confessionId);
    const userComments = commentsByConfession[confessionId]?.length || 0;
    const adminComment = confession?.admin_comment ? 1 : 0;
    return userComments + adminComment;
  };

  // --- 3. TƯƠNG TÁC LƯU BÚT ---
  const handleLikeConfession = async (id: string, currentLikes: number) => {
    try {
      console.log('❤️ [Admin handleLike] Starting like toggle for:', id, 'current:', currentLikes);
      
      // Toggle: nếu đã like thì unlike, chưa like thì like
      const newLikesCount = (currentLikes || 0) > 0 ? (currentLikes || 0) - 1 : 1;
      console.log('📊 [Admin handleLike] New likes_count:', newLikesCount);
      
      const { error } = await supabase.from('confessions').update({ likes_count: newLikesCount }).eq('id', id);
      if (error) throw error;
      
      console.log('✅ [Admin handleLike] Updated in DB, updating state');
      setConfessions(prev => prev.map(c => c.id === id ? {...c, likes_count: newLikesCount} : c));
      console.log('✅ [Admin handleLike] State updated');
    } catch (e) {
      console.error("❌ [Admin handleLike] Error:", e);
      alert("Lỗi cập nhật!");
    }
  };

  const fetchComments = async (confessionId: string) => {
    try {
      console.log('💬 [Admin fetchComments] Starting fetch for confession:', confessionId);
      
      const response = await fetch(`/api/confessions/comments?confessionId=${confessionId}`);
      
      if (!response.ok) {
        console.error('❌ [Admin fetchComments] Response NOT OK - status:', response.status);
        return;
      }
      
      const data = await response.json();
      const comments = data.comments || [];
      console.log('✅ [Admin fetchComments] Comments fetched:', comments?.length || 0, 'items');
      
      // Store comments in state
      setCommentsByConfession(prev => ({
        ...prev,
        [confessionId]: comments
      }));
      
    } catch (error) {
      console.error('❌ [Admin fetchComments] Error:', error);
    }
  };

  const handleCommentConfession = async (confessionId: string, content: string) => {
    if (!content.trim()) return;
    try {
      const { error } = await supabase.from('confession_comments').insert({
        confession_id: confessionId,
        guest_id: adminUser.id,
        content: content
      });
      if (error) throw error;

      // Refresh comments via API
      await fetchComments(confessionId);

      // Update modal if it's open
      if (selectedConfessionDetail && selectedConfessionDetail.id === confessionId) {
        setSelectedConfessionDetail({...selectedConfessionDetail});
      }
    } catch (e) {
      console.error("Lỗi comment:", e);
      alert("Lỗi cập nhật!");
    }
  };

  const getAvatarUrl = (avatarUrl: string | null, name: string) => {
    if (avatarUrl) return avatarUrl;
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=d4af37,111111`;
  };

  const saveEventInfo = async () => {
    setIsSavingInfo(true);
    try {
      await supabase.from('event_info').upsert({ id: 'main_event', ...eventInfo, updated_at: new Date().toISOString() });
      alert("Cập nhật thành công!");
    } catch (e) { alert("Lỗi lưu dữ liệu!"); }
    finally { setIsSavingInfo(false); }
  };

  // --- 4. REALTIME THÔNG BÁO ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const channel = supabase.channel('admin-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id !== adminUser?.id) {
          playNotiSound();
          const groupTag = payload.new.group_tag;
          
          // Track unread groups
          setUnreadGroupTags(prev => [...new Set([...prev, groupTag])]);
          
          // Track unread message count per group
          if (selectedGroup !== groupTag) {
            setUnreadCounts(prev => ({
              ...prev,
              [groupTag]: (prev[groupTag] || 0) + 1
            }));
          }
          
          // Update lastUnreadTime để sorting hoạt động
          setLastUnreadTimes(prev => ({
            ...prev,
            [groupTag]: payload.new.created_at
          }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
        playNotiSound();
        fetchData(); // Reload lưu bút mới
      })
      // --- REALTIME LIKES ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confession_likes' }, async (payload) => {
        console.log('➕ [Admin Realtime] User liked:', payload.new.confession_id, 'by:', payload.new.guest_id);
        
        // Fetch user data
        const { data: user } = await supabase
          .from('guests')
          .select('id, name, avatar_url')
          .eq('id', payload.new.guest_id)
          .single();
        
        if (user) {
          // Add user to likers array
          setLikersByConfession(prev => ({
            ...prev,
            [payload.new.confession_id]: [...(prev[payload.new.confession_id] || []), user]
          }));
          
          // Update like counts
          setLikesCounts(prev => ({
            ...prev,
            [payload.new.confession_id]: ((prev[payload.new.confession_id] || 0) + 1)
          }));
          console.log('✨ [Admin Realtime] Updated likers for', payload.new.confession_id);
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'confession_likes' }, (payload) => {
        console.log('➖ [Admin Realtime] User unliked:', payload.old.confession_id, 'by:', payload.old.guest_id);
        
        // Remove user from likers array
        setLikersByConfession(prev => {
          const existing = prev[payload.old.confession_id] || [];
          const newArray = existing.filter(l => l.id !== payload.old.guest_id);
          
          // Update like counts
          setLikesCounts(prev => ({
            ...prev,
            [payload.old.confession_id]: newArray.length
          }));
          
          return {
            ...prev,
            [payload.old.confession_id]: newArray
          };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, adminUser]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111] border border-[#333] p-10 rounded-[2.5rem] text-center space-y-6 shadow-2xl">
          <Lock className="text-[#d4af37] mx-auto" size={40} />
          <h1 className="text-xl font-bold text-white uppercase tracking-widest font-sans">Khu vực Admin</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Mã PIN..." className="w-full bg-[#0a0a0a] border border-[#333] text-white text-center text-2xl p-4 rounded-2xl focus:border-[#d4af37] outline-none font-sans" autoFocus />
            <button className="w-full bg-[#d4af37] text-black font-bold py-4 rounded-2xl uppercase tracking-widest hover:bg-[#b89628] transition-all">Mở khóa</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-20">
      {/* Header tương đồng GuestDashboard */}
      <div className="p-3 md:p-6 bg-gradient-to-b from-[#1a1a1a] to-transparent sticky top-0 z-50 backdrop-blur-md border-b border-[#333]/30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
             <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-[#d4af37] flex items-center justify-center text-black font-bold text-xs md:text-sm">AD</div>
             <div>
                <h1 className="text-sm md:text-lg font-bold text-[#d4af37] uppercase tracking-wider">Quản trị viên</h1>
                <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold">Hệ thống thiệp</p>
             </div>
          </div>
          <button onClick={fetchData} className="p-2 bg-[#222] rounded-full text-[#d4af37] hover:bg-[#333] transition-colors">
             {loading ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16} />}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 md:p-4 space-y-6 md:space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <StatCard label="Tổng khách" value={guests.filter(g => !g.tags?.includes('admin')).length} icon={<Users size={16}/>} color="text-blue-400" bg="bg-blue-400/10" />
          <StatCard label="Tham dự" value={guests.filter(g => g.is_confirmed && g.attendance === 'Có tham dự').length} icon={<CheckCircle size={16}/>} color="text-green-400" bg="bg-green-400/10" />
          <StatCard label="Lưu bút" value={confessions.length} icon={<MessageSquare size={16}/>} color="text-[#d4af37]" bg="bg-[#d4af37]/10" />
          <StatCard label="Chưa rep" value={guests.filter(g => !g.is_confirmed && !g.tags?.includes('admin')).length} icon={<Loader2 size={16}/>} color="text-yellow-400" bg="bg-yellow-400/10" />
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 md:gap-4 border-b border-[#222] overflow-x-auto no-scrollbar">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Khách" />
            <TabButton active={activeTab === 'wishes'} onClick={() => setActiveTab('wishes')} label="Lưu bút" badge={confessions.length} />
            <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} label="Chat" badge={Object.values(unreadCounts).reduce((a, b) => a + b, 0)} />
            <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Thông tin" />
        </div>

        {/* --- TAB: LƯU BÚT (TÍNH NĂNG MỚI) --- */}
        {activeTab === 'wishes' && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 animate-in slide-in-from-bottom-4">
             {confessions.length === 0 ? <p className="text-gray-500 italic text-center col-span-full py-20">Chưa có ai gửi tâm thư...</p> :
               confessions.map((item) => (
                 <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl md:rounded-[2rem] overflow-hidden flex flex-col shadow-xl group hover:border-[#d4af37]/40 transition-all cursor-pointer" onClick={() => {
                   setSelectedConfessionDetail(item);
                   setCurrentImageIndex(0);
                 }}>
                     {parseImageUrls(item.image_url).length > 0 && (
                       <div className="relative bg-black h-40 md:h-48">
                         <img src={parseImageUrls(item.image_url)[0]} className="w-full h-40 md:h-48 object-cover border-b border-[#222]" alt=""/>
                         {parseImageUrls(item.image_url).length > 1 && (
                           <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                             {parseImageUrls(item.image_url).length}
                           </div>
                         )}
                       </div>
                     )}
                     <div className="p-3 md:p-5 flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <img 
                              src={getAvatarUrl(item.guests?.avatar_url || null, item.guests?.name || 'Guest')}
                              alt={item.guests?.name}
                              className="w-9 md:w-10 h-9 md:h-10 rounded-full border-2 border-black shadow-lg flex-shrink-0 object-cover"
                            />
                                <div className="min-w-0">
                                    <p className="font-bold text-xs md:text-sm text-[#fadd7d] truncate">{item.guests?.name || "Ẩn danh"}</p>
                                    <p className="text-[9px] md:text-[10px] text-gray-500 font-mono">{new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            {item.visibility === 'everyone' ? (
                                <span className="text-[10px] md:text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full whitespace-nowrap font-bold flex-shrink-0">👥</span>
                            ) : (
                                <span className="text-[10px] md:text-xs bg-gray-700/40 text-gray-300 px-2 py-1 rounded-full whitespace-nowrap font-bold flex-shrink-0">🔒</span>
                            )}
                        </div>
                        <p className="text-gray-300 text-xs md:text-sm italic leading-relaxed mb-4 md:mb-6 line-clamp-3">{item.content}</p>
                        
                        {/* Social Media Style Footer */}
                        <div className="mt-auto pt-3 md:pt-4 border-t border-[#222] space-y-2 md:space-y-3">
                          {/* Interaction Stats */}
                          <div className="flex items-center justify-between text-[9px] md:text-xs text-gray-500 font-bold px-0">
                            <div className="flex items-center gap-1">
                              <Heart size={12} className="text-red-500" />
                              <span>{(likesCounts[item.id] || 0) > 0 ? `${likesCounts[item.id]}` : '0'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle size={12} className="text-blue-400" />
                              <span>{getCommentCount(item.id)}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeConfession(item.id, item.likes_count);
                                setConfessions(confessions.map(c => c.id === item.id ? {...c, likes_count: (c.likes_count || 0) > 0 ? (c.likes_count || 0) - 1 : 1} : c));
                              }} 
                              className="flex-1 flex items-center justify-center gap-1 text-[9px] md:text-xs font-bold py-2 rounded-lg transition-all bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95"
                            >
                              <Heart size={12} className={item.likes_count > 0 ? "fill-red-500 text-red-500" : ""} /> 
                              {item.likes_count > 0 ? 'Đã' : 'Thích'}
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedConfessionDetail(item);
                                setCurrentImageIndex(0);
                              }} 
                              className="flex-1 flex items-center justify-center gap-1 text-[9px] md:text-xs font-bold py-2 rounded-lg transition-all bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 active:scale-95"
                            >
                              <MessageCircle size={12} /> Rep
                            </button>
                          </div>
                        </div>
                     </div>
                 </div>
               ))
             }
           </div>
        )}

        {/* --- TAB: THÔNG TIN LỄ (GIAO DIỆN MỚI) --- */}
        {activeTab === 'info' && (
            <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 animate-in slide-in-from-bottom-4">
                <div className="bg-[#111] border border-[#333] p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 md:gap-3 border-b border-[#222] pb-4 md:pb-6">
                        <div className="w-10 md:w-12 h-10 md:h-12 bg-[#d4af37]/10 rounded-xl md:rounded-2xl flex items-center justify-center border border-[#d4af37]/20 flex-shrink-0">
                            <Info className="text-[#d4af37]" size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm md:text-lg font-bold text-white tracking-tight uppercase">Cấu hình thiệp</h3>
                            <p className="text-[8px] md:text-xs text-gray-500">Nội dung hiển thị cho khách</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 font-sans">
                        <InputField label="Thời gian" value={eventInfo.time_info} icon={<Calendar size={14}/>} placeholder="08:00" onChange={v => setEventInfo({...eventInfo, time_info: v})} />
                        <InputField label="Liên hệ" value={eventInfo.contact_info} icon={<Phone size={14}/>} placeholder="SĐT..." onChange={v => setEventInfo({...eventInfo, contact_info: v})} />
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2 px-1"><MapPin size={12}/> Địa điểm</label>
                            <textarea value={eventInfo.location_info || ""} onChange={e => setEventInfo({...eventInfo, location_info: e.target.value})} className="w-full bg-black border border-[#222] p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm focus:border-[#d4af37]/50 outline-none h-20 md:h-24 resize-none transition-all placeholder:text-gray-800" placeholder="Địa chỉ..." />
                        </div>
                        <InputField label="Vị trí hiện tại" value={eventInfo.current_location} icon={<Map size={14}/>} placeholder="Sảnh..." full onChange={v => setEventInfo({...eventInfo, current_location: v})} />
                    </div>

                    <button onClick={saveEventInfo} disabled={isSavingInfo} className="w-full bg-[#d4af37] text-black font-black py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-[#d4af37]/10 disabled:opacity-50 uppercase tracking-widest text-xs md:text-sm">
                        {isSavingInfo ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} Lưu
                    </button>
                </div>
            </div>
        )}

        {/* Các Tab khác (Overview/Chat) giữ logic cũ */}
        {activeTab === 'overview' && (
           <div className="bg-[#111] border border-[#333] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl animate-in fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm text-left">
                  <thead className="text-[9px] md:text-[10px] text-gray-500 uppercase bg-[#1a1a1a] tracking-widest">
                    <tr><th className="px-3 md:px-6 py-3 md:py-5">Tên</th><th className="px-3 md:px-6 py-3 md:py-5">Nhóm</th><th className="px-3 md:px-6 py-3 md:py-5">Trạng thái</th><th className="px-3 md:px-6 py-3 md:py-5 hidden md:table-cell">Lời nhắn</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {guests.filter(g => !g.tags?.includes('admin')).map((guest) => (
                      <tr key={guest.id} className="hover:bg-[#d4af37]/5 transition-colors">
                        <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-xs md:text-sm italic truncate">{guest.name}</td>
                        <td className="px-3 md:px-6 py-3 md:py-4"><span className="bg-black border border-[#333] px-2 py-0.5 md:py-1 rounded text-[8px] md:text-[10px] text-gray-500 uppercase font-bold whitespace-nowrap">{guest.tags?.[0] || 'Khách'}</span></td>
                        <td className="px-3 md:px-6 py-3 md:py-4 font-bold text-xs">{guest.is_confirmed ? (guest.attendance === 'Có tham dự' ? <span className="text-green-500">Có</span> : <span className="text-red-500">Bận</span>) : <span className="text-gray-600">-</span>}</td>
                        <td className="px-3 md:px-6 py-3 md:py-4 text-gray-500 italic truncate max-w-xs hidden md:table-cell text-[9px] md:text-xs">{guest.wish || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}

        {activeTab === 'chat' && !selectedGroup && (
            <div className="space-y-2 md:space-y-3 animate-in fade-in">
              {chatGroups.length === 0 ? (
                <p className="text-gray-500 italic text-center py-20">Chưa có nhóm nào...</p>
              ) : (
                (() => {
                  // Sắp xếp nhóm: nhóm có tin mới lên đầu, rồi sắp xếp theo thời gian tin nhắn mới nhất
                  const sorted = [...chatGroups].sort((a, b) => {
                    const aHasUnread = unreadGroupTags.includes(a.tag);
                    const bHasUnread = unreadGroupTags.includes(b.tag);
                    
                    // Nếu chỉ một bên có tin chưa đọc, nó lên đầu
                    if (aHasUnread !== bHasUnread) {
                      return aHasUnread ? -1 : 1;
                    }
                    
                    // Nếu cả hai đều có tin chưa đọc, sắp xếp theo thời gian tin nhắn mới nhất
                    if (aHasUnread && bHasUnread) {
                      const aTime = lastUnreadTimes[a.tag] ? new Date(lastUnreadTimes[a.tag]).getTime() : 0;
                      const bTime = lastUnreadTimes[b.tag] ? new Date(lastUnreadTimes[b.tag]).getTime() : 0;
                      return bTime - aTime; // Tin nhắn mới nhất lên đầu
                    }
                    
                    return 0;
                  });
                  return sorted.map(group => {
                    const hasUnread = unreadGroupTags.includes(group.tag);
                    const unreadCount = unreadCounts[group.tag] || 0;
                    return (
                      <button
                        key={group.tag}
                        onClick={() => {
                          setSelectedGroup(group.tag);
                          setUnreadGroupTags(prev => prev.filter(t => t !== group.tag));
                          setUnreadCounts(prev => ({ ...prev, [group.tag]: 0 }));
                        }}
                        className={`w-full relative border rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 transition-all hover:scale-[1.01] active:scale-95 text-left flex items-start gap-3 md:gap-4 ${hasUnread ? 'bg-gradient-to-r from-[#1a4d2e]/40 to-[#0a0a0a] border-[#10b981]/50 shadow-lg shadow-[#10b981]/10' : 'bg-[#111] border-[#333] hover:border-[#d4af37]/40'}`}
                      >
                        {/* Avatar */}
                        <div className={`w-12 md:w-14 h-12 md:h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border-2 ${hasUnread ? 'border-[#10b981] bg-[#0a3d1f]/60' : 'border-[#333] bg-[#0a0a0a]'}`}>
                          {group.avatar_url ? (
                            <img src={group.avatar_url} className="w-full h-full object-cover" alt={group.name} />
                          ) : (
                            <Hash size={24} className="text-gray-500" />
                          )}
                        </div>

                        {/* Group Details */}
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-bold text-sm md:text-base ${hasUnread ? 'text-[#10b981]' : 'text-white'}`}>
                              {group.name}
                            </h3>
                            <p className="text-[8px] md:text-[9px] text-gray-500 uppercase font-bold tracking-tight">#{group.tag}</p>
                          </div>
                          <p className="text-[8px] md:text-xs text-gray-400 mt-1">
                            👥 {group.member_count || 0} thành viên
                          </p>
                        </div>

                        {/* Unread indicator with count */}
                        {hasUnread && unreadCount > 0 && (
                          <div className="flex items-center justify-center bg-red-600 w-7 h-7 rounded-full flex-shrink-0 mt-1">
                            <span className="text-white font-bold text-xs">{unreadCount}</span>
                          </div>
                        )}
                      </button>
                    );
                  });
                })()
              )}
            </div>
        )}

        {activeTab === 'chat' && selectedGroup && (
            <div className="fixed inset-0 z-[100] bg-[#050505] min-h-screen flex flex-col animate-in slide-in-from-right-10 duration-300">
                <div className="flex-1 flex flex-col overflow-hidden">
                    {adminUser ? (
                        <>
                            <ChatGroup key={selectedGroup} currentUser={adminUser} groupTag={selectedGroup} onBack={() => {
                                // Mark as read khi đóng chat
                                if (adminUser?.id) {
                                    supabase.from('group_members')
                                        .update({ last_viewed_at: new Date().toISOString() })
                                        .eq('guest_id', adminUser.id)
                                        .eq('group_tag', selectedGroup)
                                        .then(() => {
                                            setUnreadGroupTags(prev => prev.filter(t => t !== selectedGroup));
                                            setUnreadCounts(prev => ({ ...prev, [selectedGroup]: 0 }));
                                        });
                                }
                                setSelectedGroup('');
                            }} onLeaveGroup={() => {}} />
                        </>
                    ) : <Loader2 className="animate-spin mx-auto mt-20 text-[#d4af37]"/>}
                </div>
            </div>
        )}
      </div>

      {/* MODAL CHI TIẾT LƯU BÚT */}
      {selectedConfessionDetail && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[95vh] bg-[#111] border border-[#333] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#222] bg-[#0a0a0a] flex-shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[#d4af37] font-bold text-xs md:text-sm uppercase tracking-widest truncate">{selectedConfessionDetail.guests?.name || 'Ẩn danh'}</h3>
                  {selectedConfessionDetail.visibility === 'everyone' ? (
                    <span className="text-[9px] md:text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0">👥</span>
                  ) : (
                    <span className="text-[9px] md:text-xs bg-gray-700/40 text-gray-300 px-2 py-0.5 rounded-full font-bold flex-shrink-0">🔒</span>
                  )}
                </div>
                <p className="text-[8px] md:text-xs text-gray-500 mt-1">{new Date(selectedConfessionDetail.created_at).toLocaleDateString('vi-VN')}</p>
              </div>
              <button onClick={() => setSelectedConfessionDetail(null)} className="p-1.5 md:p-2 hover:bg-[#222] rounded-full transition-colors flex-shrink-0">
                <X size={18} className="text-gray-400"/>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Ảnh */}
              {parseImageUrls(selectedConfessionDetail.image_url).length > 0 && (
                <div className="relative bg-black flex-shrink-0">
                  {(() => {
                    const images = parseImageUrls(selectedConfessionDetail.image_url);
                    return (
                      <>
                        <img 
                          src={images[currentImageIndex]} 
                          className="w-full h-auto max-h-[40vh] md:max-h-[50%] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          alt={`Kỷ niệm ${currentImageIndex + 1}`}
                          onClick={() => {
                            setPreviewImages(images);
                            setCurrentPreviewIndex(currentImageIndex);
                            setShowImagePreviewModal(true);
                          }}
                        />
                        {images.length > 1 && (
                          <>
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-[9px] md:text-xs font-bold">
                              {currentImageIndex + 1}/{images.length}
                            </div>
                            <div className="absolute bottom-2 left-2 flex gap-1 md:gap-2">
                              <button 
                                onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                                className="bg-white/20 hover:bg-white/30 text-white px-1.5 md:px-2 py-1 rounded text-xs font-bold transition-colors"
                              >
                                ←
                              </button>
                              <button 
                                onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                                className="bg-white/20 hover:bg-white/30 text-white px-1.5 md:px-2 py-1 rounded text-xs font-bold transition-colors"
                              >
                                →
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Nội dung */}
              <div className="p-3 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  <p className="text-gray-400 text-[9px] md:text-xs uppercase font-black tracking-widest">Nội dung</p>
                  <p className="text-gray-100 text-sm md:text-lg leading-relaxed italic">{selectedConfessionDetail.content}</p>
                </div>

                {/* Thông tin người gửi */}
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-black/40 rounded-xl border border-[#222]">
                  <img 
                    src={getAvatarUrl(selectedConfessionDetail.guests?.avatar_url || null, selectedConfessionDetail.guests?.name || 'Guest')}
                    alt={selectedConfessionDetail.guests?.name}
                    className="w-9 md:w-12 h-9 md:h-12 rounded-full border-2 border-black flex-shrink-0 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-xs md:text-sm text-[#fadd7d] truncate">{selectedConfessionDetail.guests?.name || 'Ẩn danh'}</p>
                    <p className="text-[8px] md:text-xs text-gray-500">Gửi vào {new Date(selectedConfessionDetail.created_at).toLocaleTimeString('vi-VN')}</p>
                  </div>
                </div>

                {/* LIKE & COMMENT SECTION - Social Media Style */}
                <div className="space-y-3 md:space-y-4 border-t border-[#222] pt-3 md:pt-4">
                  {/* Like Count & Likers */}
                  <div className="space-y-2">
                    <div className="text-gray-500 text-[9px] md:text-xs uppercase font-bold flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newAdminLikeStatus = (selectedConfessionDetail.likes_count || 0) > 0 ? 0 : 1;
                          handleLikeConfession(selectedConfessionDetail.id, selectedConfessionDetail.likes_count);
                          const newTotalCount = (likesCounts[selectedConfessionDetail.id] || 0) + (newAdminLikeStatus - (selectedConfessionDetail.likes_count || 0));
                          setSelectedConfessionDetail({...selectedConfessionDetail, likes_count: newAdminLikeStatus});
                          setLikesCounts(prev => ({...prev, [selectedConfessionDetail.id]: newTotalCount}));
                          
                          if (newAdminLikeStatus === 1) {
                            setLikersByConfession(prev => ({
                              ...prev,
                              [selectedConfessionDetail.id]: [
                                {
                                  id: adminUser.id,
                                  name: adminUser.name,
                                  avatar_url: adminUser.avatar_url,
                                  isAdmin: true
                                },
                                ...(prev[selectedConfessionDetail.id] || []).filter(l => !l.isAdmin)
                              ]
                            }));
                          } else {
                            setLikersByConfession(prev => ({
                              ...prev,
                              [selectedConfessionDetail.id]: (prev[selectedConfessionDetail.id] || []).filter(l => !l.isAdmin)
                            }));
                          }
                        }}
                        className="text-red-500 hover:scale-110 transition-transform active:scale-95"
                      >
                        <Heart size={14} className={selectedConfessionDetail.likes_count > 0 ? "fill-red-500" : ""} /> 
                      </button>
                      {(likesCounts[selectedConfessionDetail.id] || 0) > 0 && (
                        <button
                          onClick={() => {
                            setSelectedConfessionForLikers(selectedConfessionDetail);
                            setShowLikersModal(true);
                          }}
                          className="hover:text-[#d4af37] transition-colors"
                        >
                          {likesCounts[selectedConfessionDetail.id]}
                        </button>
                      )}
                    </div>
                    {(likesCounts[selectedConfessionDetail.id] || 0) > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {(likersByConfession[selectedConfessionDetail.id] || []).slice(0, 5).map((liker: any, idx: number) => (
                          <img
                            key={idx}
                            src={getAvatarUrl(liker.avatar_url || null, liker.name || 'Guest')}
                            alt={liker.name}
                            title={liker.name}
                            className="w-8 h-8 rounded-full border border-[#d4af37] cursor-pointer flex-shrink-0 object-cover"
                          />
                        ))}
                        {(likersByConfession[selectedConfessionDetail.id]?.length || 0) > 5 && (
                          <button
                            onClick={() => {
                              setSelectedConfessionForLikers(selectedConfessionDetail);
                              setShowLikersModal(true);
                            }}
                            className="text-[9px] md:text-xs text-gray-400 ml-2 hover:text-[#d4af37] transition-colors"
                          >
                            +{(likersByConfession[selectedConfessionDetail.id]?.length || 0) - 5}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  {commentsByConfession[selectedConfessionDetail.id]?.length > 0 && (
                    <div className="space-y-2 md:space-y-3">
                      <p className="text-gray-500 text-[9px] md:text-xs uppercase font-bold">
                        💬 {commentsByConfession[selectedConfessionDetail.id]?.length || 0}
                      </p>
                      
                      <div className="space-y-2 md:space-y-3">
                        {commentsByConfession[selectedConfessionDetail.id]?.map((comment: any, idx: number) => (
                          <div key={idx} className="p-2 md:p-3 bg-black/30 rounded-xl space-y-1">
                            <div className="flex items-center gap-2">
                              <img 
                                src={getAvatarUrl(comment.guests?.avatar_url || null, comment.guests?.name || 'Guest')}
                                alt={comment.guests?.name}
                                className="w-6 h-6 rounded-full border border-[#d4af37] flex-shrink-0 object-cover"
                              />
                              <span className="font-bold text-xs md:text-sm text-[#fadd7d] truncate">{comment.guests?.name || 'Ẩn danh'}</span>
                            </div>
                            <p className="text-gray-200 text-xs md:text-sm ml-8">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comment Input Section - Sticky at bottom */}
                  <div className="sticky bottom-0 border-t border-[#222] pt-3 md:pt-4 pb-2 md:pb-3 space-y-2 md:space-y-3 bg-[#0a0a0a] z-10">
                    <div className="flex items-start gap-2 md:gap-3">
                      <img 
                        src={getAvatarUrl(adminUser?.avatar_url || null, adminUser?.name || 'Admin')}
                        alt="admin"
                        className="w-7 md:w-8 h-7 md:h-8 rounded-full border border-[#d4af37] flex-shrink-0 mt-1 object-cover"
                      />
                      <div className="flex-1 space-y-1 md:space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs md:text-sm text-[#fadd7d]">{adminUser?.name || 'Admin'}</span>
                          <span className="text-[8px] md:text-xs text-gray-500">Admin</span>
                        </div>
                        <div className="flex gap-1 md:gap-2">
                          <input
                            type="text"
                            value={commentInput[selectedConfessionDetail.id] || ""}
                            onChange={(e) => setCommentInput(prev => ({ ...prev, [selectedConfessionDetail.id]: e.target.value }))}
                            placeholder="Viết bình luận..."
                            className="flex-1 bg-black border border-[#333] rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs text-gray-200 focus:border-[#d4af37] outline-none placeholder:text-gray-600"
                          />
                          <button
                            onClick={() => {
                              handleCommentConfession(selectedConfessionDetail.id, commentInput[selectedConfessionDetail.id] || "");
                              setCommentInput(prev => ({ ...prev, [selectedConfessionDetail.id]: "" }));
                            }}
                            disabled={!commentInput[selectedConfessionDetail.id]?.trim()}
                            className="bg-[#d4af37] text-black px-2 md:px-3 py-1.5 md:py-2 rounded-lg font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c9a227] transition-colors active:scale-95 flex-shrink-0"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW MODAL */}
      {showImagePreviewModal && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
          onClick={() => setShowImagePreviewModal(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {previewImages.length > 0 ? (
              <>
                <img 
                  src={previewImages[currentPreviewIndex]} 
                  alt="Full preview" 
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
                {previewImages.length > 1 && (
                  <div className="flex gap-4 mt-4">
                    <button 
                      onClick={() => setCurrentPreviewIndex(prev => prev > 0 ? prev - 1 : previewImages.length - 1)}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                      ← Trước
                    </button>
                    <span className="text-white/80 font-bold self-center">
                      {currentPreviewIndex + 1} / {previewImages.length}
                    </span>
                    <button 
                      onClick={() => setCurrentPreviewIndex(prev => prev < previewImages.length - 1 ? prev + 1 : 0)}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                      Tiếp →
                    </button>
                  </div>
                )}
              </>
            ) : null}
            <button 
              onClick={() => setShowImagePreviewModal(false)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* LIKERS MODAL */}
      {showLikersModal && selectedConfessionForLikers && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 animate-in fade-in">
          <div className="w-full max-w-md max-h-[90vh] bg-[#111] border border-[#333] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-[#222] bg-[#0a0a0a] flex-shrink-0">
              <h3 className="text-[#d4af37] font-bold uppercase text-xs md:text-sm tracking-widest">
                {likesCounts[selectedConfessionForLikers.id] || 0}  👍
              </h3>
              <button onClick={() => setShowLikersModal(false)} className="p-1.5 md:p-2 hover:bg-[#222] rounded-full transition-colors">
                <X size={18} className="text-gray-400"/>
              </button>
            </div>

            {/* Likers List */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2 p-3 md:p-4">
                {(likersByConfession[selectedConfessionForLikers.id] || []).map((liker: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-black/30 rounded-xl hover:bg-black/50 transition-colors">
                    <img 
                      src={getAvatarUrl(liker.avatar_url || null, liker.name || 'Guest')}
                      alt={liker.name}
                      className="w-9 md:w-10 h-9 md:h-10 rounded-full border-2 border-[#d4af37] flex-shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs md:text-sm text-[#fadd7d] truncate">{liker.name || 'Ẩn danh'}</p>
                      {liker.isAdmin && (
                        <p className="text-[8px] md:text-xs text-[#d4af37] font-bold">Admin</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Component phụ ---
function StatCard({ label, value, icon, color, bg }: any) {
  return (
    <div className="bg-[#111] border border-[#333] p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-4 transition-all hover:scale-[1.02]">
      <div className={`w-9 md:w-10 h-9 md:h-10 rounded-lg md:rounded-2xl flex items-center justify-center ${bg} ${color} flex-shrink-0`}>{icon}</div>
      <div className="font-sans min-w-0"><p className="text-gray-500 text-[8px] md:text-[10px] uppercase font-black tracking-widest opacity-60 line-clamp-1">{label}</p><p className="text-lg md:text-xl font-bold">{value}</p></div>
    </div>
  );
}

function TabButton({ active, onClick, label, badge }: any) {
  return (
    <button onClick={onClick} className={`px-2 md:px-4 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 flex items-center gap-1.5 md:gap-2 ${active ? 'text-[#d4af37] border-[#d4af37]' : 'text-gray-600 border-transparent hover:text-white'}`}>
        {label}
        {badge > 0 && <span className="bg-red-600 text-white text-[8px] px-1 py-0.5 rounded-full animate-bounce flex-shrink-0">{badge}</span>}
    </button>
  );
}

function InputField({ label, value, icon, placeholder, full, onChange }: { label: string; value: string; icon: React.ReactNode; placeholder: string; full?: boolean; onChange: (v: string) => void }) {
    return (
        <div className={`space-y-1.5 md:space-y-2 ${full ? 'md:col-span-2' : ''}`}>
            <label className="text-[8px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2 px-1">{icon} {label}</label>
            <input 
                value={value || ""} 
                onChange={e => onChange(e.target.value)} 
                className="w-full bg-black border border-[#222] p-2.5 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm focus:border-[#d4af37]/50 outline-none transition-all placeholder:text-gray-800" 
                placeholder={placeholder} 
            />
        </div>
    )
}

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
)