import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type GuestInfor = {
  id: string;
  name: string;
  is_confirmed: boolean;
  attendance?: string;
  wish?: string;
  tags?: string[];
  infor?: string; // Hoặc 'info' tùy DB
};
// ID cố định của Admin (bạn có thể lấy ID thật trong bảng guests của bạn)
const ADMIN_USER = {
    id: 'admin-id-fixed',
    name: 'Đức Kiên',
    avatar: '/media/admin-avatar.jpg', // Ảnh avatar admin
    is_admin: true
};

// Hàm lấy thông tin 1 khách (Dùng cho trang hiển thị thiệp)
export async function getGuestById(id: string) {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching guest:', error);
    return null;
  }
  
  // Map dữ liệu từ snake_case (DB) sang camelCase (Code) nếu cần
  return {
    ...data,
    isConfirmed: data.is_confirmed, // Đổi tên cho khớp code cũ
    infor: data.infor || data.info || data.guest_infor || '', // Hỗ trợ nhiều tên cột
    info: data.info || data.infor || data.guest_infor || '' // Backup thêm
  };
}

export async function getNetworkData(currentGuestId: string, currentTags: string[]) {
    if (!currentTags || currentTags.length === 0) return { people: [], groups: [] };

    // 1. Lấy danh sách người có CÙNG tags (loại trừ chính mình)
    // Dùng toán tử 'overlaps' (&&) của Postgres
    const { data: people, error: peopleError } = await supabase
        .from('guests')
        .select('id, name, tags, is_confirmed, attendance')
        .overlaps('tags', currentTags) // Lọc người có tag trùng với user
        .neq('id', currentGuestId)     // Loại trừ bản thân user
        .limit(10);                    // Giới hạn 10 người để UI đỡ rối

    // 2. Lấy danh sách nhóm chat tương ứng với tags
    // Ví dụ: User có tag 'bạn cấp 3' -> Lấy nhóm có tag_identifier là 'bạn cấp 3'
    const { data: groups, error: groupError } = await supabase
        .from('chat_groups')
        .select('*')
        .in('tag_identifier', currentTags);

    return {
        people: people || [],
        groups: groups || []
    };
}