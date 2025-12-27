"use client";

import { useEffect, useState } from "react";
import { UserPlus, Users, Hash, Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- Types ---
interface SuggestionPerson {
  id: string;
  name: string;
  is_confirmed: boolean;
  mutual_tags: string[];
}

interface ChatGroupInfo {
  id: string;
  name: string;
  tag_identifier: string;
  member_count?: number;
}

interface NetworkProps {
  currentGuestId: string;
  currentTags: string[];
  onSelectGroup: (groupTag: string) => void; // Callback khi chọn nhóm
  onAddMember: (personId: string, personName: string) => void; // Callback khi thêm người
}

export default function NetworkSection({ currentGuestId, currentTags, onSelectGroup, onAddMember }: NetworkProps) {
  const [people, setPeople] = useState<SuggestionPerson[]>([]);
  const [groups, setGroups] = useState<ChatGroupInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNetwork = async () => {
      // 1. Tạo danh sách nhóm dựa trên Tags của khách
      // (Luôn có nhóm 'general' - Sảnh chờ)
      const mockGroups = currentTags.map((tag, idx) => ({
         id: `g-${idx}`,
         name: `Nhóm ${tag}`, // Bạn có thể map tên đẹp hơn nếu muốn
         tag_identifier: tag,
         member_count: Math.floor(Math.random() * 10) + 2
      }));
      
      // Đưa nhóm chung lên đầu
      if (!mockGroups.find(g => g.tag_identifier === 'general')) {
          mockGroups.unshift({ id: 'g-main', name: 'Sảnh Chờ (Chung)', tag_identifier: 'general', member_count: 100 });
      }

      setGroups(mockGroups);

      // 2. Lấy danh sách người quen từ Supabase (dựa trên Tags trùng)
      try {
        if (currentTags.length > 0) {
            const { data: peopleData } = await supabase
                .from('guests') // Đảm bảo tên bảng là 'guests'
                .select('id, name, is_confirmed, tags')
                .overlaps('tags', currentTags) // Lọc người có tag trùng
                .neq('id', currentGuestId)     // Loại trừ bản thân
                .limit(10);
            
            if (peopleData) {
                setPeople(peopleData.map(p => ({
                    ...p,
                    mutual_tags: p.tags?.filter((t: string) => currentTags.includes(t)) || []
                })));
            }
        }
      } catch (e) { console.error("Lỗi lấy network:", e) }

      setLoading(false);
    };

    fetchNetwork();
  }, [currentGuestId, currentTags]);

  if (loading) return <div className="py-10 flex justify-center"><div className="animate-spin w-5 h-5 border-2 border-orange-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-5 duration-500">
      
      {/* === 1. GỢI Ý KẾT NỐI (Horizontal Scroll) === */}
      {people.length > 0 && (
        <div className="space-y-3">
            <h3 className="text-[#fadd7d] text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
                <Sparkles size={12} className="text-yellow-400" /> Gợi ý kết nối
            </h3>
            
            {/* Container trượt ngang (CSS scrollbar-hide để ẩn thanh cuộn) */}
            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1 snap-x scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {people.map((person) => (
                    <div key={person.id} className="snap-start flex-shrink-0 w-28 bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex flex-col items-center gap-2 relative group hover:border-[#d4af37]/50 transition-all shadow-sm">
                        {/* Avatar (Tự tạo từ tên) */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 border border-gray-600 shadow-inner">
                            {person.name.charAt(0)}
                        </div>
                        
                        {/* Tên & Tag chung */}
                        <div className="text-center w-full">
                            <p className="text-xs font-bold text-white truncate w-full">{person.name}</p>
                            <p className="text-[9px] text-gray-500 truncate mt-0.5">{person.mutual_tags[0]}</p>
                        </div>

                        {/* Nút Thêm */}
                        <button 
                            onClick={() => onAddMember(person.id, person.name)}
                            className="mt-1 w-full py-1.5 bg-[#222] hover:bg-[#d4af37] hover:text-black text-gray-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                            <UserPlus size={10} /> Thêm
                        </button>

                        {/* Status Dot */}
                        {person.is_confirmed && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border border-[#1a1a1a] shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* === 2. DANH SÁCH NHÓM CHAT (List Vertical) === */}
      <div className="space-y-3">
         <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Hash size={12} /> Các nhóm của bạn
         </h3>
         
         <div className="grid grid-cols-1 gap-2">
            {groups.map((group) => (
                <button 
                    key={group.id}
                    onClick={() => onSelectGroup(group.tag_identifier)}
                    className="flex items-center justify-between bg-[#111] hover:bg-[#1a1a1a] border border-[#333] hover:border-[#d4af37]/40 p-3.5 rounded-xl transition-all group text-left shadow-sm active:scale-[0.98]"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#222] flex items-center justify-center text-gray-400 group-hover:text-[#d4af37] group-hover:bg-[#d4af37]/10 transition-colors border border-transparent group-hover:border-[#d4af37]/20">
                            <Users size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">
                                {group.tag_identifier === 'general' ? 'Hội trường chính' : group.name}
                            </h4>
                            <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>{group.member_count} thành viên</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span className="text-green-500">Đang hoạt động</span>
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