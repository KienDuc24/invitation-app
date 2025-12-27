"use client";

import { useEffect, useState } from "react";
import { UserPlus, Users, Hash, Sparkles, ChevronRight, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- Types ---
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
  is_joined: boolean; // Trạng thái đã tham gia hay chưa
}

interface NetworkProps {
  currentGuestId: string;
  currentTags: string[];
  joinedGroups: string[]; // Danh sách các nhóm user đã tham gia
  onPreviewGroup: (group: ChatGroupInfo) => void; // Xem trước nhóm
  onInvitePerson: (personId: string, personName: string) => void; // Mời người
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
      // 1. Mockup danh sách nhóm gợi ý
      const mockGroups: ChatGroupInfo[] = currentTags.map((tag, idx) => ({
         id: `g-${idx}`,
         name: tag === 'general' ? 'Hội trường chính' : `Nhóm ${tag}`,
         tag_identifier: tag,
         member_count: Math.floor(Math.random() * 15) + 5,
         is_joined: joinedGroups.includes(tag)
      }));
      
      // Luôn đảm bảo có nhóm chung
      if (!mockGroups.find(g => g.tag_identifier === 'general')) {
          mockGroups.unshift({ 
              id: 'g-main', 
              name: 'Sảnh Chờ (Chung)', 
              tag_identifier: 'general', 
              member_count: 120,
              is_joined: joinedGroups.includes('general')
          });
      }

      setGroups(mockGroups);

      // 2. Lấy danh sách người có thể quen
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
  }, [currentGuestId, currentTags, joinedGroups]);

  if (loading) return <div className="py-10 flex justify-center"><div className="animate-spin w-5 h-5 border-2 border-orange-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-500">
      
      {/* === 1. GỢI Ý KẾT NỐI (Horizontal Scroll - No Scrollbar) === */}
      {people.length > 0 && (
        <div className="space-y-3">
            <h3 className="text-[#fadd7d] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Sparkles size={12} className="text-yellow-400" /> Có thể bạn quen
            </h3>
            
            {/* Ẩn scrollbar bằng inline-style */}
            <div 
                className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 snap-x scroll-smooth" 
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* Ẩn thanh cuộn cho Webkit (Chrome/Safari) */}
                <style jsx>{`
                    div::-webkit-scrollbar { display: none; }
                `}</style>

                {people.map((person) => (
                    <div key={person.id} className="snap-start flex-shrink-0 w-28 bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex flex-col items-center gap-2 relative group hover:border-[#d4af37]/50 transition-all shadow-sm">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-600">
                            {person.name.charAt(0)}
                        </div>
                        
                        {/* Info */}
                        <div className="text-center w-full">
                            <p className="text-xs font-bold text-white truncate w-full">{person.name}</p>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5">{person.mutual_tags[0]}</p>
                        </div>

                        {/* Button Invite */}
                        <button 
                            onClick={() => onInvitePerson(person.id, person.name)}
                            className="mt-1 w-full py-1.5 bg-[#222] hover:bg-[#d4af37] hover:text-black text-gray-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                            <UserPlus size={10} /> Mời
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* === 2. DANH SÁCH NHÓM (GỢI Ý) === */}
      <div className="space-y-3">
         <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Hash size={12} /> Các nhóm đề xuất
         </h3>
         
         <div className="grid grid-cols-1 gap-2">
            {groups.map((group) => (
                <button 
                    key={group.id}
                    onClick={() => onPreviewGroup(group)}
                    className="flex items-center justify-between bg-[#111] hover:bg-[#1a1a1a] border border-[#333] hover:border-[#d4af37]/40 p-3.5 rounded-xl transition-all group text-left shadow-sm active:scale-[0.98]"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors border ${group.is_joined ? 'bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/20' : 'bg-[#222] text-gray-400 border-transparent'}`}>
                            {group.is_joined ? <Users size={20} /> : <Lock size={18} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">
                                {group.name}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>{group.member_count} thành viên</span>
                                {group.is_joined ? (
                                    <span className="text-green-500 font-bold">• Đã tham gia</span>
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