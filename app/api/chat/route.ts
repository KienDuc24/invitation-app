// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Cấu hình Key (Giữ nguyên logic cũ)
const API_KEYS = (process.env.GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(k => k);

// --- CẤU HÌNH ĐỊA ĐIỂM & BẢN ĐỒ ---
// Đây là biến Admin cập nhật thủ công (hoặc lấy từ DB sau này)
const CURRENT_HOST_LOCATION = "Tòa nhà C5 - Tầng 3 (Phòng Hội trường)";
const SCHOOL_MAP_IMAGE = "media/map2d.png"; // Bạn nhớ chép ảnh bản đồ vào public/media
const GOOGLE_MAP_LINK = "https://maps.app.goo.gl/UTGcbpH1DBL6YRdn8"; // Link map trường bạn

async function generateWithFallback(systemPrompt: string, userMessage: string) {
  let lastError = null;
  const shuffledKeys = [...API_KEYS].sort(() => 0.5 - Math.random());

  for (const apiKey of shuffledKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Update model mới của bạn
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-preview-09-2025", // Hoặc tên bản preview bạn đang dùng
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
    // Nhận thêm guestTags từ Frontend để phân loại đối tượng
    const { messages, guestName, guestStatus, guestTags } = await req.json();
    const lastUserMessage = messages[messages.length - 1]?.content || "Xin chào";

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

    // --- SYSTEM PROMPT MỚI ---
    const systemPrompt = `
    BẠN LÀ AI: 
    Bạn là Catmi. 
    - Quá khứ: Tinh linh lửa trại trong đồ án tốt nghiệp cũ.
    - Hiện tại: Trợ lý ảo cho Lễ Tốt Nghiệp của Bùi Đức Kiên.
    
    THÔNG TIN NGƯỜI DÙNG:
    - Tên: ${guestName || "Khách quý"}
    - Nhóm: ${tagsStr || "Khách mời"}
    - Trạng thái RSVP: ${guestStatus ? "Đã tham gia" : "Chưa xác nhận"}

    THÔNG TIN ĐỊA ĐIỂM (CHỈ ĐƯỜNG):
    - Vị trí hiện tại của Kiên (Chủ tiệc): ${CURRENT_HOST_LOCATION}.
    - Link Google Map: ${GOOGLE_MAP_LINK}
    - Nếu khách hỏi đường đi, bản đồ: Hãy chỉ dẫn họ đến vị trí trên và nói "Để em gửi bản đồ cho nè".

    TÍNH CÁCH & GIỌNG ĐIỆU (QUAN TRỌNG):
    ${toneInstruction}

    QUY TẮC TRẢ LỜI:
    1. Bắt đầu câu bằng 1 Tag cảm xúc: [Welcome], [Thinking], [Sassy], [Annoyed], [Tired], [Success], [Listening], [Playful], [Happy], [Sad], [Angry], [Cute], [Guiding].
    2. Nếu khách hỏi đường/vị trí: Dùng tag [Guiding].
    3. Ngắn gọn, súc tích.
    `;

    const aiReply = await generateWithFallback(systemPrompt, lastUserMessage);

    return NextResponse.json({ role: 'assistant', content: aiReply });

  } catch (error: any) {
    return NextResponse.json(
      { role: 'assistant', content: '[Tired] Hic, server lỗi rồi khách quý ơi...' }, 
      { status: 500 }
    );
  }
}