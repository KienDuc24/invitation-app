import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type GuestInfo = {
  id: string;
  name: string;
  is_confirmed: boolean;
  attendance?: string;
  wish?: string;
  tags?: string[];
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
    isConfirmed: data.is_confirmed // Đổi tên cho khớp code cũ
  };
}