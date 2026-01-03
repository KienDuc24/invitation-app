import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    console.log('📍 Fetching event info from event_info...');
    
    const { data, error } = await supabase
      .from('event_info')
      .select('*')
      .eq('id', 'main_event')
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json(
        { 
          error: 'Không thể lấy thông tin sự kiện',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    if (!data) {
      console.warn('⚠️ No event data found');
      return NextResponse.json(
        { 
          error: 'Không tìm thấy thông tin sự kiện',
          data: null
        },
        { status: 404 }
      );
    }

    console.log('✅ Event data found:', data);

    // Format dữ liệu phù hợp
    const formatted = {
      success: true,
      location_info: data.location_info || 'Chưa xác định',
      time_info: data.time_info || 'Chưa xác định',
      contact_info: data.contact_info || 'Chưa xác định',
      current_location: data.current_location || 'Đang ở nhà',
      text: data.text || 'Chưa có chi tiết'
    };

    return NextResponse.json(formatted);

  } catch (error: any) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { 
        error: 'Lỗi server khi lấy thông tin sự kiện',
        message: error.message
      },
      { status: 500 }
    );
  }
}
