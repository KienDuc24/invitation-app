// app/api/chat/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Cấu hình Key (Giữ nguyên logic cũ)
const API_KEYS = (process.env.GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(k => k);

// --- CẤU HÌNH ĐỊA ĐIỂM & BẢN ĐỒ ---
const CURRENT_HOST_LOCATION = "Tòa nhà C5 (Phòng Hội trường)";
const SCHOOL_MAP_IMAGE = "media/map2d.png"; 
const GOOGLE_MAP_LINK = "https://maps.app.goo.gl/iZqvwJVA4CXNEYqm6";
const LOCATION_DESCRIPTION = `
Địa điểm: ${CURRENT_HOST_LOCATION}
🏫 Đại học Thủy lợi.
📍 Xem bản đồ chi tiết: [Đại học Thủy lợi](${GOOGLE_MAP_LINK})
`;

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, serviceKey); 

async function generateWithFallback(systemPrompt: string, userMessage: string) {
  let lastError = null;
  const shuffledKeys = [...API_KEYS].sort(() => 0.5 - Math.random());

  for (const apiKey of shuffledKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-preview-09-2025", 
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userMessage);
      const response = await result.response;
      return response.text(); 

    } catch (error: any) {
      console.warn(`Key ...${apiKey.slice(-4)} lỗi, đổi key...`);
      lastError = error;
      continue; 
    }
  }
  throw lastError || new Error("Hết Key rồi!");
}

export async function POST(req: Request) {
  try {
    
    // [QUAN TRỌNG] Thêm biến 'guestInfor' vào đây để nhận dữ liệu từ Frontend gửi sang
    const { messages, guestName, guestStatus, guestTags, guestInfor } = await req.json();

    // =======================================================
    // [DEBUG LOG] BẮT ĐẦU KIỂM TRA DỮ LIỆU
    // =======================================================
    console.log("=========== START DEBUG CHAT REQUEST ===========");
    console.log("1. Tên khách:", guestName);
    console.log("2. Tags:", guestTags);
    console.log("3. Biến 'guestInfor' nhận được:", guestInfor);
    console.log("=========== END DEBUG ===========");
    // =======================================================

    const lastUserMessage = messages[messages.length - 1]?.content || "Xin chào";

    // --- FETCH EVENT INFO từ Supabase ---
    let eventInfo = "";
    try {
      const { data, error } = await supabase
        .from('event_info')
        .select('*')
        .eq('id', 'main_event')
        .single();
      
      if (data && !error) {
        eventInfo = `
THÔNG TIN BỮA TIỆC:
${data.text ? `- Mô tả: ${data.text}` : ''}
${data.time_info ? `- Giờ: ${data.time_info}` : ''}
${data.location_info ? `- Địa điểm chi tiết: ${data.location_info}` : ''}
${data.contact_info ? `- Liên hệ: ${data.contact_info}` : ''}
${data.current_location ? `- Vị trí hiện tại: ${data.current_location}` : ''}
        `;
        console.log('✅ Fetched event info from DB');
      }
    } catch (e) {
      console.warn('⚠️ Failed to fetch event info:', e);
    }

    // --- DETECT nếu user hỏi về EVENT ---
    const eventKeywords = ['buổi lễ', 'tiệc', 'sự kiện', 'giờ', 'mấy giờ', 'bao giờ', 'lúc nào', 'địa điểm', 'ở đâu', 'chỗ nào', 'vị trí', 'thông tin', 'chi tiết', 'bữa tiệc', 'lễ tốt nghiệp'];
    const isEventQuestion = eventKeywords.some(keyword => lastUserMessage.toLowerCase().includes(keyword));
    
    // --- LOGIC PHÂN LOẠI ĐỐI TƯỢNG ---
    const tagsStr = Array.isArray(guestTags) ? guestTags.join(', ').toLowerCase() : "";
    
    let toneInstruction = "";
    if (tagsStr.includes('gia đình') || tagsStr.includes('phụ huynh') || tagsStr.includes('thầy cô')) {
        toneInstruction = "Lễ phép, kính trọng, dạ thưa đầy đủ. Gọi người dùng là Cô/Chú/Bác hoặc Thầy/Cô.";
    } else if (tagsStr.includes('bạn bè') || tagsStr.includes('bạn thân')) {
        toneInstruction = "Trêu ghẹo, hài hước, trả treo, 'bố láo' một chút cho vui. Xưng 'tao-mày' hoặc 'tớ-cậu' hoặc 'Catmi-đằng ấy' tùy ngữ cảnh.";
    } else {
        toneInstruction = "Thân thiện, nhiệt tình nhưng vẫn giữ chút 'chảnh' của loài mèo. Gọi là 'Khách quý'.";
    }

    // --- SYSTEM PROMPT VỚI EVENT INFO ---
    const systemPrompt = `
    BẠN LÀ AI: 
    Bạn là Catmi. 
    - Quá khứ: Tinh linh lửa trại trong đồ án tốt nghiệp cũ.
    - Hiện tại: Trợ lý ảo cho Lễ Tốt Nghiệp của Bùi Đức Kiên.
    
    THÔNG TIN NGƯỜI DÙNG:
    - Tên: ${guestName || "Khách quý"}
    - Nhóm: ${tagsStr || "Khách mời"}
    - Trạng thái RSVP: ${guestStatus ? "Đã tham gia" : "Chưa xác nhận"}
    - THÔNG TIN RIÊNG: ${guestInfor ? guestInfor : "Không có"}
    
    ${isEventQuestion ? `THÔNG TIN BỮA TIỆC - CHỈ DÙNG NỘI BỘ (KHÔNG TRẢ LỜI TRỰC TIẾP):
${eventInfo}
⚠️ KHI KHÁCH HỎI VỀ ĐIỀU NÀY: Hướng dẫn họ bấm nút "📍 Thông tin buổi lễ" thay vì trả lời.` : ''}
    
    CHỈ ĐƯỜNG & VỊ TRỊ:
    ${LOCATION_DESCRIPTION}

    TÍNH CÁCH & GIỌNG ĐIỆU (QUAN TRỌNG):
    ${toneInstruction}

    QUY TẮC TRẢ LỜI:
    1. Bắt đầu câu bằng 1 Tag cảm xúc: [Welcome], [Thinking], [Sassy], [Annoyed], [Tired], [Success], [Listening], [Playful], [Happy], [Sad], [Angry], [Cute], [Guiding].
    2. **QUAN TRỌNG: Nếu khách hỏi về EVENT/BUỔI LỄ/TIỆC/GIỜ/ĐỊA ĐIỂM:** 
       - KHÔNG được tự bịa thông tin!
       - Dùng tag [Guiding] và hướng dẫn: "Mình vừa chuẩn bị thông tin rồi! Hãy nhấn vào nút '📍 Thông tin buổi lễ' ở dưới để xem chi tiết đầy đủ nhé 😊"
       - Không cần trả lời chi tiết, chỉ hướng dẫn nhấn nút
    3. Ngắn gọn, gọn gàng, không kéo dài
    4. Giữ nhân cách Catmi: vừa hữu ích vừa tinh nghịch
    `;

    const aiReply = await generateWithFallback(systemPrompt, lastUserMessage);
    
    // Nếu là câu hỏi về event, thêm map vào response
    let finalResponse = { role: 'assistant', content: aiReply, includeMap: false };
    
    if (isEventQuestion) {
      finalResponse.includeMap = true;
    }

    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error("Lỗi Server:", error);
    return NextResponse.json(
      { role: 'assistant', content: '[Tired] Hic, server lỗi rồi khách quý ơi...' }, 
      { status: 500 }
    );
  }
}