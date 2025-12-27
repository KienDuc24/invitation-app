// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Cấu hình Key (Giữ nguyên logic cũ)
const API_KEYS = (process.env.GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(k => k);

// --- CẤU HÌNH ĐỊA ĐIỂM & BẢN ĐỒ ---
const CURRENT_HOST_LOCATION = "Tòa nhà C5 (Phòng Hội trường)";
const SCHOOL_MAP_IMAGE = "media/map2d.png"; 
const GOOGLE_MAP_LINK = "https://maps.app.goo.gl/iZqvwJVA4CXNEYqm6"; 

async function generateWithFallback(systemPrompt: string, userMessage: string) {
  let lastError = null;
  const shuffledKeys = [...API_KEYS].sort(() => 0.5 - Math.random());

  for (const apiKey of shuffledKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-preview-09-2025", // Check lại model này nếu lỗi thì đổi về gemini-1.5-flash
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
    
    // Kiểm tra kỹ biến guestInfor
    console.log("3. Biến 'guestInfor' nhận được:", guestInfor); 
    if (guestInfor) {
        console.log("   -> TRẠNG THÁI: OK (Có dữ liệu)");
    } else {
        console.log("   -> TRẠNG THÁI: NULL/UNDEFINED (Frontend chưa gửi hoặc DB rỗng)");
    }
    console.log("=========== END DEBUG ===========");
    // =======================================================

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
    // [QUAN TRỌNG] Đã thêm dòng 'LƯU Ý ĐẶC BIỆT' để AI đọc được guestInfor
    const systemPrompt = `
    BẠN LÀ AI: 
    Bạn là Catmi. 
    - Quá khứ: Tinh linh lửa trại trong đồ án tốt nghiệp cũ.
    - Hiện tại: Trợ lý ảo cho Lễ Tốt Nghiệp của Bùi Đức Kiên.
    
    THÔNG TIN NGƯỜI DÙNG:
    - Tên: ${guestName || "Khách quý"}
    - Nhóm: ${tagsStr || "Khách mời"}
    - Trạng thái RSVP: ${guestStatus ? "Đã tham gia" : "Chưa xác nhận"}
    - THÔNG TIN RIÊNG (LƯU Ý ĐẶC BIỆT): ${guestInfor ? guestInfor : "Không có"}  <-- DÒNG MỚI QUAN TRỌNG NÀY
    
    CHỈ ĐƯỜNG:
    - Vị trí: ${CURRENT_HOST_LOCATION}.
    - Link Map: ${GOOGLE_MAP_LINK}
    - QUY TẮC QUAN TRỌNG: Khi gửi link bản đồ, BẮT BUỘC viết đúng format này: [Đại học Thủy lợi](${GOOGLE_MAP_LINK})
    (Không được gửi link trần).

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
    console.error("Lỗi Server:", error); // Log lỗi ra xem cho dễ
    return NextResponse.json(
      { role: 'assistant', content: '[Tired] Hic, server lỗi rồi khách quý ơi...' }, 
      { status: 500 }
    );
  }
}