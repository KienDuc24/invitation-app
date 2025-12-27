import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { currentGuestId, currentTags } = await req.json();

    if (!currentTags || currentTags.length === 0) {
        return NextResponse.json({ people: [], groups: [] });
    }

    // 1. Tìm người quen (Logic: mảng tags overlap với mảng tags của user)
    const { data: people } = await supabase
        .from('guests')
        .select('id, name, is_confirmed')
        .overlaps('tags', currentTags) // Cần cột tags là array text[]
        .neq('id', currentGuestId)
        .limit(10);

    // 2. Tìm nhóm (Logic: Tìm nhóm có tag_identifier nằm trong list tags của user)
    // Nếu bạn chưa tạo bảng chat_groups, có thể fake dữ liệu ở đây:
    /*
    const fakeGroups = currentTags.map(tag => ({
        id: Math.random().toString(),
        name: `Nhóm ${tag.toUpperCase()}`,
        tag_identifier: tag
    }));
    */
   
    // Nếu đã tạo bảng chat_groups:
    const { data: groups } = await supabase
        .from('chat_groups')
        .select('*')
        .in('tag_identifier', currentTags);

    return NextResponse.json({ 
        people: people || [], 
        groups: groups || [] 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}