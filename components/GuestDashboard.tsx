"use client";

import MobileInvitation from "@/components/3d/InvitationCard";
import ChatGroup from "@/components/ChatGroup";
import FilmStoryTemplate from "@/components/FilmStoryTemplate";
import NetworkSection, { ChatGroupInfo } from "@/components/NetworkSection";
import ProjectorStory from "@/components/ProjectorStory";
import StoryTemplate from "@/components/StoryTemplate";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  BellRing,
  Camera,
  Check,
  Crown,
  Download,
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
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [myConfessions, setMyConfessions] = useState<any[]>([]);
  const [publicConfessions, setPublicConfessions] = useState<any[]>([]);
  const [selectedConfession, setSelectedConfession] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [confessionVisibility, setConfessionVisibility] = useState<'admin' | 'everyone'>('admin');
  const [wishTab, setWishTab] = useState<'my' | 'all'>('my');
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [guestComments, setGuestComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [guestLikes, setGuestLikes] = useState<Set<string>>(new Set());

  const [commentsByConfession, setCommentsByConfession] = useState<Record<string, any[]>>({});
  const [likersByConfession, setLikersByConfession] = useState<Record<string, any[]>>({}); // Source of truth for likes
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likersList, setLikersList] = useState<any[]>([]);
  const [selectedConfessionForLikers, setSelectedConfessionForLikers] = useState<any>(null);
  const [loadingLikes, setLoadingLikes] = useState<Set<string>>(new Set()); // Track which confessions are loading
  const [showImagePreviewModal, setShowImagePreviewModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // --- STORY SHARE STATE ---
  const [showStoryPreview, setShowStoryPreview] = useState(false);
  const [storyPreviewImage, setStoryPreviewImage] = useState<string>("");
  const [generatingStory, setGeneratingStory] = useState(false);
  const [showProjector, setShowProjector] = useState(false);
  const [projectorFrames, setProjectorFrames] = useState<any[]>([]);
  const [selectedConfessionForStory, setSelectedConfessionForStory] = useState<any>(null);
  const storyTemplateRef = useRef<HTMLDivElement>(null);
  const [storyViewMode, setStoryViewMode] = useState<'classic' | 'film'>('film'); // Story type selector

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
        if (data) {
          setAdminInfo(data);
        }
      } catch (e) {
        console.error('[fetchAdminInfo] Error:', e);
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
      
      // Xóa ảnh cũ từ storage nếu bị xóa
      if (deletedImageUrls.length > 0) {
        await Promise.all(deletedImageUrls.map(async (url) => {
          try {
            // Extract filename from URL
            const path = new URL(url).pathname;
            const fileName = path.split('/').slice(-3).join('/'); // Get "confessions/id/filename"
            await supabase.storage.from('invitation-media').remove([fileName]);
          } catch (err) {
            console.warn('Could not delete image:', url, err);
          }
        }));
      }
      
      // Upload ảnh mới nếu chọn
      if (editFiles.length > 0) {
        const uploadedUrls: string[] = await Promise.all(editFiles.map(async (file) => {
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          const fileName = `confessions/${selectedConfession.id}/${timestamp}-${randomId}`;
          
          console.log('[Upload] Starting upload:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('invitation-media')
            .upload(fileName, file, { upsert: true });
          
          if (uploadError) {
            console.error('[Upload] Error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          
          console.log('[Upload] Success:', uploadData);
          
          const { data: publicUrlData } = supabase.storage
            .from('invitation-media')
            .getPublicUrl(fileName);
          
          console.log('[Upload] Public URL:', publicUrlData?.publicUrl);
          
          return publicUrlData.publicUrl;
        }));
        
        console.log('[Upload] All uploaded URLs:', uploadedUrls);
        
        // Combine remaining old images and new images
        const existingUrls = parseImageUrls(selectedConfession.image_url).filter(
          url => !deletedImageUrls.includes(url)
        );
        console.log('[Upload] Existing URLs:', existingUrls);
        
        const allUrls = [...existingUrls, ...uploadedUrls];
        console.log('[Upload] All URLs combined:', allUrls);
        
        imageUrl = JSON.stringify(allUrls);
        console.log('[Upload] Final imageUrl:', imageUrl);
      } else if (deletedImageUrls.length > 0) {
        // Only delete, no new uploads
        const remainingUrls = parseImageUrls(selectedConfession.image_url).filter(
          url => !deletedImageUrls.includes(url)
        );
        imageUrl = remainingUrls.length > 0 ? JSON.stringify(remainingUrls) : null;
      }
      
      // Update confession via API route
      console.log('[Save] Updating with imageUrl:', imageUrl);
      
      const response = await fetch('/api/confessions/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confessionId: selectedConfession.id,
          content: editContent,
          visibility: confessionVisibility,
          imageUrl: imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      const result = await response.json();
      console.log('[Save] API response:', result);
      
      // Cập nhật local state
      const updatedConfession = {
        ...selectedConfession,
        content: editContent,
        image_url: imageUrl,
        visibility: confessionVisibility
      };
      
      console.log('[Save] Updated confession:', updatedConfession);
      
      setSelectedConfession(updatedConfession);
      setMyConfessions(myConfessions.map(c => 
        c.id === selectedConfession.id 
          ? updatedConfession
          : c
      ));
      
      setIsEditing(false);
      setEditFiles([]);
      setDeletedImageUrls([]);
      setCurrentImageIndex(0);  // Reset về ảnh đầu tiên
      alert('Đã lưu thay đổi thành công!');
    } catch (error: any) {
      console.error('[handleEditConfession] Error:', error?.message || error);
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
      console.error('[handleDeleteConfession] Error:', error?.message || error);
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
    
    if (data) {
      setMyConfessions(data);
      
      const confessionIds = data.map(c => c.id);
      
      const { data: allLikes } = await supabase
        .from('confession_likes')
        .select('*, guests(id, name, avatar_url)')
        .in('confession_id', confessionIds);
      
      const { data: allComments } = await supabase
        .from('confession_comments')
        .select('*')
        .in('confession_id', confessionIds);
      
      const likersByIdMap: Record<string, any[]> = {};
      const commentCounts: Record<string, any[]> = {};
      
      data.forEach(confession => {
        const userLikers = allLikes
          ?.filter(l => l.confession_id === confession.id)
          .map((l: any) => l.guests) || [];
        
        if (confession.likes_count > 0 && adminInfo) {
          likersByIdMap[confession.id] = [
            {
              id: adminInfo.id,
              name: adminInfo.name,
              avatar_url: adminInfo.avatar_url,
              isAdmin: true
            },
            ...userLikers
          ];
        } else {
          likersByIdMap[confession.id] = userLikers;
        }
        
        const confComments = allComments?.filter(c => c.confession_id === confession.id) || [];
        
        if (confession.admin_comment) {
          commentCounts[confession.id] = [
            { id: 'admin-comment', content: confession.admin_comment, guest_id: 'admin', created_at: confession.created_at, guests: { id: 'admin', name: 'Admin', avatar_url: null } },
            ...confComments
          ];
        } else {
          commentCounts[confession.id] = confComments;
        }
      });
      
      setLikersByConfession(likersByIdMap);
      setCommentsByConfession(commentCounts);
    }
  };

  const fetchPublicConfessions = async () => {
    console.log('🔄 [fetchPublicConfessions] Starting fetch');
    
    const { data } = await supabase
      .from('confessions')
      .select(`
        *,
        guest:guests(id, name, avatar_url)
      `)
      .eq('visibility', 'everyone')
      .order('created_at', { ascending: false });
    
    console.log('✅ [fetchPublicConfessions] Public confessions fetched:', data?.length || 0);
    
    if (data) setPublicConfessions(data);

    // Fetch user's likes
    const { data: likes } = await supabase
      .from('confession_likes')
      .select('confession_id')
      .eq('guest_id', guest.id);
    
    console.log('❤️ [fetchPublicConfessions] User likes:', likes?.length || 0, likes?.map(l => l.confession_id));
    
    if (likes) {
      const likeSet = new Set(likes.map(l => l.confession_id));
      setGuestLikes(likeSet);
    }

    // Fetch like/comment data in 2 batch queries
    if (data) {
      const confessionIds = data.map(c => c.id);
      console.log('📋 [fetchPublicConfessions] Processing', confessionIds.length, 'confessions');
      
      // Batch fetch ALL likes with guest data
      const { data: allLikes } = await supabase
        .from('confession_likes')
        .select('*, guests(id, name, avatar_url)')
        .in('confession_id', confessionIds);
      
      console.log('❤️ [fetchPublicConfessions] All likes fetched:', allLikes?.length || 0);
      
      // Batch fetch ALL comments
      const { data: allComments } = await supabase
        .from('confession_comments')
        .select('*')
        .in('confession_id', confessionIds);
      
      console.log('💬 [fetchPublicConfessions] All comments fetched:', allComments?.length || 0);
      
      // Build likers and comments maps
      const likersByIdMap: Record<string, any[]> = {};
      const commentCounts: Record<string, any[]> = {};
      
      data.forEach(confession => {
        // Build likers array with full user data
        const userLikers = allLikes
          ?.filter(l => l.confession_id === confession.id)
          .map((l: any) => l.guests) || [];
        
        console.log(`👥 [fetchPublicConfessions] Confession ${confession.id}: ${userLikers.length} user likes, admin_like=${confession.likes_count}`);
        
        // Add admin if liked
        if (confession.likes_count > 0 && adminInfo) {
          likersByIdMap[confession.id] = [
            {
              id: adminInfo.id,
              name: adminInfo.name,
              avatar_url: adminInfo.avatar_url,
              isAdmin: true
            },
            ...userLikers
          ];
          console.log(`✨ [fetchPublicConfessions] Added admin to confession ${confession.id}, total: ${likersByIdMap[confession.id].length}`);
        } else {
          likersByIdMap[confession.id] = userLikers;
          if (confession.likes_count > 0 && !adminInfo) {
            console.warn(`⚠️ [fetchPublicConfessions] Admin like flag set but adminInfo not loaded for ${confession.id}`);
          }
        }
        
        // Get comments for this confession
        const confComments = allComments?.filter(c => c.confession_id === confession.id) || [];
        
        if (confession.admin_comment) {
          commentCounts[confession.id] = [
            { id: 'admin-comment', content: confession.admin_comment, guest_id: 'admin', created_at: confession.created_at, guests: { id: 'admin', name: 'Admin', avatar_url: null } },
            ...confComments
          ];
        } else {
          commentCounts[confession.id] = confComments;
        }
      });
      
      console.log('📊 [fetchPublicConfessions] Final likersByIdMap:', likersByIdMap);
      console.log('📊 [fetchPublicConfessions] Final commentCounts:', commentCounts);
      
      setLikersByConfession(likersByIdMap);
      setCommentsByConfession(commentCounts);
      console.log('✅ [fetchPublicConfessions] State updated successfully');
    }
  };

  const fetchComments = async (confessionId: string) => {
    try {
      console.log('💬 [fetchComments] Starting fetch for confession:', confessionId);
      console.log('💬 [fetchComments] URL:', `/api/confessions/comments?confessionId=${confessionId}`);
      
      const response = await fetch(`/api/confessions/comments?confessionId=${confessionId}`);
      console.log('💬 [fetchComments] Response status:', response.status, response.statusText);
      console.log('💬 [fetchComments] Response headers:', response.headers);
      
      if (!response.ok) {
        console.error('❌ [fetchComments] Response NOT OK - status:', response.status);
        const errorData = await response.text();
        console.error('❌ [fetchComments] Error response body:', errorData);
        return;
      }
      
      const data = await response.json();
      console.log('✅ [fetchComments] Response data:', data);
      
      const comments = data.comments || [];
      console.log('✅ [fetchComments] Parsed comments:', comments?.length || 0, 'items');
      console.log('✅ [fetchComments] Comments details:', comments);
      
      // Store comments
      setCommentsByConfession(prev => { 
        const updated = { ...prev, [confessionId]: comments || [] };
        console.log('📝 [fetchComments] State updated. New comments for', confessionId, ':', comments?.length || 0);
        console.log('📝 [fetchComments] Full state:', updated);
        return updated;
      });
      
      // Update comment count - include admin comment if exists
      const confession = selectedConfession;
      const adminCommentCount = confession?.admin_comment ? 1 : 0;
      const totalComments = (comments?.length || 0) + adminCommentCount;
      console.log('📊 [fetchComments] Admin comment exists:', !!confession?.admin_comment);
      console.log('📊 [fetchComments] Total comments (user + admin):', totalComments);
      
    } catch (error) {
      console.error('❌ [fetchComments] CATCH ERROR:', error);
      console.error('❌ [fetchComments] Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ [fetchComments] Full error:', error);
    }
  };

  // --- HÀM TẠO STORY CHIA SẺ (PROJECTOR) ---
  const handleGenerateStory = async (confession: any) => {
    try {
      setGeneratingStory(true);

      // Parse ảnh từ confession - có thể là JSON string hoặc array
      let images: string[] = [];
      
      // Thử parse image_url trước (có thể là JSON string)
      if (confession.image_url) {
        try {
          if (typeof confession.image_url === 'string') {
            const parsed = JSON.parse(confession.image_url);
            if (Array.isArray(parsed)) {
              images = parsed.filter((url: string) => url && typeof url === 'string');
            } else {
              images = [confession.image_url];
            }
          } else if (Array.isArray(confession.image_url)) {
            images = confession.image_url.filter((url: string) => url && typeof url === 'string');
          }
        } catch {
          // Không phải JSON, dùng string trực tiếp
          if (typeof confession.image_url === 'string') {
            images = [confession.image_url];
          }
        }
      }
      
      // Fallback: thử image_urls
      if (images.length === 0 && confession.image_urls && Array.isArray(confession.image_urls)) {
        images = confession.image_urls.filter((url: string) => url && typeof url === 'string');
      }

      if (images.length === 0) {
        alert('Bài đăng này không có ảnh');
        setGeneratingStory(false);
        return;
      }

      // Lấy comments của bài đăng
      const comments = commentsByConfession[confession.id] || [];
      const commentCount = comments.length + (confession.admin_comment ? 1 : 0);
      console.log('🔍 Confession ID:', confession.id, 'Comments:', comments, 'Count:', commentCount);

      // Convert comments format cho ProjectorStory
      const formattedComments = comments.map((cmt: any) => {
        // Kiểm tra nhiều cách để lấy tên
        let userName = 'Guest';
        if (cmt.guests && typeof cmt.guests === 'object') {
          if (Array.isArray(cmt.guests)) {
            userName = cmt.guests[0]?.name || 'Guest';
          } else {
            userName = cmt.guests.name || 'Guest';
          }
        } else if (cmt.guest_name) {
          userName = cmt.guest_name;
        }
        return {
          user: userName,
          text: cmt.content || ''
        };
      });
      console.log('📝 Formatted comments:', formattedComments);

      // Tạo frames từ images
      const frames = images.map((imageUrl: string, idx: number) => ({
        id: `${confession.id}-${idx}`,
        image_url: imageUrl,
        comments: formattedComments, // Pass all formatted comments để ProjectorStory hiển thị
        likes: likersByConfession[confession.id]?.length || 0,
        commentCount: commentCount
      }));

      setProjectorFrames(frames);
      setSelectedConfessionForStory(confession);
      setShowProjector(true);

      console.log('✅ Projector story ready with', frames.length, 'frames');
    } catch (error) {
      console.error('❌ Error creating projector story:', error);
      alert('Lỗi tạo Story. Vui lòng thử lại!');
    } finally {
      setGeneratingStory(false);
    }
  };

  // --- HÀM TẢI STORY VỀ ---
  const handleDownloadStory = () => {
    if (!storyPreviewImage) return;
    
    const link = document.createElement('a');
    link.href = storyPreviewImage;
    const id = selectedConfessionForStory?.id || 'kyniem';
    link.download = `story-${typeof id === 'string' ? id.substring(0, 8) : 'kyniem'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- HÀM CHIA SẺ STORY ---
  const handleShareStory = async () => {
    try {
      if (!storyPreviewImage) return;

      // Convert data URL to Blob
      const response = await fetch(storyPreviewImage);
      const blob = await response.blob();

      // Check if Web Share API is available
      if (navigator.share) {
        const file = new File([blob], 'story.png', { type: 'image/png' });
        
        await navigator.share({
          files: [file],
          title: 'Kỷ Niệm Đặc Biệt',
          text: 'Chia sẻ kỷ niệm của tôi từ thiệp mời',
        });
        
        console.log('✅ Story shared successfully');
        setShowStoryPreview(false);
        setSelectedConfessionForStory(null);
      } else {
        // Fallback: Just download if share not supported
        handleDownloadStory();
        alert('Chia sẻ qua Web Share API không được hỗ trợ. Ảnh đã được tải về!');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error sharing story:', error);
        alert('Lỗi chia sẻ. Vui lòng thử lại!');
      }
    }
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

  const handleLikeConfession = async (confessionId: string) => {
    // Prevent double-click
    if (loadingLikes.has(confessionId)) return;
    
    try {
      setLoadingLikes(prev => new Set([...prev, confessionId]));
      console.log('❤️ [handleLikeConfession] Starting like action for:', confessionId);
      
      const response = await fetch('/api/confessions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId, guestId: guest.id })
      });
      const { liked } = await response.json();
      
      console.log('📊 [handleLikeConfession] Response:', {liked, status: response.status});
      
      const newLikes = new Set(guestLikes);
      if (liked) {
        console.log('✅ [handleLikeConfession] Added confession to guestLikes');
        newLikes.add(confessionId);
        
        // Update likersByConfession immediately - add self to likers
        setLikersByConfession(prev => {
          const existing = prev[confessionId] || [];
          const selfAlreadyExists = existing.some(l => l.id === guest.id);
          if (selfAlreadyExists) {
            console.log('⚠️ [handleLikeConfession] Self already in likers, skipping add');
            return prev;
          }
          const selfLiker = {
            id: guest.id,
            name: guest.name,
            avatar_url: guest.avatar_url || null
          };
          console.log('➕ [handleLikeConfession] Added self to likers array');
          return {
            ...prev,
            [confessionId]: [...existing, selfLiker]
          };
        });
      } else {
        console.log('🗑️ [handleLikeConfession] Removed confession from guestLikes');
        newLikes.delete(confessionId);
        
        // Update likersByConfession immediately - remove self from likers
        setLikersByConfession(prev => {
          const existing = prev[confessionId] || [];
          const newArray = existing.filter(l => l.id !== guest.id);
          console.log(`➖ [handleLikeConfession] Removed self from likers array, new count: ${newArray.length}`);
          return {
            ...prev,
            [confessionId]: newArray
          };
        });
      }
      setGuestLikes(newLikes);
      console.log('📝 [handleLikeConfession] Updated guestLikes set, total:', newLikes.size);
    } catch (error) {
      console.error('❌ [handleLikeConfession] Error:', error);
    } finally {
      setLoadingLikes(prev => {
        const next = new Set(prev);
        next.delete(confessionId);
        return next;
      });
    }
  };

  const fetchLikers = async (confessionId: string) => {
    try {
      console.log('🔄 [fetchLikers] Fetching likers for:', confessionId);
      
      const { data: likes } = await supabase
        .from('confession_likes')
        .select('*, guests(id, name, avatar_url)')
        .eq('confession_id', confessionId);
      
      console.log('❤️ [fetchLikers] Fetched user likes:', likes?.length || 0);
      
      let likers: any[] = likes?.map((l: any) => l.guests) || [];

      // Add admin liker if exists
      // Look in both myConfessions and publicConfessions
      let confession = myConfessions.find(c => c.id === confessionId) || publicConfessions.find(c => c.id === confessionId);
      console.log('🔍 [fetchLikers] Found confession:', confession?.id, 'admin_like:', confession?.likes_count);
      
      if (confession?.likes_count > 0 && adminInfo) {
        console.log('✨ [fetchLikers] Prepending admin to likers');
        likers.unshift({
          id: adminInfo.id,
          name: adminInfo.name,
          avatar_url: adminInfo.avatar_url,
          isAdmin: true
        });
      } else if (confession?.likes_count > 0 && !adminInfo) {
        console.log('⚠️ [fetchLikers] Admin like flag set but adminInfo not loaded');
      }

      // Update source of truth array
      console.log('📊 [fetchLikers] Final likers array:', likers.length, 'likers');
      setLikersByConfession(prev => ({
        ...prev,
        [confessionId]: likers
      }));
      
      setSelectedConfessionForLikers(confession);
      setShowLikersModal(true);
      console.log('✅ [fetchLikers] Likers modal opened');
    } catch (error) {
      console.error('❌ [fetchLikers] Error:', error);
    }
  };

  const handlePostComment = async (confessionId: string) => {
    if (!commentInput.trim()) {
      console.log('⚠️ [handlePostComment] Empty comment input, returning');
      return;
    }
    
    console.log('📝 [handlePostComment] === START POSTING COMMENT ===');
    console.log('📝 [handlePostComment] Confession ID:', confessionId);
    console.log('📝 [handlePostComment] Guest ID:', guest.id);
    console.log('📝 [handlePostComment] Comment content:', commentInput.trim().substring(0, 100) + '...');
    
    setIsPostingComment(true);
    try {
      const payload = { 
        confessionId, 
        guestId: guest.id, 
        content: commentInput 
      };
      console.log('📝 [handlePostComment] Sending POST request with payload:', payload);
      
      const response = await fetch('/api/confessions/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('📝 [handlePostComment] Response received - Status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📝 [handlePostComment] Response JSON:', data);
      
      if (!response.ok) {
        console.error('❌ [handlePostComment] Response NOT OK');
        console.error('❌ [handlePostComment] Error details:', data);
        alert(`Lỗi: ${data.details || data.error}`);
        setIsPostingComment(false);
        return;
      }
      
      console.log('✅ [handlePostComment] Comment posted successfully');
      console.log('✅ [handlePostComment] New comment:', data.comment);
      
      // Delay 500ms để đảm bảo comment đã lưu vào DB trước khi fetch
      console.log('⏳ [handlePostComment] Waiting 500ms before fetching fresh comments...');
      setTimeout(() => {
        console.log('🔄 [handlePostComment] NOW fetching fresh comments after post');
        fetchComments(confessionId);
      }, 500);
      setCommentInput("");
      console.log('📝 [handlePostComment] Comment input cleared');
      
    } catch (error) {
      console.error('❌ [handlePostComment] CATCH ERROR:', error);
      console.error('❌ [handlePostComment] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ [handlePostComment] Full error:', error);
      alert('Lỗi khi đăng bình luận');
    } finally {
      setIsPostingComment(false);
      console.log('📝 [handlePostComment] === END POSTING COMMENT ===');
    }
  };

  // --- UPDATE COMMENTS WITH ADMIN INFO ---
  useEffect(() => {
    if (!adminInfo || Object.keys(commentsByConfession).length === 0) return;
    
    const updatedComments = { ...commentsByConfession };
    for (const confessionId in updatedComments) {
      const comments = updatedComments[confessionId];
      const adminCommentIndex = comments.findIndex(c => c.id === 'admin-comment');
      if (adminCommentIndex !== -1 && adminInfo) {
        comments[adminCommentIndex] = {
          ...comments[adminCommentIndex],
          guests: {
            id: 'admin',
            name: adminInfo.name,
            avatar_url: adminInfo.avatar_url
          }
        };
      }
    }
    setCommentsByConfession(updatedComments);
  }, [adminInfo]);

  useEffect(() => {
    if (activeTab === 'wish') {
      fetchMyConfessions();
      fetchPublicConfessions();
    }
  }, [activeTab, sent]);

  // --- FETCH FRESH CONFESSION DATA WHEN MODAL OPENS ---
  const fetchFreshConfession = async (confessionId: string) => {
    try {
      const { data } = await supabase
        .from('confessions')
        .select(`
          *,
          guest:guests(id, name, avatar_url)
        `)
        .eq('id', confessionId)
        .single();
      
      if (data) {
        // Update selectedConfession with fresh data from DB
        setSelectedConfession(data);
        
        // Like count đã được tính từ fetchMyConfessions/fetchPublicConfessions
        // Chỉ cần fetch comments mới (realtime đã sync)
      }
    } catch (error) {
      console.error('Fetch fresh confession error:', error);
    }
  };

  // --- FETCH COMMENTS WHEN MODAL OPENS ---
  useEffect(() => {
    console.log('🔍 [useEffect] selectedConfession changed:', selectedConfession?.id);
    if (selectedConfession) {
      console.log('🔍 [useEffect] selectedConfession details:', {
        id: selectedConfession.id,
        visibility: selectedConfession.visibility,
        guestId: selectedConfession.guest_id,
        currentGuestId: guest.id
      });
      
      const canView = selectedConfession.visibility === 'everyone' || selectedConfession.guest_id === guest.id;
      console.log('🔍 [useEffect] Can view comments?', canView);
      
      if (canView) {
        console.log('🔍 [useEffect] Calling fetchFreshConfession');
        fetchFreshConfession(selectedConfession.id);
        
        console.log('🔍 [useEffect] Calling fetchComments');
        fetchComments(selectedConfession.id);
        
        setCommentInput("");
        console.log('🔍 [useEffect] Comment input cleared');
      } else {
        console.log('⚠️ [useEffect] Cannot view - not public and not author');
      }
    } else {
      console.log('🔍 [useEffect] selectedConfession is null/undefined');
    }
  }, [selectedConfession?.id]);

  // --- REALTIME LẮNG NGHE PHẢN HỒI TỪ ADMIN (FEED & ADMIN LIKE) ---
  useEffect(() => {
    const channel = supabase.channel(`confessions:${guest.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confessions', filter: `guest_id=eq.${guest.id}` },
        (payload: any) => {
          console.log('🔄 [Realtime] UPDATE my confession:', payload.new.id, {likes_count: payload.new.likes_count, admin_comment: !!payload.new.admin_comment});
          
          // Merge only updated fields, keep existing data like guest info
          setMyConfessions(prev => 
            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
          );
          
          // Update admin comment
          if (payload.new.admin_comment && !payload.old?.admin_comment) {
            console.log('💬 [Realtime] Admin comment added to', payload.new.id);
            setCommentsByConfession(prev => {
              const confessionId = payload.new.id;
              const comments = prev[confessionId] || [];
              const adminCommentExists = comments.some((c: any) => c.id === 'admin-comment');
              if (!adminCommentExists && adminInfo) {
                return {
                  ...prev,
                  [confessionId]: [{
                    id: 'admin-comment',
                    content: payload.new.admin_comment,
                    guest_id: 'admin',
                    created_at: new Date().toISOString(),
                    guests: { id: 'admin', name: adminInfo.name, avatar_url: adminInfo.avatar_url }
                  }, ...comments]
                };
              }
              return prev;
            });
          }
          
          // ✅ Update admin like in likersByConfession array
          if (payload.new.likes_count !== payload.old?.likes_count) {
            console.log('❤️ [Realtime] Admin like changed for', payload.new.id, ':', payload.old?.likes_count, '->', payload.new.likes_count);
            setLikersByConfession(prev => {
              const existingLikers = prev[payload.new.id] || [];
              const userLikersOnly = existingLikers.filter(l => !l.isAdmin);
              
              if (payload.new.likes_count === 1) {
                // Admin liked - prepend admin, keep all existing users
                const newArray = [{
                  id: adminInfo?.id || 'admin',
                  name: adminInfo?.name || 'Admin',
                  avatar_url: adminInfo?.avatar_url || null,
                  isAdmin: true
                }, ...userLikersOnly];
                console.log(`✨ [Realtime] Admin liked ${payload.new.id}, new total: ${newArray.length}`);
                return {
                  ...prev,
                  [payload.new.id]: newArray
                };
              } else {
                // Admin unliked - remove admin, keep all existing users
                console.log(`❌ [Realtime] Admin unliked ${payload.new.id}, new total: ${userLikersOnly.length}`);
                return {
                  ...prev,
                  [payload.new.id]: userLikersOnly
                };
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confessions', filter: `visibility=eq.everyone` },
        (payload: any) => {
          if (payload.new.guest_id !== guest.id) {
            // Merge only updated fields, keep existing data like guest info
            setPublicConfessions(prev =>
              prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
            );
            // Update admin comment
            if (payload.new.admin_comment && !payload.old?.admin_comment) {
              setCommentsByConfession(prev => {
                const confessionId = payload.new.id;
                const comments = prev[confessionId] || [];
                const adminCommentExists = comments.some((c: any) => c.id === 'admin-comment');
                if (!adminCommentExists && adminInfo) {
                  return {
                    ...prev,
                    [confessionId]: [{
                      id: 'admin-comment',
                      content: payload.new.admin_comment,
                      guest_id: 'admin',
                      created_at: new Date().toISOString(),
                      guests: { id: 'admin', name: adminInfo.name, avatar_url: adminInfo.avatar_url }
                    }, ...comments]
                  };
                }
                return prev;
              });
            }
            // ✅ Update admin like in likersByConfession array
            if (payload.new.likes_count !== payload.old?.likes_count) {
              setLikersByConfession(prev => {
                const existingLikers = prev[payload.new.id] || [];
                const userLikersOnly = existingLikers.filter(l => !l.isAdmin);
                
                if (payload.new.likes_count === 1) {
                  // Admin liked - prepend admin, keep all existing users
                  return {
                    ...prev,
                    [payload.new.id]: [{
                      id: adminInfo?.id || 'admin',
                      name: adminInfo?.name || 'Admin',
                      avatar_url: adminInfo?.avatar_url || null,
                      isAdmin: true
                    }, ...userLikersOnly]
                  };
                } else {
                  // Admin unliked - remove admin, keep all existing users
                  return {
                    ...prev,
                    [payload.new.id]: userLikersOnly
                  };
                }
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confessions', filter: `visibility=eq.everyone` },
        (payload: any) => {
          if (payload.new.guest_id !== guest.id) {
            setPublicConfessions(prev => [payload.new, ...prev]);
            // Initialize likersByConfession for new confession
            setLikersByConfession(prev => ({
              ...prev,
              [payload.new.id]: payload.new.likes_count === 1 && adminInfo ? [{
                id: adminInfo.id,
                name: adminInfo.name,
                avatar_url: adminInfo.avatar_url,
                isAdmin: true
              }] : []
            }));
            setCommentsByConfession(prev => ({
              ...prev,
              [payload.new.id]: payload.new.admin_comment ? [{
                id: 'admin-comment',
                content: payload.new.admin_comment,
                guest_id: 'admin',
                created_at: new Date().toISOString(),
                guests: { id: 'admin', name: adminInfo?.name || 'Admin', avatar_url: adminInfo?.avatar_url || null }
              }] : []
            }));
          }
        }
      )
      // --- REALTIME LIKES (Grid Display) ---
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confession_likes' },
        async (payload: any) => {
          console.log('➕ [Realtime Grid] User liked:', payload.new.confession_id, 'by guest:', payload.new.guest_id);
          
          // Fetch the new liker's user data
          const { data: user } = await supabase
            .from('guests')
            .select('id, name, avatar_url')
            .eq('id', payload.new.guest_id)
            .single();
          
          if (user) {
            // Add user to likers array (avoid duplicates)
            setLikersByConfession(prev => {
              const existing = prev[payload.new.confession_id] || [];
              // Check if user already exists
              const userExists = existing.some(l => l.id === user.id);
              if (userExists) {
                console.log('⚠️ [Realtime Grid] User already in likers, skipping', user.id);
                return prev;
              }
              const updated = [...existing, user];
              return {
                ...prev,
                [payload.new.confession_id]: updated
              };
            });
            console.log('✨ [Realtime Grid] Updated likers for', payload.new.confession_id);
            
            // If current user liked, update guestLikes
            if (payload.new.guest_id === guest.id) {
              console.log('❤️ [Realtime Grid] Current user liked, updating guestLikes');
              setGuestLikes(prev => {
                const newSet = new Set(prev);
                newSet.add(payload.new.confession_id);
                return newSet;
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'confession_likes' },
        async (payload: any) => {
          console.log('➖ [Realtime Grid] DELETE event - refetching all likers');
          
          // Refetch all likers for currently displayed confessions
          const allConfessionIds = [...publicConfessions, ...myConfessions].map(c => c.id);
          
          if (allConfessionIds.length === 0) return;
          
          const { data: allLikes } = await supabase
            .from('confession_likes')
            .select('*, guests(id, name, avatar_url)')
            .in('confession_id', allConfessionIds);
          
          console.log('🔄 [Realtime Grid] Refetched all likes:', allLikes?.length || 0);
          
          // Rebuild likersByConfession for all confessions
          const newLikersByConfession: Record<string, any[]> = {};
          
          allConfessionIds.forEach(confessionId => {
            const confessionLikes = (allLikes || []).filter(l => l.confession_id === confessionId);
            const userLikers = confessionLikes.map(l => l.guests);
            
            // Get the confession to check if admin liked
            const confession = publicConfessions.find(c => c.id === confessionId) ||
                             myConfessions.find(c => c.id === confessionId);
            
            let finalLikers = userLikers;
            if (confession?.likes_count === 1 && adminInfo) {
              // Admin liked - prepend admin
              finalLikers = [{
                id: adminInfo.id,
                name: adminInfo.name,
                avatar_url: adminInfo.avatar_url,
                isAdmin: true
              }, ...userLikers];
            }
            
            newLikersByConfession[confessionId] = finalLikers;
          });
          
          // Update state with all refetched data
          setLikersByConfession(prev => ({...prev, ...newLikersByConfession}));
        }
      )
      // --- REALTIME COMMENTS (Grid Display) ---
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confession_comments' },
        (payload: any) => {
          console.log('💬 [Realtime Grid] Comment added to:', payload.new.confession_id);
          
          // Update comments for the confession
          setCommentsByConfession(prev => {
            const confessionId = payload.new.confession_id;
            const existing = prev[confessionId] || [];
            return {
              ...prev,
              [confessionId]: [payload.new, ...existing]
            };
          });
          console.log('✨ [Realtime Grid] Updated comments for', payload.new.confession_id);
        }
      )
      .on('broadcast', { event: 'like_changed' }, (payload: any) => {
        console.log('📢 [Broadcast] Like changed:', payload.payload);
        const { confessionId, action, likeCount } = payload.payload;
        
        // Refetch all likers for this confession
        (async () => {
          const { data: allLikes } = await supabase
            .from('confession_likes')
            .select('*, guests(id, name, avatar_url)')
            .eq('confession_id', confessionId);
          
          const userLikers = (allLikes || []).map(l => l.guests);
          
          // Get the confession to check if admin liked
          const confession = publicConfessions.find(c => c.id === confessionId) ||
                           myConfessions.find(c => c.id === confessionId);
          
          let finalLikers = userLikers;
          if (confession?.likes_count === 1 && adminInfo) {
            finalLikers = [{
              id: adminInfo.id,
              name: adminInfo.name,
              avatar_url: adminInfo.avatar_url,
              isAdmin: true
            }, ...userLikers];
          }
          
          setLikersByConfession(prev => ({
            ...prev,
            [confessionId]: finalLikers
          }));
          
          console.log(`📢 [Broadcast] Updated likers for ${confessionId}: ${finalLikers.length}`);
        })();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [guest.id, adminInfo, publicConfessions, myConfessions]);

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
        async (payload: any) => {
          console.log('➕ [Realtime Modal] User liked:', payload.new.confession_id, 'by guest:', payload.new.guest_id);
          
          // Fetch the new liker's user data
          const { data: user } = await supabase
            .from('guests')
            .select('id, name, avatar_url')
            .eq('id', payload.new.guest_id)
            .single();
          
          if (user) {
            console.log('✨ [Realtime Modal] Added liker to modal:', user.id, user.name);
            // Add user to likers array (avoid duplicates)
            setLikersByConfession(prev => {
              const existing = prev[selectedConfession.id] || [];
              // Check if user already exists
              const userExists = existing.some(l => l.id === user.id);
              if (userExists) {
                console.log('⚠️ [Realtime Modal] User already in likers, skipping', user.id);
                return prev;
              }
              return {
                ...prev,
                [selectedConfession.id]: [...existing, user]
              };
            });
            
            // If current user liked, update guestLikes
            if (payload.new.guest_id === guest.id) {
              console.log('❤️ [Realtime Modal] Current user liked, updating guestLikes');
              setGuestLikes(prev => {
                const newSet = new Set(prev);
                newSet.add(payload.new.confession_id);
                return newSet;
              });
            }
          } else {
            console.log('⚠️ [Realtime Modal] Failed to fetch user data for:', payload.new.guest_id);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'confession_likes', filter: `confession_id=eq.${selectedConfession.id}` },
        async (payload: any) => {
          // Don't process DELETE events - they have incomplete data
          // Instead, refetch likers for current selected confession
          console.log('➖ [Realtime Modal] DELETE event received for confession:', selectedConfession.id);
          
          // Refetch updated likers from DB
          const { data: likes } = await supabase
            .from('confession_likes')
            .select('*, guests(id, name, avatar_url)')
            .eq('confession_id', selectedConfession.id);
          
          console.log('🔄 [Realtime Modal] Refetched likers:', likes?.length || 0);
          
          // Build likers array
          const userLikers = likes?.map((l: any) => l.guests) || [];
          
          let finalLikers = userLikers;
          if (selectedConfession.likes_count === 1 && adminInfo) {
            // Admin liked - prepend admin
            finalLikers = [{
              id: adminInfo.id,
              name: adminInfo.name,
              avatar_url: adminInfo.avatar_url,
              isAdmin: true
            }, ...userLikers];
            console.log('✨ [Realtime Modal] Admin still liked, total:', finalLikers.length);
          } else {
            console.log(`❌ [Realtime Modal] After unlike, total likers: ${finalLikers.length}`);
          }
          
          // Update state with refreshed data
          setLikersByConfession(prev => ({
            ...prev,
            [selectedConfession.id]: finalLikers
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confessions', filter: `id=eq.${selectedConfession.id}` },
        (payload: any) => {
          // Handle admin like/unlike
          if (payload.new.likes_count !== payload.old?.likes_count) {
            setLikersByConfession(prev => {
              const existingLikers = prev[selectedConfession.id] || [];
              const userLikersOnly = existingLikers.filter(l => !l.isAdmin);
              
              if (payload.new.likes_count === 1) {
                // Admin liked - prepend admin, keep all users
                return {
                  ...prev,
                  [selectedConfession.id]: [{
                    id: adminInfo?.id || 'admin',
                    name: adminInfo?.name || 'Admin',
                    avatar_url: adminInfo?.avatar_url || null,
                    isAdmin: true
                  }, ...userLikersOnly]
                };
              } else {
                // Admin unliked - remove admin, keep all users
                return {
                  ...prev,
                  [selectedConfession.id]: userLikersOnly
                };
              }
            });
          }
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
  
  // Derived count from likers array (source of truth)
  const getLikeCount = (confessionId: string) => 
    likersByConfession[confessionId]?.length || 0;
  
  // Get comment count including admin comments
  const getCommentCount = (confessionId: string): number => {
    const confession = publicConfessions.find(c => c.id === confessionId) || 
                       myConfessions.find(c => c.id === confessionId);
    const userComments = commentsByConfession[confessionId]?.length || 0;
    const adminComment = confession?.admin_comment ? 1 : 0;
    return userComments + adminComment;
  };
  
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
  const handleSendConfession = async () => { 
    if (!content && files.length === 0) return; 
    setUploading(true); 
    try { 
      let imageUrls: string[] = []; 
      
      // Upload multiple files
      if (files.length > 0) {
        imageUrls = await Promise.all(files.map(async (file) => {
          const fileExt = file.name.split('.').pop(); 
          const fileName = `${guest.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`; 
          const { error: uploadError } = await supabase.storage.from('invitation-media').upload(fileName, file); 
          if (uploadError) throw uploadError; 
          return supabase.storage.from('invitation-media').getPublicUrl(fileName).data.publicUrl; 
        }));
      }
      
      // Store as JSON array if multiple, or single URL if one image
      const imageData = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;
      
      await supabase.from('confessions').insert({ 
        guest_id: guest.id, 
        content: content, 
        image_url: imageData 
      }); 
      setSent(true); 
      setContent(""); 
      setFiles([]);
      setCurrentImageIndex(0);
    } catch (error: any) { 
      alert("Lỗi: " + error.message); 
    } finally { 
      setUploading(false); 
    } 
  };

  const handleNotificationClick = () => {
    if (notification?.groupTag && joinedGroups.includes(notification.groupTag)) {
        setActiveChatTag(notification.groupTag);
        setActiveTab('chat');
        markGroupAsRead(notification.groupTag);
    }
    setNotification(null);
  };

  // --- FULLSCREEN MODE EFFECT ---
  useEffect(() => {
    if (activeTab === 'card') {
      // Enter fullscreen when opening card tab
      document.documentElement.requestFullscreen().catch(() => {
        console.warn('Fullscreen request failed');
      });
    } else {
      // Exit fullscreen when leaving card tab
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          console.warn('Exit fullscreen failed');
        });
      }
    }
  }, [activeTab]);

  return (
    <>
      {activeTab === 'card' ? (
        // Hiển thị thiệp khi tab là 'card' - Fullscreen wrapper
        <div 
          className="fixed z-[99999] bg-[#050505] overflow-hidden"
          style={{
            width: '100vw',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <style>{`
            html, body {
              overflow: hidden !important;
              width: 100vw !important;
              height: 100vh !important;
              margin: 0 !important;
              padding: 0 !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
            }
          `}</style>
          <MobileInvitation 
            guestName={guest.name} 
            guestId={guest.id} 
            isConfirmed={true} 
            initialAttendance={guest.attendance} 
            initialWish={guest.wish} 
            onTabChange={(tab) => setActiveTab(tab)}
          />
        </div>
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
                        <button onClick={() => setSent(false)} className="text-xs text-[#d4af37] underline font-bold uppercase">Gửi thêm</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Lưu lại những kỷ niệm hoặc cùng chia sẻ với mọi người..." className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl p-3 text-sm min-h-[120px] text-gray-200 focus:border-[#d4af37] outline-none resize-none"/>
                        <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-[#222] rounded-xl text-gray-400 hover:text-white"><ImagePlus size={20}/></button>
                            <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])}/>
                            <button onClick={handleSendConfession} disabled={uploading} className="flex-1 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2">
                                {uploading ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>} Gửi ngay
                            </button>
                        </div>
                        {files.length > 0 && (
                          <div className="space-y-2">
                            <div className="relative rounded-xl overflow-hidden border border-[#333]">
                              <img 
                                src={URL.createObjectURL(files[currentImageIndex])} 
                                alt="Preview" 
                                className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  setPreviewImages(files.map(f => URL.createObjectURL(f)));
                                  setCurrentPreviewIndex(currentImageIndex);
                                  setShowImagePreviewModal(true);
                                }}
                              />
                              {files.length > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                                  {currentImageIndex + 1}/{files.length}
                                </div>
                              )}
                            </div>
                            {files.length > 1 && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : files.length - 1)}
                                  className="flex-1 bg-[#222] hover:bg-[#333] text-gray-300 py-2 rounded-lg text-xs font-bold transition-colors"
                                >
                                  ← Trước
                                </button>
                                <button 
                                  onClick={() => setCurrentImageIndex(prev => prev < files.length - 1 ? prev + 1 : 0)}
                                  className="flex-1 bg-[#222] hover:bg-[#333] text-gray-300 py-2 rounded-lg text-xs font-bold transition-colors"
                                >
                                  Tiếp →
                                </button>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {files.map((file, idx) => (
                                <div key={idx} className="relative group">
                                  <img 
                                    src={URL.createObjectURL(file)} 
                                    alt={`Thumbnail ${idx}`}
                                    className={`w-16 h-16 rounded-lg object-cover cursor-pointer border-2 transition-all ${
                                      idx === currentImageIndex ? 'border-[#d4af37]' : 'border-[#333] hover:border-[#d4af37]'
                                    }`}
                                    onClick={() => setCurrentImageIndex(idx)}
                                  />
                                  <button 
                                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-16 h-16 rounded-lg border-2 border-dashed border-[#333] hover:border-[#d4af37] flex items-center justify-center text-[#d4af37] hover:bg-[#222] transition-all text-xl font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
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
                    <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 cursor-pointer hover:border-[#d4af37] transition-all" onClick={() => {
                      setSelectedConfession(item);
                      setCurrentImageIndex(0);
                    }}>
                      {parseImageUrls(item.image_url).length > 0 && <img src={parseImageUrls(item.image_url)[0]} className="w-full h-48 object-cover border-b border-[#222]" alt="Kỷ niệm" />}
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


                        {/* Like & Comment Count */}
                        <div className="flex items-center gap-2 pt-3 border-t border-[#222] text-[11px] text-gray-500">
                          <div className="flex items-center gap-1 px-2 py-1">
                            <Heart size={12} />
                            <span className="text-[10px]">{getLikeCount(item.id)}</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1">
                            <MessageCircle size={12} />
                            <span className="text-[10px]">{getCommentCount(item.id)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
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
                                setEditFiles([]);
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
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleGenerateStory(item); }} className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-[#d4af37]" title="Tạo Story">
                                  <Camera size={14} /> 
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleShare(item); }} className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-green-400" title="Chia sẻ">
                                  <Share2 size={14} /> 
                                </button>
                              </>
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
                    <div key={item.id} className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 cursor-pointer hover:border-[#d4af37] transition-all" onClick={() => {
                      setSelectedConfession(item);
                      setCurrentImageIndex(0);
                    }}>
                      {parseImageUrls(item.image_url).length > 0 && <img src={parseImageUrls(item.image_url)[0]} className="w-full max-h-64 object-cover border-b border-[#222]" alt="Kỷ niệm" />}
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
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleGenerateStory(item); }} className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-[#d4af37]" title="Tạo Story">
                              <Camera size={14} /> 
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare(item); }} className="p-1.5 hover:bg-[#222] rounded-lg transition-colors text-green-400" title="Chia sẻ">
                              <Share2 size={14} /> 
                            </button>
                          </div>
                        </div>

                        {/* Guest Interactions Footer */}
                        <div className="flex items-center gap-2 pt-3 border-t border-[#222] text-[11px] text-gray-500 flex-wrap">
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
                            <span className="text-[10px]">{getLikeCount(item.id)}</span>
                          </button>
                          
                          {/* Admin Like Badge */}
                          {item.likes_count > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400">
                              <Heart 
                                size={10} 
                                className="fill-yellow-400"
                              />
                              <span className="text-[9px]">Admin</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 px-2 py-1 text-gray-500">
                            <MessageCircle size={12} />
                            <span className="text-[10px]">{getCommentCount(item.id)}</span>
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
                {!isEditing && selectedConfession?.guest_id === guest.id && (
                  <>
                    <button 
                      onClick={() => {
                        setIsEditing(true);
                        setEditContent(selectedConfession.content);
                        setConfessionVisibility(selectedConfession.visibility || 'admin');
                        setEditFiles([]);
                        setDeletedImageUrls([]);
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
                  setEditFiles([]);
                  setDeletedImageUrls([]);
                  setCurrentImageIndex(0);
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
                    <p className="text-gray-400 text-xs uppercase font-black tracking-widest">Ảnh ({editFiles.length + parseImageUrls(selectedConfession.image_url).length})</p>
                    <div className="space-y-2">
                      {editFiles.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-[10px] mb-2">Ảnh mới:</p>
                          <div className="flex flex-wrap gap-2">
                            {editFiles.map((file, idx) => (
                              <div key={idx} className="relative group">
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt={`New ${idx}`}
                                  className="w-16 h-16 rounded-lg object-cover border border-[#d4af37]"
                                />
                                <button 
                                  onClick={() => setEditFiles(editFiles.filter((_, i) => i !== idx))}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {parseImageUrls(selectedConfession.image_url).length > 0 && (
                        <div>
                          <p className="text-gray-500 text-[10px] mb-2">Ảnh hiện tại:</p>
                          <div className="flex flex-wrap gap-2">
                            {parseImageUrls(selectedConfession.image_url).map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img 
                                  src={url}
                                  alt={`Current ${idx}`}
                                  className={`w-16 h-16 rounded-lg object-cover border ${
                                    deletedImageUrls.includes(url) 
                                      ? 'border-red-500 opacity-50' 
                                      : 'border-[#333]'
                                  }`}
                                />
                                {!deletedImageUrls.includes(url) && (
                                  <button 
                                    onClick={() => setDeletedImageUrls([...deletedImageUrls, url])}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title="Xóa ảnh này"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                                {deletedImageUrls.includes(url) && (
                                  <button 
                                    onClick={() => setDeletedImageUrls(deletedImageUrls.filter(u => u !== url))}
                                    className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 text-[10px] font-bold z-10"
                                    title="Khôi phục ảnh"
                                  >
                                    ✓
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-full py-3 bg-[#222] hover:bg-[#333] text-gray-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <ImagePlus size={16} /> Thêm ảnh
                      </button>
                      <input 
                        type="file" 
                        ref={editFileInputRef} 
                        hidden 
                        accept="image/*" 
                        multiple 
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []);
                          setEditFiles(prev => [...prev, ...newFiles]);
                          // Reset input để có thể chọn file trùng lần 2
                          if (editFileInputRef.current) {
                            editFileInputRef.current.value = '';
                          }
                        }}
                      />
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
                  {parseImageUrls(selectedConfession.image_url).length > 0 && (
                    <div className="relative bg-black">
                      {(() => {
                        const images = parseImageUrls(selectedConfession.image_url);
                        return (
                          <>
                            <img 
                              src={images[currentImageIndex]} 
                              className="w-full h-auto max-h-[50%] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              alt={`Kỷ niệm ${currentImageIndex + 1}`}
                              onClick={() => {
                                setPreviewImages(images);
                                setCurrentPreviewIndex(currentImageIndex);
                                setShowImagePreviewModal(true);
                              }}
                            />
                            {images.length > 1 && (
                              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold">
                                {currentImageIndex + 1}/{images.length}
                              </div>
                            )}
                            {images.length > 1 && (
                              <div className="absolute bottom-4 left-4 flex gap-2">
                                <button 
                                  onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                                  className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded text-xs font-bold transition-colors"
                                >
                                  ←
                                </button>
                                <button 
                                  onClick={() => setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                                  className="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded text-xs font-bold transition-colors"
                                >
                                  →
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Nội dung */}
                  <div className="p-6 space-y-4 flex-1">
                    <p className="text-gray-100 text-base leading-relaxed">{selectedConfession.content}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-[#222]">
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(selectedConfession.created_at).toLocaleDateString('vi-VN')} {new Date(selectedConfession.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Guest Interactions Section - Only for public confessions or post author */}
                    {(selectedConfession.visibility === 'everyone' || selectedConfession.guest_id === guest.id) && (
                      <div className="space-y-4">
                        {/* Like Button */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <button 
                            onClick={() => handleLikeConfession(selectedConfession.id)}
                            disabled={loadingLikes.has(selectedConfession.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              guestLikes.has(selectedConfession.id)
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                            }`}
                          >
                            {loadingLikes.has(selectedConfession.id) ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Heart 
                                size={16} 
                                className={guestLikes.has(selectedConfession.id) ? 'fill-red-400' : ''}
                              />
                            )}
                            <span>
                              {getLikeCount(selectedConfession.id)}
                            </span>
                          </button>
                          

                          
                          {/* View Likers Button - Only for post author or admin */}
                          {(selectedConfession.guest_id === guest.id || guest.id === 'admin') && getLikeCount(selectedConfession.id) > 0 && (
                            <button 
                              onClick={() => fetchLikers(selectedConfession.id)}
                              className="text-xs text-gray-500 hover:text-[#d4af37] transition-colors px-2 py-1 rounded hover:bg-[#222]"
                            >
                              Xem ai đã thích
                            </button>
                          )}
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-3 pt-4 border-t border-[#222]">
                          <p className="text-gray-400 text-xs uppercase font-black tracking-widest">
                            💬 Bình luận ({getCommentCount(selectedConfession?.id || '')})
                          </p>
                          
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
                            {(() => {
                              const confId = selectedConfession?.id || '';
                              const comments = commentsByConfession[confId] || [];
                              console.log('📋 [Comments Section] Rendering comments for confession:', confId);
                              console.log('📋 [Comments Section] Comments in state:', comments);
                              console.log('📋 [Comments Section] Admin comment:', selectedConfession?.admin_comment || 'none');
                              console.log('📋 [Comments Section] Admin info:', adminInfo);
                              return null;
                            })()}
                            {selectedConfession.admin_comment && adminInfo && (
                              <div className="bg-[#0a0a0a] rounded-lg p-3 border border-[#333]">
                                <div className="flex items-center gap-2 mb-2">
                                  <img 
                                    src={getAvatarUrl(adminInfo.avatar_url || '', adminInfo.name || 'Admin')} 
                                    alt={adminInfo.name}
                                    className="w-6 h-6 rounded-full object-cover border border-gray-600"
                                  />
                                  <span className="text-gray-300 text-xs font-bold">{adminInfo.name}</span>
                                </div>
                                <p className="text-gray-200 text-sm leading-relaxed break-words overflow-hidden whitespace-pre-wrap">{selectedConfession.admin_comment}</p>
                              </div>
                            )}
                            {commentsByConfession[selectedConfession?.id || ''] && commentsByConfession[selectedConfession?.id || ''].length > 0 ? commentsByConfession[selectedConfession?.id || ''].map((comment, idx) => {
                              console.log(`🔍 [Comment Render] Comment ${idx}:`, comment);
                              
                              const guestData = comment.guests && typeof comment.guests === 'object' ? (Array.isArray(comment.guests) ? comment.guests[0] : comment.guests) : null;
                              console.log(`🔍 [Comment Render] Guest data for comment ${idx}:`, guestData);
                              
                              // Chỉ render khi đã có guest data đầy đủ
                              if (!guestData) {
                                console.warn(`⚠️ [Comment Render] No guest data for comment ${idx}, skipping render`);
                                return null;
                              }
                              
                              return (
                              <div key={`${comment.id}-${idx}`} className="bg-[#0a0a0a] rounded-lg p-3 border border-[#333]">
                                <div className="flex items-center gap-2 mb-2">
                                  <img 
                                    src={getAvatarUrl(guestData.avatar_url || '', guestData.name || 'Guest')} 
                                    alt={guestData.name}
                                    className="w-6 h-6 rounded-full object-cover border border-gray-600"
                                  />
                                  <span className="text-gray-300 text-xs font-bold">{guestData.name || 'Unknown'}</span>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(comment.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-gray-200 text-sm leading-relaxed break-words overflow-hidden whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            );
                            }) : (
                              !selectedConfession.admin_comment && <div className="text-gray-500 text-xs italic text-center py-2">Chưa có bình luận</div>
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
                      setEditFiles([]);
                      setEditContent(selectedConfession.content);
                      setConfessionVisibility(selectedConfession.visibility || 'admin');
                      setDeletedImageUrls([]);
                    }}
                    className="w-full py-2 bg-[#222] text-gray-300 font-bold rounded-xl uppercase text-xs hover:bg-[#333] transition-colors"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <>
                  {selectedConfession.visibility === 'everyone' && (
                    <button 
                      onClick={() => { 
                        handleGenerateStory(selectedConfession); 
                      }} 
                      className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b89628] text-black font-bold rounded-xl flex items-center justify-center gap-2 uppercase text-xs tracking-widest hover:shadow-lg hover:shadow-[#d4af37]/30 transition-all active:scale-95"
                    >
                      <Camera size={16} /> Tạo Video Kỷ niệm
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

      {/* LIKERS MODAL */}
      {showLikersModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={() => setShowLikersModal(false)}
        >
          <div 
            className="bg-[#111] rounded-2xl max-w-sm w-full max-h-[60vh] flex flex-col shadow-2xl overflow-hidden border border-[#333]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#0a0a0a]">
              <h3 className="text-lg font-bold text-[#d4af37]">Những ai đã thích</h3>
              <button 
                onClick={() => setShowLikersModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Likers List */}
            <div className="flex-1 overflow-y-auto">
              {(likersByConfession[selectedConfessionForLikers?.id] || []).length > 0 ? (
                <div className="space-y-2 p-4">
                  {(likersByConfession[selectedConfessionForLikers?.id] || []).map((liker: any) => (
                    <div 
                      key={liker.id}
                      className={`flex items-center gap-3 p-3 rounded-xl hover:transition-colors border ${
                        liker.isAdmin 
                          ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10 hover:border-yellow-500/30' 
                          : 'bg-[#0f0f0f] border-[#222] hover:bg-[#1a1a1a] hover:border-[#333]'
                      }`}
                    >
                      <img 
                        src={getAvatarUrl(liker.avatar_url || '', liker.name || 'Guest')}
                        alt={liker.name}
                        className={`w-8 h-8 rounded-full object-cover ${
                          liker.isAdmin ? 'border-yellow-400' : 'border-[#333]'
                        }`}
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${
                          liker.isAdmin ? 'text-yellow-400' : 'text-gray-200'
                        }`}>
                          {liker.name}
                        </p>
                      </div>
                      {liker.isAdmin && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-bold">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
                  Chưa có ai thích bài viết này
                </div>
              )}
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
            ) : (
              <img 
                src={previewImageUrl} 
                alt="Full preview" 
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
            <button 
              onClick={() => setShowImagePreviewModal(false)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* HIDDEN STORY TEMPLATE - For html2canvas */}
      <style>{`
        @layer components {
          * { --tw-*: initial; }
        }
      `}</style>
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', zIndex: -1 }}>
        {storyViewMode === 'classic' ? (
          <StoryTemplate
            ref={storyTemplateRef}
            content={selectedConfessionForStory?.content || ''}
            author={(selectedConfessionForStory?.guest?.name || selectedConfessionForStory?.guests?.name) || 'Ẩn danh'}
            avatarUrl={selectedConfessionForStory?.guest?.avatar_url || selectedConfessionForStory?.guests?.avatar_url}
            date={selectedConfessionForStory ? new Date(selectedConfessionForStory.created_at).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }) : ''}
            postImage={selectedConfessionForStory?.image_url ? (Array.isArray(selectedConfessionForStory.image_url) ? selectedConfessionForStory.image_url[0] : selectedConfessionForStory.image_url) : undefined}
            likesCount={getLikeCount(selectedConfessionForStory?.id)}
            commentsCount={getCommentCount(selectedConfessionForStory?.id)}
            commentsList={commentsByConfession[selectedConfessionForStory?.id]?.slice(0, 3).map((c: any) => ({
              author: c.guests?.name || 'Ẩn danh',
              text: c.content,
              avatar: c.guests?.avatar_url,
            }))}
          />
        ) : (
          <FilmStoryTemplate
            ref={storyTemplateRef}
            content={selectedConfessionForStory?.content || ''}
            author={(selectedConfessionForStory?.guest?.name || selectedConfessionForStory?.guests?.name) || 'Ẩn danh'}
            avatarUrl={selectedConfessionForStory?.guest?.avatar_url || selectedConfessionForStory?.guests?.avatar_url}
            date={selectedConfessionForStory ? new Date(selectedConfessionForStory.created_at).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }) : ''}
            postImage={selectedConfessionForStory?.image_url ? (Array.isArray(selectedConfessionForStory.image_url) ? selectedConfessionForStory.image_url[0] : selectedConfessionForStory.image_url) : undefined}
            commentsList={commentsByConfession[selectedConfessionForStory?.id]?.slice(0, 3).map((c: any) => ({
              author: c.guests?.name || 'Ẩn danh',
              text: c.content,
              avatar: c.guests?.avatar_url,
            })) || []}
            likesCount={getLikeCount(selectedConfessionForStory?.id)}
          />
        )}
      </div>

      {/* STORY PREVIEW MODAL */}
      {showStoryPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: storyViewMode === 'film' ? 'black' : 'rgba(0, 0, 0, 0.95)',
            backdropFilter: storyViewMode === 'classic' ? 'blur(4px)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: storyViewMode === 'classic' ? '16px' : '0',
            cursor: storyViewMode === 'classic' ? 'pointer' : 'default',
          }}
          onClick={() => storyViewMode === 'classic' && setShowStoryPreview(false)}
        >
          {/* Film Mode - Show Interactive Component */}
          {storyViewMode === 'film' ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <FilmStoryTemplate
                content={selectedConfessionForStory?.content || ''}
                author={(selectedConfessionForStory?.guest?.name || selectedConfessionForStory?.guests?.name) || 'Ẩn danh'}
                avatarUrl={selectedConfessionForStory?.guest?.avatar_url || selectedConfessionForStory?.guests?.avatar_url}
                date={selectedConfessionForStory ? new Date(selectedConfessionForStory.created_at).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                }) : ''}
                postImage={selectedConfessionForStory?.image_url ? (Array.isArray(selectedConfessionForStory.image_url) ? selectedConfessionForStory.image_url[0] : selectedConfessionForStory.image_url) : undefined}
                commentsList={commentsByConfession[selectedConfessionForStory?.id]?.slice(0, 3).map((c: any) => ({
                  author: c.guests?.name || 'Ẩn danh',
                  text: c.content,
                  avatar: c.guests?.avatar_url,
                })) || []}
                likesCount={getLikeCount(selectedConfessionForStory?.id)}
              />
              {/* Close button for Film mode */}
              <button
                onClick={() => setShowStoryPreview(false)}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            /* Classic Mode - Show Image Preview */
            <div 
              style={{
                width: '100%',
                maxWidth: '448px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px',
                animation: 'fadeIn 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* View Mode Selector */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '12px',
                  padding: '4px',
                  border: '1px solid #333',
                  width: '100%',
                  maxWidth: '448px',
                }}
              >
                <button
                  onClick={() => setStoryViewMode('classic')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: (storyViewMode as string) === 'classic' ? '#d4af37' : 'transparent',
                    color: (storyViewMode as string) === 'classic' ? 'black' : '#a0a0a0',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } as React.CSSProperties}
                  title="Kinh điển"
                >
                  ✨ Kinh Điển
                </button>
                <button
                  onClick={() => setStoryViewMode('film')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: (storyViewMode as string) === 'film' ? '#d4af37' : 'transparent',
                    color: (storyViewMode as string) === 'film' ? 'black' : '#a0a0a0',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  } as React.CSSProperties}
                  title="Thước phim kỷ niệm"
                >
                  🎬 Thước Phim
                </button>
              </div>

              {/* Story Preview Image */}
              <div 
                style={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 25px rgba(0, 0, 0, 0.5)',
                  border: '2px solid rgba(212, 175, 55, 0.5)',
                  width: '100%',
                  maxWidth: '448px',
                  aspectRatio: '9 / 16',
                  backgroundColor: 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {storyPreviewImage && (
                  <img
                    src={storyPreviewImage}
                    alt="Story preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div 
                style={{
                  display: 'flex',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '448px',
                }}
              >
                {/* Download Button */}
                <button
                  onClick={handleDownloadStory}
                  disabled={generatingStory}
                  style={{
                    flex: 1,
                    backgroundColor: '#d4af37',
                    color: 'black',
                    fontWeight: 'bold',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: generatingStory ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)',
                    opacity: generatingStory ? 0.5 : 1,
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => !generatingStory && (e.currentTarget.style.backgroundColor = '#c9a227')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#d4af37')}
                >
                  <Download size={18} />
                  Tải về
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShareStory}
                  disabled={generatingStory}
                  style={{
                    flex: 1,
                    backgroundColor: '#16a34a',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: generatingStory ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    fontSize: '12px',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(22, 163, 74, 0.2)',
                    opacity: generatingStory ? 0.5 : 1,
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => !generatingStory && (e.currentTarget.style.backgroundColor = '#15803d')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
                >
                  <Share2 size={18} />
                  Chia sẻ
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowStoryPreview(false)}
                style={{
                  color: '#a0a0a0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  fontWeight: 'bold',
                  transition: 'color 0.3s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a0a0a0')}
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      )}

      {/* PROJECTOR STORY */}
      {showProjector && selectedConfessionForStory && (
        <ProjectorStory
          postImage={
            typeof selectedConfessionForStory?.image_url === 'string'
              ? selectedConfessionForStory.image_url.startsWith('[')
                ? JSON.parse(selectedConfessionForStory.image_url)
                : [selectedConfessionForStory.image_url]
              : Array.isArray(selectedConfessionForStory?.image_url)
              ? selectedConfessionForStory.image_url
              : undefined
          }
          content={selectedConfessionForStory?.content}
          comments={selectedConfessionForStory?.comments || []}
          authorName={
            selectedConfessionForStory?.guests?.name || 
            selectedConfessionForStory?.guest?.name || 
            selectedConfessionForStory?.guest_name ||
            guest?.name || 
            "Guest"
          }
          onClose={() => setShowProjector(false)}
        />
      )}

      {/* BOTTOM NAV - Ẩn khi ở tab 'card' */}
      {activeTab !== 'card' && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          right: '24px',
          zIndex: 50,
          animation: 'slideInFromBottom 0.3s ease-out',
        }}>
          <div style={{
            backgroundColor: 'rgba(17, 17, 17, 0.9)',
            backdropFilter: 'blur(24px)',
            border: '1px solid #333',
            borderRadius: '18px',
            padding: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.5)',
            maxWidth: '448px',
            margin: '0 auto',
            transition: 'all 0.3s ease',
          }}>
              <NavButton active={activeTab === 'wish'} icon={<Ticket size={20} />} label="Lưu bút" onClick={() => setActiveTab('wish')} />
              <NavButton active={activeTab === 'chat'} icon={<Users size={20} />} label="Kết nối" onClick={() => setActiveTab('chat')} badge={unreadCount} />
              <NavButton active={false} icon={<ImagePlus size={20} />} label="Xem thiệp" onClick={() => setActiveTab('card')} />
          </div>
        </div>
      )}
    </>
  );
}

function NavButton({ active, icon, label, onClick, badge }: any) {
  return (
    <button 
      onClick={onClick} 
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '12px 0',
        borderRadius: '12px',
        transition: 'all 0.3s ease',
        backgroundColor: active ? '#d4af37' : 'transparent',
        color: active ? 'black' : '#808080',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = 'white';
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = '#808080';
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      <div style={{ position: 'relative' }}>
        {icon}
        {badge > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            display: 'flex',
            height: '16px',
            minWidth: '16px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '9999px',
            backgroundColor: '#dc2626',
            padding: '0 4px',
            fontSize: '9px',
            fontWeight: 'bold',
            color: 'white',
            border: `2px solid ${active ? '#d4af37' : '#111'}`,
            boxShadow: `0 0 0 2px ${active ? '#d4af37' : '#111'}`,
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span style={{
        fontSize: '9px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </span>
    </button>
  );
}