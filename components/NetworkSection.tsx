"use client";

import { useEffect, useState } from "react";
import { Users, Hash, Sparkles, ChevronRight, Lock, Loader2, Star, MessageCircle, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

// --- UPDATE 1: Thêm unreadGroupTags vào interface ---
interface NetworkProps {
  currentGuestId: string;
  currentTags: string[];
  joinedGroups: string[]; 
  onPreviewGroup: (group: ChatGroupInfo) => void; 
  onInvitePerson: (personId: string, personName: string) => void;
  unreadGroupTags?: string[]; // Thêm dòng này (có dấu ?)
}

export default function NetworkSection({ 
    currentGuestId, 
    currentTags, 
    joinedGroups,
    onPreviewGroup, 
    onInvitePerson,
    unreadGroupTags = [] // --- UPDATE 2: Nhận prop này (mặc định là mảng rỗng) ---
}: NetworkProps) {
  const [people, setPeople] = useState<SuggestionPerson[]>([]);
  const [groups, setGroups] = useState<ChatGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);

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
          if (joinedGroups.includes(tag)) {
              const lastViewed = lastViewedMap[tag] || '2000-01-01T00:00:00.000Z';
              const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('group_tag', tag).gt('created_at', lastViewed);
              unreadCount = count || 0;
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
              avatar_url: finalAvatar 
          };
      });

      const resolvedGroups = await Promise.all(groupPromises);
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
          setGroups(prev => prev.map(g => {
              if (g.tag_identifier === payload.new.group_tag && g.is_joined) { return { ...g, unread_count: g.unread_count + 1 }; }
              return g;
          }));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };

  }, [currentGuestId, currentTags, joinedGroups]);

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#d4af37]" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-500">
      
      {/* 1. GỢI Ý KẾT NỐI */}
      {people.length > 0 && (
        <div className="space-y-3">
            <h3 className="text-[#fadd7d] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Sparkles size={12} className="text-yellow-400" /> Có thể bạn quen
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 snap-x scroll-smooth scrollbar-hide">
                <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
                {people.map((person) => (
                    <div key={person.id} className="snap-start flex-shrink-0 w-24 bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex flex-col items-center gap-2 relative group hover:border-[#d4af37]/50 transition-all shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-600">
                            {person.name.charAt(0)}
                        </div>
                        <div className="text-center w-full">
                            <p className="text-xs font-bold text-white truncate w-full">{person.name}</p>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5">{person.mutual_tags[0]}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* 2. DANH SÁCH NHÓM */}
      <div className="space-y-3">
         <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Hash size={12} /> Các nhóm đề xuất
         </h3>
         
         <div className="grid grid-cols-1 gap-2">
            {groups.map((group) => {
                const Icon = group.icon || Hash;
                
                // --- UPDATE 3: Logic kiểm tra có tin mới (từ DB hoặc từ Realtime prop) ---
                const hasNewMessage = group.unread_count > 0 || unreadGroupTags.includes(group.tag_identifier);

                return (
                    <button 
                        key={group.id}
                        onClick={() => onPreviewGroup(group)}
                        className="flex items-center justify-between bg-[#111] hover:bg-[#1a1a1a] border border-[#333] hover:border-[#d4af37]/40 p-3.5 rounded-xl transition-all group text-left shadow-sm active:scale-[0.98] relative"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative"> 
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors border overflow-hidden ${group.is_joined ? 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/20' : 'bg-[#222] text-gray-400 border-transparent'}`}>
                                    {group.avatar_url ? (
                                        <img src={group.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        group.is_joined ? <Icon size={20} /> : <Lock size={18} />
                                    )}
                                </div>
                                {hasNewMessage && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full border-2 border-[#111] animate-bounce shadow-sm z-20">
                                        {group.unread_count > 9 ? '9+' : (group.unread_count || '!')}
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
    </div>
  );
}