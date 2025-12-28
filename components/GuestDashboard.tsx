"use client";

import MobileInvitation from "@/components/3d/InvitationCard";
import ChatGroup from "@/components/ChatGroup";
import NetworkSection, { ChatGroupInfo } from "@/components/NetworkSection";
import { supabase } from "@/lib/supabase";
import {
    ArrowLeft,
    BellRing,
    Camera,
    Check,
    Crown,
    Edit3,
    Heart,
    HeartHandshake, ImagePlus,
    Loader2, MessageCircle, Send, Share2, Ticket, Trash2, UserPlus, Users, X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// --- CONSTANTS ---
const HOST_INFO = {
  name: "Đức Kiên",
  shortName: "DK",
  role: "Chủ tiệc",
  isHost: true
};

// Map tên nhóm để hiển thị trên thông báo cho đẹp
const GROUP_NAMES: Record<string, string> = {
    'general': 'Hội trường chính',
    'family': 'Gia đình',
    'friends': 'Hội bạn thân',
    'vip': 'Khách VIP'
};

interface DashboardProps {
  guest: any;
}

export default function GuestDashboard({ guest }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'wish' | 'chat' | 'card'>('chat');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadGroupTags, setUnreadGroupTags] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(guest.avatar_url || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ visible: boolean, title: string, content: string, avatar: string, groupTag?: string } | null>(null);
  
  // --- HỆ THỐNG ÂM THANH (WEB AUDIO API) ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Group Data
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]); 
  const [previewGroup, setPreviewGroup] = useState<ChatGroupInfo | null>(null); 
  const [activeChatTag, setActiveChatTag] = useState<string | null>(null); 
  const [previewMembers, setPreviewMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Wish Data
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [myConfessions, setMyConfessions] = useState<any[]>([]);
  const [publicConfessions, setPublicConfessions] = useState<any[]>([]);
  const [selectedConfession, setSelectedConfession] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [confessionVisibility, setConfessionVisibility] = useState<'admin' | 'everyone'>('admin');
  const [wishTab, setWishTab] = useState<'my' | 'all'>('my');
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [guestComments, setGuestComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [guestLikes, setGuestLikes] = useState<Set<string>>(new Set());
  const [likesCounts, setLikesCounts] = useState<Record<string, number>>({});

  const [commentsByConfession, setCommentsByConfession] = useState<Record<string, any[]>>({});

  // --- 1. KHỞI TẠO AUDIO CONTEXT ---
  useEffect(() => {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) { audioContextRef.current = new AudioContext(); }
      if ("Notification" in window) { setHasPermission(Notification.permission === "granted"); }
  }, []);

  // --- FETCH ADMIN INFO ---
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const { data } = await supabase
          .from('guests')
          .select('id, name, avatar_url')
          .eq('id', 'admin')
          .single();
        if (data) setAdminInfo(data);
      } catch (e) {
        console.error('Error fetching admin info:', e);
      }
    };
    fetchAdminInfo();
  }, []);

  // --- HÀM CHỈNH SỬA LƯU BÚT ---
  const handleEditConfession = async () => {
    if (!selectedConfession || !editContent.trim()) return;
    
    setIsUpdating(true);
    try {
      let imageUrl = selectedConfession.image_url;
      
      // Upload ảnh mới nếu chọn
      if (editFile) {
        const timestamp = Date.now();
        const fileName = `confession-${selectedConfession.id}-${timestamp}`;
        
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('confessions')
            .upload(fileName, editFile, { upsert: true });
          
          if (uploadError) {
            console.error('Upload storage error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
        } catch (uploadErr) {
          console.error('Upload exception:', uploadErr);
          throw uploadErr;
        }
        
        // Xóa ảnh cũ nếu có
        if (selectedConfession.image_url && selectedConfession.image_url.includes('confessions/')) {
          const oldPath = selectedConfession.image_url.split('/confessions/')[1];
          await supabase.storage.from('confessions').remove([oldPath]).catch((err) => {
            console.warn('Could not delete old image:', err);
          });
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('confessions')
          .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }
      
      // Update confession via API route
      const response = await fetch('/api/confessions/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confessionId: selectedConfession.id,
          content: editContent,
          visibility: confessionVisibility,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      const result = await response.json();
      
      // Cập nhật local state
      const updatedConfession = {
        ...selectedConfession,
        content: editContent,
        image_url: imageUrl,
        visibility: confessionVisibility
      };
      
      setSelectedConfession(updatedConfession);
      setMyConfessions(myConfessions.map(c => 
        c.id === selectedConfession.id 
          ? updatedConfession
          : c
      ));
      
      setIsEditing(false);
      setEditFile(null);
      alert('Đã lưu thay đổi thành công!');
    } catch (error: any) {
      console.error('Edit error:', error?.message || error);
      alert(`Lỗi: ${error?.message || 'Không rõ nguyên nhân'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // --- HÀM XÓA LƯU BÚT ---
  const handleDeleteConfession = async (confessionId: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa lưu bút này?')) return;
    
    try {
      const response = await fetch('/api/confessions/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      // Cập nhật local state
      setMyConfessions(myConfessions.filter(c => c.id !== confessionId));
      setSelectedConfession(null);
      alert('Đã xóa lưu bút');
    } catch (error: any) {
      console.error('Delete error:', error?.message || error);
      alert(`Lỗi: ${error?.message || 'Không rõ nguyên nhân'}`);
    }
  };


  // --- LẤY DANH SÁCH LƯU BÚT CỦA TÔI ---
  const fetchMyConfessions = async () => {
    const { data } = await supabase
      .from('confessions')
      .select('*')
      .eq('guest_id', guest.id)
      .order('created_at', { ascending: false });
    if (data) setMyConfessions(data);
  };

  const fetchPublicConfessions = async () => {
    const { data } = await supabase
      .from('confessions')
      .select(`
        *,
        guest:guests(id, name, avatar_url)
      `)
      .eq('visibility', 'everyone')
      .order('created_at', { ascending: false });
    if (data) setPublicConfessions(data);

    // Fetch user's likes
    const { data: likes } = await supabase
      .from('confession_likes')
      .select('confession_id')
      .eq('guest_id', guest.id);
    
    if (likes) {
      const likeSet = new Set(likes.map(l => l.confession_id));
      setGuestLikes(likeSet);
    }

    // Fetch like counts + comment counts cho mỗi confession
    if (data) {
      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, any[]> = {};
      
      for (const confession of data) {
        const { count: likeCount } = await supabase
          .from('confession_likes')
          .select('*', { count: 'exact', head: true })
          .eq('confession_id', confession.id);
        likeCounts[confession.id] = likeCount || 0;

        const { data: comments } = await supabase
          .from('confession_comments')
          .select('*')
          .eq('confession_id', confession.id);
        commentCounts[confession.id] = comments || [];
      }
      
      setLikesCounts(likeCounts);
      setCommentsByConfession(commentCounts);
    }
  };

  const fetchComments = async (confessionId: string) => {
    try {
      const response = await fetch(`/api/confessions/comments?confessionId=${confessionId}`);
      const { comments } = await response.json();
      console.log('Fetched comments:', comments?.length || 0, comments);
      setCommentsByConfession(prev => ({ ...prev, [confessionId]: comments || [] }));
    } catch (error) {
      console.error('Fetch comments error:', error);
    }
  };

  const handleLikeConfession = async (confessionId: string) => {
    try {
      const response = await fetch('/api/confessions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId, guestId: guest.id })
      });
      const { liked, likeCount } = await response.json();
      
      const newLikes = new Set(guestLikes);
      if (liked) {
        newLikes.add(confessionId);
      } else {
        newLikes.delete(confessionId);
      }
      setGuestLikes(newLikes);
      setLikesCounts(prev => ({ ...prev, [confessionId]: likeCount }));
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handlePostComment = async (confessionId: string) => {
    if (!commentInput.trim()) return;
    
    setIsPostingComment(true);
    try {
      const response = await fetch('/api/confessions/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId, guestId: guest.id, content: commentInput })
      });
      const data = await response.json();
      console.log('Posted response:', data, 'Status:', response.status);
      
      if (!response.ok) {
        console.error('Error details:', data);
        alert(`Lỗi: ${data.details || data.error}`);
        setIsPostingComment(false);
        return;
      }
      
      console.log('Posted comment:', data.comment);
      
      // Delay 500ms để đảm bảo comment đã lưu vào DB trước khi fetch
      setTimeout(() => {
        fetchComments(confessionId);
      }, 500);
      setCommentInput("");
    } catch (error) {
      console.error('Post comment error:', error);
      alert('Lỗi khi đăng bình luận');
    } finally {
      setIsPostingComment(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wish') {
      fetchMyConfessions();
      fetchPublicConfessions();
    }
  }, [activeTab, sent]);

  // --- FETCH COMMENTS WHEN MODAL OPENS ---
  useEffect(() => {
    if (selectedConfession && selectedConfession.visibility === 'everyone') {
      fetchComments(selectedConfession.id);
      setCommentInput("");
    }
  }, [selectedConfession?.id]);

  // --- REALTIME LẮNG NGHE PHẢN HỒI TỪ ADMIN ---
  useEffect(() => {
    if (activeTab !== 'wish') return;
    
    const channel = supabase.channel(`confessions:${guest.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confessions', filter: `guest_id=eq.${guest.id}` },
        (payload: any) => {
          // Cập nhật lưu bút khi admin thêm comment hoặc like
          setMyConfessions(prev => 
            prev.map(c => c.id === payload.new.id ? payload.new : c)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confessions', filter: `visibility=eq.everyone` },
        (payload: any) => {
          if (payload.new.guest_id !== guest.id) {
            setPublicConfessions(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new : c)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confessions', filter: `visibility=eq.everyone` },
        (payload: any) => {
          if (payload.new.guest_id !== guest.id) {
            setPublicConfessions(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTab, guest.id]);

  // --- REALTIME COMMENTS & LIKES ---
  useEffect(() => {
    if (!selectedConfession || selectedConfession.visibility !== 'everyone') return;

    const commentsChannel = supabase.channel(`comments:${selectedConfession.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confession_comments', filter: `confession_id=eq.${selectedConfession.id}` },
        (payload: any) => {
          setGuestComments(prev => [payload.new, ...prev]);
          setCommentsByConfession(prev => ({
            ...prev,
            [selectedConfession.id]: [payload.new, ...(prev[selectedConfession.id] || [])]
          }));
        }
      )
      .subscribe();

    const likesChannel = supabase.channel(`likes:${selectedConfession.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confession_likes', filter: `confession_id=eq.${selectedConfession.id}` },
        (payload: any) => {
          // Fetch updated like count
          const confessionLikes = publicConfessions.find(c => c.id === selectedConfession.id)?.likes_count || 0;
          setLikesCounts(prev => ({ ...prev, [selectedConfession.id]: confessionLikes + 1 }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'confession_likes', filter: `confession_id=eq.${selectedConfession.id}` },
        (payload: any) => {
          const confessionLikes = publicConfessions.find(c => c.id === selectedConfession.id)?.likes_count || 0;
          setLikesCounts(prev => ({ ...prev, [selectedConfession.id]: confessionLikes - 1 }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [selectedConfession?.id]);

  // --- HÀM CHIA SẺ ---
  const handleShare = async (item: any) => {
    const shareData = {
      title: 'Lưu bút tốt nghiệp',
      text: `Kỷ niệm của mình tại lễ tốt nghiệp: "${item.content}"`,
      url: window.location.origin + `/${guest.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} - Xem tại: ${shareData.url}`);
        alert("Đã sao chép nội dung chia sẻ vào bộ nhớ tạm!");
      }
    } catch (err) { console.error(err); }
  };

  // --- 2. HÀM TỰ SINH ÂM THANH "BUBBLE POP" ---
  const playSystemSound = () => {
      try {
          const ctx = audioContextRef.current;
          if (!ctx) return;
          if (ctx.state === 'suspended') ctx.resume();

          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.type = 'sine'; 
          const now = ctx.currentTime;
          
          oscillator.frequency.setValueAtTime(400, now);
          oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
          
          gainNode.gain.setValueAtTime(0.5, now);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

          oscillator.start(now);
          oscillator.stop(now + 0.1);
      } catch (e) {
          console.error("Audio Error:", e);
      }
  };

  // --- 3. MỞ KHÓA ÂM THANH ---
  const unlockAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
              console.log("🔊 Audio system unlocked!");
          });
      }
  };

  // --- 4. CẬP NHẬT TRẠNG THÁI "ĐÃ XEM" ---
  const markGroupAsRead = async (tag: string) => {
    try {
        await supabase
          .from('group_members')
          .update({ last_viewed_at: new Date().toISOString() })
          .eq('guest_id', guest.id)
          .eq('group_tag', tag);
        
        // Xóa tag khỏi danh sách chưa đọc ở Client ngay lập tức
        setUnreadGroupTags(prev => prev.filter(t => t !== tag));
        fetchUnreadMessages();
    } catch (e) {
        console.error("Lỗi cập nhật đã xem:", e);
    }
  };

  const requestPermission = async () => {
      unlockAudio(); 
      playSystemSound();
      if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          setHasPermission(permission === "granted");
          if (permission === "granted") {
              new Notification("Đã bật thông báo!", { 
                  body: "Bạn sẽ nhận được tin nhắn ngay lập tức.",
                  icon: getDisplayAvatar() || "/favicon.png"
              });
          }
      }
  };

  // --- 5. HÀM KÍCH HOẠT THÔNG BÁO (HIỆN NHÓM VÀ NGƯỜI GỬI) ---
  const triggerNotification = (msg: any) => {
      playSystemSound();

      const groupName = GROUP_NAMES[msg.group_tag] || `Nhóm ${msg.group_tag}`;
      const notiTitle = `Tin nhắn từ ${groupName}`;
      const notiContent = `${msg.sender_name}: ${msg.content || "Đã gửi một ảnh"}`;

      setNotification({
          visible: true,
          title: notiTitle,
          content: notiContent,
          avatar: msg.sender_avatar,
          groupTag: msg.group_tag 
      });
      setTimeout(() => setNotification(null), 4000);

      const shouldNotifyBrowser = document.hidden || ("Notification" in window && Notification.permission === "granted");
      if (shouldNotifyBrowser) {
          try {
             const noti = new Notification(notiTitle, {
                 body: notiContent,
                 icon: msg.sender_avatar && msg.sender_avatar.startsWith('http') ? msg.sender_avatar : undefined,
                 tag: 'chat-message'
             });
             noti.onclick = function() {
                 window.focus();
                 if (msg.group_tag) {
                     setActiveChatTag(msg.group_tag);
                     setActiveTab('chat');
                     markGroupAsRead(msg.group_tag);
                 }
                 noti.close();
             };
          } catch (e) { console.error(e); }
      }
  };

  const getDisplayAvatar = () => { if (avatarUrl) return avatarUrl; return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(guest.name)}&backgroundColor=d4af37,111111`; };
  
  const getAvatarUrl = (avatarUrl: string | null, name: string) => {
    if (avatarUrl) return avatarUrl;
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=d4af37,111111`;
  };
  
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || e.target.files.length === 0) return; const file = e.target.files[0]; setIsUploadingAvatar(true); try { const fileExt = file.name.split('.').pop(); const fileName = `${guest.id}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('guest-avatars').upload(fileName, file, { upsert: true }); if (uploadError) throw uploadError; const { data: { publicUrl } } = supabase.storage.from('guest-avatars').getPublicUrl(fileName); const { error: dbError } = await supabase.from('guests').update({ avatar_url: publicUrl }).eq('id', guest.id); if (dbError) throw dbError; setAvatarUrl(publicUrl); guest.avatar_url = publicUrl; } catch (error) { console.error("Lỗi đổi avatar:", error); } finally { setIsUploadingAvatar(false); } };

  // Logic Nhóm
  useEffect(() => { const initGroups = async () => { const { data: dbGroups } = await supabase.from('group_members').select('group_tag').eq('guest_id', guest.id); let currentTags = dbGroups ? dbGroups.map((item: any) => item.group_tag) : []; if (!currentTags.includes('general')) { await supabase.from('group_members').insert({ group_tag: 'general', guest_id: guest.id }).then(({ error }) => { if (!error || error.code === '23505') currentTags.push('general'); }); } setJoinedGroups(currentTags); }; initGroups(); }, [guest.id]);
  
  useEffect(() => { if (activeChatTag) { markGroupAsRead(activeChatTag); } }, [activeChatTag]);
  
  const fetchUnreadMessages = async () => {
  if (joinedGroups.length === 0) { setUnreadCount(0); return; }
  try {
    const { data: membersData } = await supabase
      .from('group_members')
      .select('group_tag, last_viewed_at')
      .eq('guest_id', guest.id)
      .in('group_tag', joinedGroups);
    
    if (!membersData) return;
    
    const counts = await Promise.all(membersData.map(async (mem) => {
      const lastViewed = mem.last_viewed_at || '2000-01-01T00:00:00.000Z';
      
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_tag', mem.group_tag)
        .gt('created_at', lastViewed)
        .neq('sender_id', guest.id); // 🔥 QUAN TRỌNG: Không đếm tin nhắn do chính mình gửi

      if (count && count > 0) {
        setUnreadGroupTags(prev => prev.includes(mem.group_tag) ? prev : [...prev, mem.group_tag]);
      } else {
        setUnreadGroupTags(prev => prev.filter(t => t !== mem.group_tag));
      }
      return count || 0;
    }));
    setUnreadCount(counts.reduce((acc, curr) => acc + curr, 0));
  } catch (error) { console.error(error); }
};

  useEffect(() => { if (!activeChatTag) fetchUnreadMessages(); }, [joinedGroups, activeChatTag, guest.id]);

  // Realtime Listener
  useEffect(() => {
    if (joinedGroups.length === 0) return;
    const channel = supabase.channel('dashboard-noti-listener').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const newMsg = payload.new;
          const isMyGroup = joinedGroups.includes(newMsg.group_tag);
          const isNotMe = newMsg.sender_id !== guest.id;
          const isNotActive = activeChatTag !== newMsg.group_tag;
          if (isMyGroup && isNotMe) {
            if (isNotActive) {
                setUnreadCount((prev) => prev + 1);
                setUnreadGroupTags(prev => prev.includes(newMsg.group_tag) ? prev : [...prev, newMsg.group_tag]);
                triggerNotification(newMsg);
            } else {
                markGroupAsRead(newMsg.group_tag); // Đang mở nhóm đó thì cập nhật "đã xem" luôn
            }
          }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [joinedGroups, activeChatTag, guest.id]);

  useEffect(() => { const channel = supabase.channel(`my_groups_update:${guest.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `guest_id=eq.${guest.id}` }, (payload: any) => { if (payload.new?.group_tag) { setJoinedGroups(prev => prev.includes(payload.new.group_tag) ? prev : [...prev, payload.new.group_tag]); } }).subscribe(); return () => { supabase.removeChannel(channel); }; }, [guest.id]);

  const fetchRealMembers = async (groupTag: string) => { setLoadingMembers(true); try { const { data } = await supabase.from('group_members').select('guests(id, name, tags)').eq('group_tag', groupTag).limit(15); const realList = [{ id: 'admin-host', name: HOST_INFO.name, short: HOST_INFO.shortName, isHost: true }]; if (data) data.forEach((item: any) => { const g = item.guests; if (g && g.id !== guest.id && !g.tags?.includes('admin')) { realList.push({ id: g.id, name: g.name, short: g.name.charAt(0).toUpperCase(), isHost: false }); } }); setPreviewMembers(realList); } catch (e) { console.error(e); } setLoadingMembers(false); };
  const handlePreviewGroup = (group: ChatGroupInfo) => { if (joinedGroups.includes(group.tag_identifier)) { setActiveChatTag(group.tag_identifier); setPreviewGroup(null); markGroupAsRead(group.tag_identifier); } else { setPreviewGroup(group); setActiveChatTag(null); fetchRealMembers(group.tag_identifier); } };
  const handleJoinGroup = async () => { if (!previewGroup) return; setJoinedGroups(prev => [...prev, previewGroup.tag_identifier]); setActiveChatTag(previewGroup.tag_identifier); setPreviewGroup(null); try { await supabase.from('group_members').insert({ group_tag: previewGroup.tag_identifier, guest_id: guest.id, last_viewed_at: new Date().toISOString() }); } catch (e) { console.error(e); } };
  const handleLeaveGroup = (tag: string) => { setJoinedGroups(prev => prev.filter(t => t !== tag)); setActiveChatTag(null); };
  const handleSendConfession = async () => { if (!content && !file) return; setUploading(true); try { let publicUrl = null; if (file) { const fileExt = file.name.split('.').pop(); const fileName = `${guest.id}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('invitation-media').upload(fileName, file); if (uploadError) throw uploadError; publicUrl = supabase.storage.from('invitation-media').getPublicUrl(fileName).data.publicUrl; } await supabase.from('confessions').insert({ guest_id: guest.id, content: content, image_url: publicUrl }); setSent(true); setContent(""); setFile(null); } catch (error: any) { alert("Lỗi: " + error.message); } finally { setUploading(false); } };

  const handleNotificationClick = () => {
    if (notification?.groupTag && joinedGroups.includes(notification.groupTag)) {
        setActiveChatTag(notification.groupTag);
        setActiveTab('chat');
        markGroupAsRead(notification.groupTag);
    }
    setNotification(null);
  };

  return (
    <>
      {activeTab === 'card' ? (
        // Hiển thị thiệp khi tab là 'card'
        <MobileInvitation 
          guestName={guest.name} 
          guestId={guest.id} 
          isConfirmed={true} 
          initialAttendance={guest.attendance} 
          initialWish={guest.wish} 
          onTabChange={(tab) => setActiveTab(tab)} // Nhận callback đóng thiệp
        />
      ) : (
        <div 
            className="min-h-screen bg-[#0a0a0a] text-white pb-28 font-sans overflow-x-hidden relative"
            onClick={unlockAudio} 
            onTouchStart={unlockAudio}
        >
      
      {/* NOTIFICATION POPUP */}
      {notification && (
          <div 
            className="fixed top-4 left-4 right-4 z-[100] bg-[#1a1a1a]/95 backdrop-blur-md border border-[#d4af37]/50 p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 cursor-pointer"
            onClick={handleNotificationClick}
          >
              <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333] overflow-hidden flex-shrink-0">
                  {notification.avatar && notification.avatar.startsWith('http') ? (
                      <img src={notification.avatar} className="w-full h-full object-cover" alt="avatar" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-[#d4af37] text-black">
                          {notification.title.substring(0,2)}
                      </div>
                  )}
              </div>
              <div className="flex-1 min-w-0">
                  <h4 className="text-[#d4af37] text-xs font-bold truncate">{notification.title}</h4>
                  <p className="text-gray-300 text-xs truncate">{notification.content}</p>
              </div>
              <div className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse"></div>
          </div>
      )}

      {/* HEADER */}
      <div className="p-6 pt-12 bg-gradient-to-b from-[#1a1a1a] to-transparent sticky top-0 z-40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-3">
               <div className="relative w-12 h-12 rounded-full border-2 border-[#d4af37] bg-[#222] overflow-hidden group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                   {isUploadingAvatar ? (
                       <div className="absolute inset-0 flex items-center justify-center bg-black/50"><Loader2 className="animate-spin text-white" size={20}/></div>
                   ) : (
                       <img src={getDisplayAvatar()} alt="Avatar" className="w-full h-full object-cover" />
                   )}
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={16} className="text-white"/></div>
               </div>
               <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarChange} />

               <div>
                   <h1 className="text-xl font-bold text-[#d4af37]">Xin chào, {guest.name}</h1>
                   <div className="flex items-center gap-2">
                       <p className="text-gray-400 text-xs">Nhấn vào để thay đổi ảnh đại diện</p>
                       {!hasPermission && (
                           <button onClick={requestPermission} className="text-[10px] bg-[#d4af37] text-black px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                               <BellRing size={10} /> Bật thông báo
                           </button>
                       )}
                   </div>
               </div>
           </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto font-sans">
        {activeTab === 'wish' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
             {/* FORM GỬI LƯU BÚT */}
             {(
             <div className="bg-[#111] border border-[#333] rounded-2xl p-5 space-y-4 shadow-xl">
                <h2 className="text-[#fadd7d] font-bold uppercase tracking-widest text-xs flex items-center gap-2"><HeartHandshake size={16}/> Gửi lưu bút</h2>
                {sent ? (
                    <div className="py-4 text-center animate-in zoom-in">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 text-green-500"><Send size={20}/></div>
                        <p className="text-green-500 font-bold mb-2">Gửi thành công!</p>
                        <button onClick={() => setSent(false)} className="text-xs text-[#d4af37] underline font-bold uppercase">Gửi thêm kỷ niệm</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Hãy nhắn gửi điều gì đó cho Kiên nhé..." className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm min-h-[120px] text-gray-200 focus:border-[#d4af37] outline-none resize-none"/>
                        <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-[#222] rounded-xl text-gray-400 hover:text-white"><ImagePlus size={20}/></button>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                            <button onClick={handleSendConfession} disabled={uploading} className="flex-1 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2">
                                {uploading ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Gửi ngay
                            </button>
                        </div>
                        {file && <p className="text-[10px] text-gray-500 truncate italic bg-[#0a0a0a] p-2 rounded-lg border border-[#222]">Đã chọn: {file.name}</p>}
                    </div>
                )}
             </div>
              )}
             {/* DANH SÁCH LƯU BÚT CỦA TÔI */}
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-[#d4af37] font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                     <Ticket size={14} /> Kỷ niệm
                  </h3>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => setWishTab('my')}
                      className={`text-xs px-3 py-1 rounded-full font-bold uppercase transition-all ${wishTab === 'my' ? 'bg-[#d4af37] text-black' : 'bg-[#222] text-gray-300 hover:bg-[#333]'}`}
                    >
                      Của bạn
                    </button>
                    <button
                      onClick={() => setWishTab('all')}
                      className={`text-xs px-3 py-1 rounded-full font-bold uppercase transition-all ${wishTab === 'all' ? 'bg-[#d4af37] text-black' : 'bg-[#222] text-gray-300 hover:bg-[#333]'}`}
                    >
                      Từ mọi người ({publicConfessions.length})
                    </button>
                  </div>
                </div>
                
                {wishTab === 'my' ? (
                  // DANH SÁCH CỦA NGƯỜI DÙNG
                  <>
                {myConfessions.length === 0 ? (
                  <div className="text-center py-10 bg-[#111]/30 rounded-2xl border border-dashed border-[#333]">
                    <p className="text-gray-500 text-xs italic">Bạn chưa viết lưu bút nào</p>
                  </div>
                ) : (
                  myConfessions.map((item) => (
                    <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 cursor-pointer hover:border-[#d4af37] transition-all" onClick={() => setSelectedConfession(item)}>
                      {item.image_url && <img src={item.image_url} className="w-full h-48 object-cover border-b border-[#222]" alt="Kỷ niệm" />}
                      <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-gray-200 text-sm leading-relaxed font-medium">{item.content}</p>
                          </div>
                          {item.visibility === 'everyone' ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full whitespace-nowrap font-bold">👥 Công khai</span>
                          ) : (
                            <span className="text-xs bg-gray-700/40 text-gray-300 px-2 py-1 rounded-full whitespace-nowrap font-bold">🔒 Private</span>
                          )}
                        </div>


                        <div className="flex items-center justify-between pt-3 border-t border-[#222]">
                          <span className="text-[10px] text-gray-600 font-mono">
                            {new Date(item.created_at).toLocaleDateString('vi-VN')} {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedConfession(item);
                                setIsEditing(true);
                                setEditContent(item.content);
                                setConfessionVisibility(item.visibility || 'admin');
                                setEditFile(null);
                              }} 
                              className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-blue-400"
                              title="Chỉnh sửa"
                            >
                              <Edit3 size={14}/>
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleDeleteConfession(item.id);
                              }}
                              className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-red-400"
                              title="Xóa"
                            >
                              <Trash2 size={14}/>
                            </button>
                            {item.visibility === 'everyone' && (
                              <button onClick={(e) => { e.stopPropagation(); handleShare(item); }} className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-green-400" title="Chia sẻ">
                                <Share2 size={14} /> 
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                  </>
                ) : (
                  // DANH SÁCH CÔNG KHAI TỪ MỌI NGƯỜI
                  <>
                {publicConfessions.length === 0 ? (
                  <div className="text-center py-10 bg-[#111]/30 rounded-2xl border border-dashed border-[#333]">
                    <p className="text-gray-500 text-xs italic">Chưa có kỷ niệm công khai nào</p>
                  </div>
                ) : (
                  publicConfessions.map((item) => (
                    <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 cursor-pointer hover:border-[#d4af37] transition-all" onClick={() => setSelectedConfession(item)}>
                      {item.image_url && <img src={item.image_url} className="w-full max-h-64 object-cover border-b border-[#222]" alt="Kỷ niệm" />}
                      <div className="p-4 space-y-4">
                        {/* Poster info */}
                        {item.guest && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img 
                                src={getAvatarUrl(item.guest.avatar_url, item.guest.name)} 
                                alt={item.guest.name}
                                className="w-6 h-6 rounded-full object-cover border border-[#d4af37]/30"
                              />
                              <span className="text-gray-300 text-xs font-bold">{item.guest.name}</span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(item.created_at).toLocaleDateString('vi-VN')} {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-gray-200 text-sm leading-relaxed font-medium">{item.content}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleShare(item); }} className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-green-400" title="Chia sẻ">
                            <Share2 size={14} /> 
                          </button>
                        </div>

                        {/* PHẢN HỒI TỪ ADMIN */}
                        {(item.likes_count > 0 || item.admin_comment) && (
                          <div className="bg-black/50 p-3 rounded-xl border border-[#d4af37]/20 mt-2 space-y-2">
                            {item.likes_count > 0 && adminInfo && (
                              <div className="flex items-center gap-2">
                                <Heart size={12} className="fill-[#d4af37] text-[#d4af37]" />
                                <img
                                  src={getAvatarUrl(adminInfo.avatar_url, adminInfo.name)}
                                  alt={adminInfo.name}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                                <span className="text-[#d4af37] text-[10px] font-black uppercase">{adminInfo.name} đã thả tim</span>
                              </div>
                            )}
                            {item.admin_comment && adminInfo && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <img
                                    src={getAvatarUrl(adminInfo.avatar_url, adminInfo.name)}
                                    alt={adminInfo.name}
                                    className="w-4 h-4 rounded-full object-cover"
                                  />
                                  <span className="text-[#fadd7d] text-[10px] font-bold uppercase">{adminInfo.name}</span>
                                </div>
                                <p className="text-gray-400 text-[11px] leading-relaxed italic pl-2 border-l border-[#d4af37]/40">
                                  {item.admin_comment}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Guest Interactions Footer */}
                        <div className="flex items-center gap-2 pt-3 border-t border-[#222] text-[11px] text-gray-500">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeConfession(item.id);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                              guestLikes.has(item.id)
                                ? 'text-red-400 bg-red-500/10'
                                : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                          >
                            <Heart 
                              size={12} 
                              className={guestLikes.has(item.id) ? 'fill-red-400' : ''}
                            />
                            <span className="text-[10px]">{likesCounts[item.id] || 0}</span>
                          </button>
                          <div className="flex items-center gap-1 px-2 py-1 text-gray-500">
                            <MessageCircle size={12} />
                            <span className="text-[10px]">{commentsByConfession[item.id]?.length || 0}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))
                )}
                  </>
                )}
             </div>
          </div>
        )}

        {activeTab === 'chat' && (
           <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
             {!activeChatTag && !previewGroup && (
                 <NetworkSection 
                     currentGuestId={guest.id} 
                     currentTags={guest.tags || ['general']} 
                     joinedGroups={joinedGroups}
                     onPreviewGroup={handlePreviewGroup} 
                     onInvitePerson={() => {}}
                     unreadGroupTags={unreadGroupTags} 
                 />
             )}
             {previewGroup && (
                 <div className="flex flex-col h-[65vh] justify-between bg-[#111] border border-[#333] rounded-2xl p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                     <div className="absolute top-0 left-0 w-full h-40 pointer-events-none"><div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#111] to-[#111] z-10"></div>{previewGroup.avatar_url && <img src={previewGroup.avatar_url} className="w-full h-full object-cover opacity-50 blur-sm" alt="group"/>}</div>
                     <div className="relative z-10">
                         <button onClick={() => setPreviewGroup(null)} className="absolute -top-2 -left-2 p-2.5 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md border border-white/10 z-20"><ArrowLeft size={18}/></button>
                         <div className="mt-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-tr from-[#222] to-[#333] border border-[#d4af37]/50 rounded-2xl mx-auto flex items-center justify-center text-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.15)] mb-4 overflow-hidden">{previewGroup.avatar_url ? <img src={previewGroup.avatar_url} className="w-full h-full object-cover" alt="avatar"/> : <Users size={36} strokeWidth={1.5} />}</div>
                            <h2 className="text-xl font-bold text-white">{previewGroup.name}</h2>
                            <p className="text-gray-400 text-xs mt-1">{loadingMembers ? "Đang tải thành viên..." : `${Math.max(previewMembers.length, previewGroup.member_count)} thành viên tham gia`}</p>
                         </div>
                         <div className="mt-8">
                             <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Thành viên tiêu biểu</h3>
                             <div className="flex -space-x-3 justify-center py-2 flex-wrap gap-y-2">{loadingMembers ? <Loader2 className="animate-spin text-[#d4af37]" /> : previewMembers.map((mem, idx) => (<div key={mem.id || idx} className="relative z-10" style={{ zIndex: 50 - idx }}>{mem.isHost ? (<div className="relative"><div className="w-12 h-12 rounded-full border-2 border-[#d4af37] bg-black flex items-center justify-center text-[#d4af37] font-bold text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)]">{mem.short}</div><div className="absolute -top-1.5 -right-1.5 bg-[#d4af37] text-black w-5 h-5 rounded-full flex items-center justify-center border border-black"><Crown size={10} fill="black" /></div></div>) : (<div className="w-12 h-12 rounded-full border-2 border-[#111] bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-gray-300">{mem.short}</div>)}</div>))}</div>
                             <p className="text-center text-[10px] text-gray-500 mt-3 italic opacity-70 px-4">{previewGroup.desc || "Chào mừng bạn tham gia nhóm chat!"}</p>
                         </div>
                     </div>
                     <div className="relative z-10 mt-4 space-y-3"><button onClick={handleJoinGroup} className="w-full py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[#d4af37]/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"><UserPlus size={18} /> Tham gia ngay</button></div>
                 </div>
             )}
             {activeChatTag && (
                 <div className="flex flex-col h-[70vh] animate-in slide-in-from-right-10 duration-300"><div className="flex-1 overflow-hidden relative border border-[#333] rounded-2xl bg-[#111] shadow-2xl"><ChatGroup currentUser={{...guest, avatar_url: getDisplayAvatar()}} groupTag={activeChatTag} onBack={() => setActiveChatTag(null)} onLeaveGroup={() => handleLeaveGroup(activeChatTag)} /></div></div>
             )}
           </div>
        )}
      </div>
        </div>
      )}

      {/* MODAL LƯU BÚT CHI TIẾT */}
      {selectedConfession && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] bg-[#111] border border-[#333] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#222] bg-[#0a0a0a]">
              <div className="flex items-center gap-3">
                {selectedConfession?.guest ? (
                  <>
                    <img 
                      src={getAvatarUrl(selectedConfession.guest?.avatar_url || '', selectedConfession.guest?.name || 'Guest')} 
                      alt={selectedConfession.guest?.name}
                      className="w-8 h-8 rounded-full object-cover border border-gray-600"
                    />
                    <span className="text-sm font-bold text-gray-200">{selectedConfession.guest?.name}</span>
                  </>
                ) : selectedConfession?.visibility !== 'everyone' ? (
                  <>
                    {selectedConfession?.visibility === 'everyone' ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">👥 Công khai</span>
                    ) : (
                      <span className="text-xs bg-gray-700/40 text-gray-300 px-2 py-1 rounded-full font-bold">🔒 Private</span>
                    )}
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && !selectedConfession.guest && (
                  <>
                    <button 
                      onClick={() => {
                        setIsEditing(true);
                        setEditContent(selectedConfession.content);
                        setConfessionVisibility(selectedConfession.visibility || 'admin');
                        setEditFile(null);
                      }}
                      className="p-2 hover:bg-[#222] rounded-full transition-colors text-blue-400"
                      title="Chỉnh sửa"
                    >
                      <Edit3 size={18}/>
                    </button>
                    <button 
                      onClick={() => handleDeleteConfession(selectedConfession.id)}
                      className="p-2 hover:bg-[#222] rounded-full transition-colors text-red-400"
                      title="Xóa"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </>
                )}
                <button onClick={() => {
                  setSelectedConfession(null);
                  setIsEditing(false);
                  setEditFile(null);
                }} className="p-2 hover:bg-[#222] rounded-full transition-colors">
                  <X size={20} className="text-gray-400"/>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto flex flex-col font-sans">
              {isEditing ? (
                // EDIT MODE
                <div className="p-6 space-y-4 flex-1">
                  {/* Ảnh */}
                  <div className="space-y-2">
                    <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Ảnh</p>
                    <div className="relative group">
                      {editFile ? (
                        <img src={URL.createObjectURL(editFile)} className="w-full h-64 object-cover rounded-xl border border-[#333]" alt="Preview" />
                      ) : selectedConfession.image_url ? (
                        <img src={selectedConfession.image_url} className="w-full h-64 object-cover rounded-xl border border-[#333]" alt="Ảnh hiện tại" />
                      ) : (
                        <div className="w-full h-64 bg-[#222] rounded-xl border border-[#333] flex items-center justify-center">
                          <p className="text-gray-500 text-sm">Chưa có ảnh</p>
                        </div>
                      )}
                      <button 
                        onClick={() => editFileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity"
                      >
                        <ImagePlus size={24} className="text-white"/>
                      </button>
                      <input type="file" ref={editFileInputRef} hidden accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] || null)}/>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="space-y-2">
                    <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Nội dung</p>
                    <textarea 
                      value={editContent} 
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm min-h-[120px] text-gray-200 focus:border-[#d4af37] outline-none resize-none"
                      placeholder="Hãy nhắn gửi điều gì đó..."
                    />
                  </div>

                  {/* Visibility */}
                  <div className="space-y-2">
                    <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Quyền hiển thị</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setConfessionVisibility('admin')}
                        className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${confessionVisibility === 'admin' ? 'bg-[#d4af37] text-black' : 'bg-[#222] text-gray-300 hover:bg-[#333]'}`}
                      >
                        🔒 Chỉ admin
                      </button>
                      <button 
                        onClick={() => setConfessionVisibility('everyone')}
                        className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${confessionVisibility === 'everyone' ? 'bg-[#d4af37] text-black' : 'bg-[#222] text-gray-300 hover:bg-[#333]'}`}
                      >
                        👥 Mọi người
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <>
                  {/* Ảnh */}
                  {selectedConfession.image_url && (
                    <img src={selectedConfession.image_url} className="w-full h-auto max-h-[50%] object-cover" alt="Kỷ niệm" />
                  )}

                  {/* Nội dung */}
                  <div className="p-6 space-y-4 flex-1">
                    <p className="text-gray-100 text-base leading-relaxed">{selectedConfession.content}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-[#222]">
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(selectedConfession.created_at).toLocaleDateString('vi-VN')} {new Date(selectedConfession.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Phản hồi từ admin */}
                    {(selectedConfession.likes_count > 0 || selectedConfession.admin_comment) && (
                      <div className="space-y-3">
                        {selectedConfession.likes_count > 0 && adminInfo && (
                          <div className="flex items-center gap-2 bg-[#d4af37]/10 p-3 rounded-xl">
                            <Heart size={16} className="fill-[#d4af37] text-[#d4af37]" />
                            <img
                              src={getAvatarUrl(adminInfo.avatar_url, adminInfo.name)}
                              alt={adminInfo.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="text-[#d4af37] text-sm font-bold">{adminInfo.name} đã thả tim</span>
                          </div>
                        )}

                        {selectedConfession.admin_comment && (
                          <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#333]">
                            <div className="flex items-center gap-2 mb-3">
                              {adminInfo && (
                                <>
                                  <img 
                                    src={getAvatarUrl(adminInfo.avatar_url, adminInfo.name)} 
                                    alt={adminInfo.name}
                                    className="w-8 h-8 rounded-full object-cover border border-[#d4af37]/30"
                                  />
                                  <span className="text-[#d4af37] text-xs font-black uppercase">{adminInfo.name}</span>
                                </>
                              )}
                            </div>
                            <p className="text-gray-200 text-sm leading-relaxed">{selectedConfession.admin_comment}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Guest Interactions Section - Only for public confessions */}
                    {selectedConfession.visibility === 'everyone' && (
                      <div className="space-y-4">
                        {/* Like Button */}
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleLikeConfession(selectedConfession.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                              guestLikes.has(selectedConfession.id)
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                            }`}
                          >
                            <Heart 
                              size={16} 
                              className={guestLikes.has(selectedConfession.id) ? 'fill-red-400' : ''}
                            />
                            {likesCounts[selectedConfession.id] || 0}
                          </button>
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-3 pt-4 border-t border-[#222]">
                          <p className="text-gray-400 text-xs uppercase font-black tracking-widest">💬 Bình luận ({commentsByConfession[selectedConfession?.id || '']?.length || 0})</p>
                          
                          {/* Comment Input */}
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              placeholder="Viết bình luận..."
                              className="flex-1 bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-[#d4af37] outline-none"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !isPostingComment) {
                                  handlePostComment(selectedConfession.id);
                                }
                              }}
                            />
                            <button 
                              onClick={() => handlePostComment(selectedConfession.id)}
                              disabled={isPostingComment || !commentInput.trim()}
                              className="bg-[#d4af37] text-black px-3 py-2 rounded-lg hover:bg-[#b89628] transition-colors disabled:opacity-50 flex items-center gap-2 font-bold text-sm"
                            >
                              {isPostingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                            </button>
                          </div>

                          {/* Comments List */}
                          <div className="space-y-2">
                            {commentsByConfession[selectedConfession?.id || ''] && commentsByConfession[selectedConfession?.id || ''].length > 0 ? commentsByConfession[selectedConfession?.id || ''].map((comment, idx) => {
                              const guestData = comment.guests && typeof comment.guests === 'object' ? (Array.isArray(comment.guests) ? comment.guests[0] : comment.guests) : null;
                              // Chỉ render khi đã có guest data đầy đủ
                              if (!guestData) return null;
                              return (
                              <div key={`${comment.id}-${idx}`} className="bg-[#0a0a0a] rounded-lg p-3 border border-[#333]">
                                <div className="flex items-center gap-2 mb-2">
                                  <img 
                                    src={getAvatarUrl(guestData.avatar_url || '', guestData.name || 'Guest')} 
                                    alt={guestData.name}
                                    className="w-6 h-6 rounded-full object-cover border border-gray-600"
                                  />
                                  <span className="text-gray-300 text-xs font-bold">{guestData.name}</span>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(comment.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-gray-200 text-sm leading-relaxed">{comment.content}</p>
                              </div>
                            );
                            }) : (
                              <div className="text-gray-500 text-xs italic text-center py-2">Chưa có bình luận</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer - Actions */}
            <div className="p-4 border-t border-[#222] bg-[#0a0a0a] space-y-2">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleEditConfession} 
                    disabled={isUpdating}
                    className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} Lưu thay đổi
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditFile(null);
                      setEditContent(selectedConfession.content);
                      setConfessionVisibility(selectedConfession.visibility || 'admin');
                    }}
                    className="w-full py-2 bg-[#222] text-gray-300 font-bold rounded-xl uppercase text-xs hover:bg-[#333] transition-colors"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <>
                  {selectedConfession.visibility === 'everyone' && (
                    <button onClick={() => { handleShare(selectedConfession); setSelectedConfession(null); }} className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                      <Share2 size={16} /> Chia sẻ lên các nền tảng
                    </button>
                  )}
                  {selectedConfession.visibility !== 'everyone' && (
                    <div className="w-full py-3 bg-gray-700/30 text-gray-400 text-center rounded-xl text-xs italic">
                      🔒 Chỉ hiển thị với admin - Chuyển sang "Mọi người" để chia sẻ
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-[#111]/90 backdrop-blur-xl border border-[#333] rounded-2xl p-2 flex justify-between shadow-2xl max-w-md mx-auto">
            <NavButton active={activeTab === 'wish'} icon={<Ticket size={20} />} label="Lưu bút" onClick={() => setActiveTab('wish')} />
            <NavButton active={activeTab === 'chat'} icon={<Users size={20} />} label="Kết nối" onClick={() => setActiveTab('chat')} badge={unreadCount} />
            <NavButton active={activeTab === 'card'} icon={<ImagePlus size={20} />} label="Xem thiệp" onClick={() => setActiveTab('card')} />
        </div>
      </div>
    </>
  );
}

function NavButton({ active, icon, label, onClick, badge }: any) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-300 ${active ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/20 -translate-y-1' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
      <div className="relative">
        {icon}
        {badge > 0 && <span className={`absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ${active ? 'ring-[#d4af37]' : 'ring-[#111]'}`}>{badge > 9 ? '9+' : badge}</span>}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}