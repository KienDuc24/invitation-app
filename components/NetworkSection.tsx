"use client";

import { useEffect, useState } from "react";
import { UserPlus, Users, Hash, Sparkles, ChevronRight, Lock, Loader2, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SuggestionPerson {
  id: string;
  name: string;
  is_confirmed: boolean;
  mutual_tags: string[];
}

export interface ChatGroupInfo {
  id: string;
  name: string;
  tag_identifier: string;
  member_count: number;
  is_joined: boolean;
  unread_count: number; // 👈 Thêm trường này
}

interface NetworkProps {
  currentGuestId: string;
  currentTags: string[];
  joinedGroups: string[]; 
  onPreviewGroup: (group: ChatGroupInfo) => void; 
  onInvitePerson: (personId: string, personName: string) => void; 
}

export default function NetworkSection({ 
    currentGuestId, 
    currentTags, 
    joinedGroups,
    onPreviewGroup, 
    onInvitePerson 
}: NetworkProps) {
  const [people, setPeople] = useState<SuggestionPerson[]>([]);
  const [groups, setGroups] = useState<ChatGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNetwork = async () => {
      // 1. Chuẩn bị danh sách Tag
      const tagsToFetch = [...currentTags];
      if (!tagsToFetch.includes('general')) tagsToFetch.unshift('general');

      // 2. Lấy thông tin lần cuối xem của User (last_viewed_at)
      const { data: memberData } = await supabase
          .from('group_members')
          .select('group_tag, last_viewed_at')
          .eq('guest_id', currentGuestId);

      const lastViewedMap: Record<string, string> = {};
      memberData?.forEach((m: any) => {
          lastViewedMap[m.group_tag] = m.last_viewed_at;
      });

      // 3. Fetch thông tin từng nhóm (Thành viên + Tin nhắn chưa đọc)
      const groupPromises = tagsToFetch.map(async (tag, idx) => {
          // A. Đếm thành viên
          const { count: memberCount } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_tag', tag);

          // B. Đếm tin nhắn chưa đọc (Nếu đã join)
          let unreadCount = 0;
          if (joinedGroups.includes(tag)) {
              const lastViewed = lastViewedMap[tag] || new Date(0).toISOString(); // Nếu chưa xem bao giờ thì lấy mốc 1970
              const { count } = await supabase
                  .from('messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('group_tag', tag)
                  .gt('created_at', lastViewed); // Lớn hơn thời gian xem lần cuối
              
              unreadCount = count || 0;
          }

          return {
              id: `g-${idx}`,
              name: tag === 'general' ? 'Hội trường chính' : `Nhóm ${tag}`,
              tag_identifier: tag,
              member_count: memberCount || 0,
              is_joined: joinedGroups.includes(tag),
              unread_count: unreadCount // Lưu vào state
          };
      });

      const resolvedGroups = await Promise.all(groupPromises);
      setGroups(resolvedGroups);

      // 4. Lấy danh sách gợi ý bạn bè (Giữ nguyên)
      try {
        if (currentTags.length > 0) {
            const { data: peopleData } = await supabase
                .from('guests')
                .select('id, name, is_confirmed, tags')
                .overlaps('tags', currentTags)
                .neq('id', currentGuestId)
                .limit(10);
            
            if (peopleData) {
                setPeople(peopleData.map(p => ({
                    ...p,
                    mutual_tags: p.tags?.filter((t: string) => currentTags.includes(t)) || []
                })));
            }
        }
      } catch (e) { console.error("Network error:", e) }

      setLoading(false);
    };

    fetchNetwork();
    
    // Subscribe Realtime để cập nhật tin nhắn mới ngay lập tức
    const channel = supabase
      .channel('network_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          setGroups(prev => prev.map(g => {
              if (g.tag_identifier === payload.new.group_tag) {
                  return { ...g, unread_count: g.unread_count + 1 };
              }
              return g;
          }));
      })
      .subscribe();

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
                    <div key={person.id} className="snap-start flex-shrink-0 w-28 bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex flex-col items-center gap-2 relative group hover:border-[#d4af37]/50 transition-all shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-600">
                            {person.name.charAt(0)}
                        </div>
                        <div className="text-center w-full">
                            <p className="text-xs font-bold text-white truncate w-full">{person.name}</p>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5">{person.mutual_tags[0]}</p>
                        </div>
                        <button onClick={() => onInvitePerson(person.id, person.name)} className="mt-1 w-full py-1.5 bg-[#222] hover:bg-[#d4af37] hover:text-black text-gray-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                            <UserPlus size={10} /> Mời
                        </button>
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
            {groups.map((group) => (
                <button 
                    key={group.id}
                    onClick={() => onPreviewGroup(group)}
                    className="flex items-center justify-between bg-[#111] hover:bg-[#1a1a1a] border border-[#333] hover:border-[#d4af37]/40 p-3.5 rounded-xl transition-all group text-left shadow-sm active:scale-[0.98] relative"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors border relative ${group.is_joined ? 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/20' : 'bg-[#222] text-gray-400 border-transparent'}`}>
                            {group.is_joined ? <Users size={20} /> : <Lock size={18} />}
                            
                            {/* 🔥 BADGE TIN NHẮN CHƯA ĐỌC */}
                            {group.unread_count > 0 && (
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-[#111] animate-bounce">
                                    {group.unread_count > 9 ? '9+' : group.unread_count}
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className={`font-bold text-sm transition-colors ${group.unread_count > 0 ? 'text-white' : 'text-gray-200'}`}>
                                {group.name}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>{group.member_count} thành viên</span>
                                {group.unread_count > 0 ? (
                                    <span className="text-[#d4af37] font-bold flex items-center gap-1">
                                        • Có tin nhắn mới
                                    </span>
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
            ))}
         </div>
      </div>
    </div>
  );
}