"use client";

import { supabase } from "@/lib/supabase";
import { ChevronRight, Hash, Loader2, Lock, MessageCircle, Shield, Sparkles, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";

// 1. CẤU HÌNH THÔNG TIN CÁC NHÓM CỐ ĐỊNH
const KNOWN_GROUPS: Record<string, any> = {
  'general': { name: "Hội trường chính", icon: Star, desc: "Sảnh chung cho tất cả khách mời" },
  'family': { name: "Gia đình", icon: Users, desc: "Nhóm dành riêng cho người nhà" },
  'friends': { name: "Hội bạn thân", icon: MessageCircle, desc: "Khu vực chém gió" },
  'vip': { name: "Khách VIP", icon: Shield, desc: "Khu vực khách mời đặc biệt" }
};

interface SuggestionPerson {
  id: string;
  name: string;
  is_confirmed: boolean;
  mutual_tags: string[];
  tags: string[];
}

export interface ChatGroupInfo {
  id: string;
  name: string;
  desc?: string;       
  icon?: any;          
  tag_identifier: string;
  member_count: number;
  is_joined: boolean;
  unread_count: number;
  avatar_url?: string;
}

interface PersonModalData {
  id: string;
  name: string;
  tags: string[];
}

// --- UPDATE 1: Thêm unreadGroupTags vào interface ---
interface NetworkProps {
  currentGuestId: string;
  currentTags: string[];
  joinedGroups: string[]; 
  onPreviewGroup: (group: ChatGroupInfo) => void; 
  onInvitePerson: (personId: string, personName: string) => void;
  unreadGroupTags?: string[]; // Thêm dòng này (có dấu ?)
  unreadCounts?: Record<string, number>; // Thêm unread count cho từng nhóm
}

export default function NetworkSection({ 
    currentGuestId, 
    currentTags, 
    joinedGroups,
    onPreviewGroup, 
    onInvitePerson,
    unreadGroupTags = [], // --- UPDATE 2: Nhận prop này (mặc định là mảng rỗng) ---
    unreadCounts = {}
}: NetworkProps) {
  const [people, setPeople] = useState<SuggestionPerson[]>([]);
  const [groups, setGroups] = useState<ChatGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<PersonModalData | null>(null);
  const [personGroups, setPersonGroups] = useState<ChatGroupInfo[]>([]);
  const [lastUnreadTimes, setLastUnreadTimes] = useState<Record<string, string>>({});

  const getGroupMetadata = (tag: string) => {
    if (KNOWN_GROUPS[tag]) return KNOWN_GROUPS[tag];
    return {
      name: `Nhóm ${tag.charAt(0).toUpperCase() + tag.slice(1)}`,
      icon: Hash,
      desc: "Nhóm thảo luận"
    };
  };

  useEffect(() => {
    const fetchNetwork = async () => {
      const uniqueTags = Array.from(new Set(['general', ...currentTags, ...joinedGroups]));

      const { data: memberData } = await supabase
          .from('group_members')
          .select('group_tag, last_viewed_at')
          .eq('guest_id', currentGuestId);

      const lastViewedMap: Record<string, string> = {};
      memberData?.forEach((m: any) => { lastViewedMap[m.group_tag] = m.last_viewed_at; });

      // Lấy thông tin từ DB
      const { data: customGroups } = await supabase.from('chat_groups').select('*').in('tag', uniqueTags);
      const customMap: Record<string, any> = {};
      customGroups?.forEach((g: any) => { customMap[g.tag] = g; });

      const groupPromises = uniqueTags.map(async (tag, idx) => {
          const defaultMeta = getGroupMetadata(tag);
          const customMeta = customMap[tag];

          const finalName = customMeta?.name || defaultMeta.name;
          const finalAvatar = customMeta?.avatar_url;
          const finalDesc = customMeta?.description || defaultMeta.desc; 

          const { count: memberCount } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_tag', tag);

          let unreadCount = 0;
          let lastUnreadTime = '';
          if (joinedGroups.includes(tag)) {
              const lastViewed = lastViewedMap[tag] || '2000-01-01T00:00:00.000Z';
              const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('group_tag', tag).gt('created_at', lastViewed);
              unreadCount = count || 0;
              
              // Fetch tin nhắn chưa đọc mới nhất
              if (unreadCount > 0) {
                const { data: lastMsg } = await supabase
                  .from('messages')
                  .select('created_at')
                  .eq('group_tag', tag)
                  .gt('created_at', lastViewed)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                
                if (lastMsg?.created_at) {
                  lastUnreadTime = lastMsg.created_at;
                }
              }
          }

          return {
              id: `g-${tag}`,
              name: finalName,
              desc: finalDesc,
              icon: defaultMeta.icon,
              tag_identifier: tag,
              member_count: memberCount || 0,
              is_joined: joinedGroups.includes(tag),
              unread_count: unreadCount,
              avatar_url: finalAvatar,
              lastUnreadTime: lastUnreadTime
          };
      });

      const resolvedGroups = await Promise.all(groupPromises);
      
      // Lưu lastUnreadTimes
      const unreadTimesMap: Record<string, string> = {};
      resolvedGroups.forEach(g => {
        if ((g as any).lastUnreadTime) {
          unreadTimesMap[g.tag_identifier] = (g as any).lastUnreadTime;
        }
      });
      setLastUnreadTimes(unreadTimesMap);
      
      const sortedGroups = resolvedGroups.sort((a, b) => {
         if (a.is_joined && !b.is_joined) return -1;
         if (!a.is_joined && b.is_joined) return 1;
         return 0;
      });

      setGroups(sortedGroups);

      try {
        if (currentTags.length > 0) {
            const { data: peopleData } = await supabase.from('guests').select('id, name, is_confirmed, tags').overlaps('tags', currentTags).neq('id', currentGuestId).limit(10);
            if (peopleData) {
                setPeople(peopleData.map(p => ({ ...p, mutual_tags: p.tags?.filter((t: string) => currentTags.includes(t)) || [] })));
            }
        }
      } catch (e) { console.error("Network error:", e) }

      setLoading(false);
    };

    fetchNetwork();
    
    const channel = supabase.channel('network_updates').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const newMsg = payload.new;
          // Cập nhật unread count và lastUnreadTime khi có tin nhắn mới
          setGroups(prev => prev.map(g => {
              if (g.tag_identifier === newMsg.group_tag && g.is_joined) { 
                return { ...g, unread_count: g.unread_count + 1 }; 
              }
              return g;
          }));
          
          // Cập nhật lastUnreadTime để sorting hoạt động
          setLastUnreadTimes(prev => ({
            ...prev,
            [newMsg.group_tag]: newMsg.created_at
          }));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [currentGuestId, currentTags, joinedGroups]);

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#d4af37]" /></div>;

  const handlePersonClick = async (person: SuggestionPerson) => {
    setSelectedPerson({
      id: person.id,
      name: person.name,
      tags: person.tags || []
    });

    // Lấy các nhóm chung (mutual groups) - nhóm mà cả hai người đều có tags
    const commonTags = (person.tags || []).filter(tag => currentTags.includes(tag));
    
    if (commonTags.length === 0) {
      setPersonGroups([]);
      return;
    }

    const { data: customGroups } = await supabase.from('chat_groups').select('*').in('tag', commonTags);
    const customMap: Record<string, any> = {};
    customGroups?.forEach((g: any) => { customMap[g.tag] = g; });

    const groupPromises = commonTags.map(async (tag) => {
        const defaultMeta = getGroupMetadata(tag);
        const customMeta = customMap[tag];

        const finalName = customMeta?.name || defaultMeta.name;
        const finalAvatar = customMeta?.avatar_url;
        const finalDesc = customMeta?.description || defaultMeta.desc; 

        const { count: memberCount } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_tag', tag);

        return {
            id: `g-${tag}`,
            name: finalName,
            desc: finalDesc,
            icon: defaultMeta.icon,
            tag_identifier: tag,
            member_count: memberCount || 0,
            is_joined: joinedGroups.includes(tag),
            unread_count: 0,
            avatar_url: finalAvatar 
        };
    });

    const resolvedGroups = await Promise.all(groupPromises);
    setPersonGroups(resolvedGroups);
  };

  // Tính tổng unread count
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-500">
      
      {/* 1. GỢI Ý KẾT NỐI */}
      {people.length > 0 && (
        <div className="space-y-3">
            <h3 className="text-[#fadd7d] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Sparkles size={12} className="text-yellow-400" /> Có thể bạn biết
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 snap-x scroll-smooth scrollbar-hide">
                <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
                {people.map((person) => (
                    <button
                        key={person.id}
                        onClick={() => handlePersonClick(person)}
                        className="snap-start flex-shrink-0 w-24 bg-[#1a1a1a] border border-[#333] hover:border-[#d4af37]/50 rounded-xl p-3 flex flex-col items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <div className="w-12 h-12 rounded-full bg-cover overflow-hidden border border-[#d4af37]/30"
                             style={{backgroundImage: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(person.name)}&backgroundColor=d4af37,111111')`}}>
                        </div>
                        <div className="text-center w-full">
                            <p className="text-xs font-bold text-white truncate w-full">{person.name}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* 2. DANH SÁCH NHÓM */}
      <div className="space-y-3">
         <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Hash size={12} /> Các nhóm
            {totalUnreadCount > 0 && (
              <span className="ml-auto bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
         </h3>
         
         <div className="grid grid-cols-1 gap-3" data-tutorial-chat-groups-list="true">
            {groups
              .sort((a, b) => {
                const aUnreadNum = unreadCounts[a.tag_identifier] || a.unread_count || 0;
                const bUnreadNum = unreadCounts[b.tag_identifier] || b.unread_count || 0;
                
                // Nếu chỉ một bên có tin chưa đọc, nó lên đầu
                if ((aUnreadNum > 0) !== (bUnreadNum > 0)) {
                  return (aUnreadNum > 0) ? -1 : 1;
                }
                
                // Nếu cả hai đều có tin chưa đọc, sắp xếp theo thời gian tin nhắn mới nhất
                if (aUnreadNum > 0 && bUnreadNum > 0) {
                  const aTime = lastUnreadTimes[a.tag_identifier] ? new Date(lastUnreadTimes[a.tag_identifier]).getTime() : 0;
                  const bTime = lastUnreadTimes[b.tag_identifier] ? new Date(lastUnreadTimes[b.tag_identifier]).getTime() : 0;
                  return bTime - aTime; // Tin nhắn mới nhất lên đầu
                }
                
                // Nếu cả hai đều không có tin chưa đọc, giữ nguyên thứ tự
                return 0;
              })
              .map((group) => {
                const Icon = group.icon || Hash;
                
                // --- UPDATE 3: Logic kiểm tra có tin mới (từ DB hoặc từ Realtime prop) ---
                const hasNewMessage = group.unread_count > 0 || unreadGroupTags.includes(group.tag_identifier);
                const unreadCountNum = unreadCounts[group.tag_identifier] || group.unread_count || 0;

                return (
                    <button 
                        key={group.id}
                        onClick={() => onPreviewGroup(group)}
                        className={`flex items-center justify-between bg-[#111] hover:bg-[#1a1a1a] border transition-all group text-left shadow-sm active:scale-[0.98] relative p-4 rounded-2xl ${hasNewMessage ? 'border-[#10b981]/50 hover:border-[#10b981]' : 'border-[#333] hover:border-[#d4af37]/40'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative"> 
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors border overflow-hidden ${group.is_joined ? 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/20' : 'bg-[#222] text-gray-400 border-transparent'}`}>
                                    {group.avatar_url ? (
                                        <img src={group.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        group.is_joined ? <Icon size={20} /> : <Lock size={18} />
                                    )}
                                </div>
                                {hasNewMessage && unreadCountNum > 0 && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-[#111] shadow-sm z-20">
                                        {unreadCountNum > 9 ? '9+' : unreadCountNum}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className={`font-bold text-sm transition-colors ${hasNewMessage ? 'text-white' : 'text-gray-200'}`}>
                                    {group.name}
                                </h4>
                                <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                                    <span>{group.member_count} thành viên</span>
                                    {hasNewMessage ? (
                                        <span className="text-[#d4af37] font-bold flex items-center gap-1 animate-pulse">• Có tin nhắn mới</span>
                                    ) : group.is_joined ? (
                                        <span className="text-green-500">• Đã tham gia</span>
                                    ) : (
                                        <span className="text-orange-400">• Ấn để xem</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-600 group-hover:text-[#d4af37] group-hover:translate-x-1 transition-all" />
                    </button>
                )
            })}
         </div>
      </div>

      {/* MODAL THÔNG TIN NGƯỜI DÙNG */}
      {selectedPerson && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPerson(null)}
        >
          <div 
            className="bg-[#111] border border-[#333] rounded-2xl max-w-sm w-full shadow-2xl p-6 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-4 text-center mb-6">
              <img
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(selectedPerson.name)}&backgroundColor=d4af37,111111`}
                alt={selectedPerson.name}
                className="w-20 h-20 rounded-full border-2 border-[#d4af37]"
              />
              <div>
                <h2 className="text-xl font-bold text-white">{selectedPerson.name}</h2>
                <p className="text-sm text-gray-400 mt-1">Tham gia {personGroups.length} nhóm</p>
              </div>
            </div>

            {/* Groups */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto mb-6">
              <p className="text-xs font-bold text-[#d4af37] uppercase tracking-wider px-2">Nhóm của người dùng</p>
              {personGroups.length > 0 ? (
                <div className="space-y-2">
                  {personGroups.map((group) => {
                    const Icon = group.icon || Hash;
                    return (
                      <div key={group.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#333] rounded-lg p-3 hover:border-[#d4af37]/30 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center text-[#d4af37] flex-shrink-0 border border-[#333]">
                          {group.avatar_url ? (
                            <img src={group.avatar_url} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Icon size={18} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{group.name}</p>
                          <p className="text-xs text-gray-500">{group.member_count} thành viên</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-4">Chưa tham gia nhóm nào</p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedPerson(null)}
              className="w-full bg-[#d4af37] hover:bg-[#e6c200] text-black font-bold py-2 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}