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

    // --- SPECIAL CASE: BIRTHDAY GREETING FOR CUN-221 ---
    const birthdayKeywords = ['chúc mừng sinh nhật', 'sinh nhật', 'happy birthday', 'hbd'];
    const isBirthdayGreeting = birthdayKeywords.some(keyword => lastUserMessage.toLowerCase().includes(keyword));
    
    // Poems with proper Vietnamese poetry structure (vần điệu chuẩn)
    const birthdayPoems = [
      `[Happy] **Gửi người bạn cũ**
Thoáng cái đã hai ba tuổi nhỉ? Bạn với tôi tri kỷ ngày nào. Nhớ thời Cầu Giấy lao xao, Trốn cô "chị X" vượt rào đi chơi.

Chuyện ném bút máu rơi thuở ấy, Vết sẹo này vẫn thấy còn nguyên. Chỉ vì một tiếng "ừ" điên, Mà mày hờn dỗi, làm phiền lòng nhau.

Giờ xa cách, phương nào có nhớ? Sinh nhật mày, tao chớ có quên. Chúc mày chân cứng đá mềm, Đường đời tấp nập, bình yên lối về. 💝`,

      `[Happy] **Hoài niệm A1**
Cầu Giấy trường xưa nắng ngập tràn, A1 ngày ấy chuyện lan man.
Trốn cô "chị X" tìm vui thú, Ném bút toác đầu máu lệ chan.
Một tiếng "ừ" buông sầu vạn dặm, Vài năm im ắng nhớ muôn ngàn.
Hôm nay sinh nhật mừng tuổi mới, Chúc bạn đường đời mãi bình an. 🌟`,

      `[Happy] **Bạn thân nhớ không?**
Bạn thân A1 Cầu Giấy năm nao,
Nhớ không mày tao Những ngày trốn học?

Ghét bà "chị X" Nghịch ngợm đủ trò,
Ném bút phát lo Đầu tao chảy máu.

Tao "ừ" bố láo Mày dỗi quay lưng,
Giờ đã người dưng? Hay là vẫn nhớ.

Sinh nhật rực rỡ Tuổi mới hai ba (23),
Vẫn là "đại ca" Trong lòng tao nhé! 💫`
    ];
    
    // Sincere birthday wishes
    const birthdayWishes = [
      `[Happy] **Chúc mừng sinh nhật!**
Chúc mừng sinh nhật mày. Lâu rồi không nói chuyện, nhưng tao chưa bao giờ quên mày - đứa bạn 'ngầu' nhất cái lớp A1 ngày xưa. Cái sẹo trên đầu tao bây giờ không còn đau nữa, mà nó nhắc tao nhớ là tụi mình đã từng có một thời điên rồ và vui vẻ đến thế nào. 

Tuổi 23, tao chúc mày luôn bản lĩnh, sống hiên ngang như cách mày từng đối đầu với 'chị X'. Dù có thế nào, tao vẫn ở đây, vẫn trân trọng tình bạn của tụi mình.

Sinh nhật vui vẻ nhé! 💝`,

      `[Happy] **Gửi bạn cũ**
Hôm nay sinh nhật mày, tự nhiên bao nhiêu chuyện cũ ùa về: những chiều trốn học, vụ cái bút, và cả cái lần tao vô tâm 'ừ' làm mày giận...

Tao chỉ muốn nói là: Tao nhớ mày, và nhớ tình bạn của bọn mình. Chúc mày tuổi mới rực rỡ. Mong mày luôn cười tươi và hạnh phúc. 

Happy Birthday! 🎂`
    ];
    
    // Check if this is the initial birthday greeting or a follow-up choice
    const userLower = lastUserMessage.toLowerCase();
    const isPoetryChoice = userLower.includes('thơ') || userLower.includes('poem') || userLower.includes('poetry');
    const isWishesChoice = userLower.includes('lời chúc') || userLower.includes('chúc') || userLower.includes('wishes');
    
    if ((guestName === 'cun-221' || guestName === 'Cùn') && isBirthdayGreeting) {
      // Initial greeting - ask for choice
      return NextResponse.json({ 
        role: 'assistant', 
        content: `[Happy] Cùn sinh nhật vui vẻ! 🎂
Catmi muốn gửi lời chúc cho Cùn, nhưng phải chọn trước:
👉 Cùn muốn nghe **thơ** chúc mừng?
👉 Hay là muốn nghe **lời chúc** chân tình?
Cùn chọn cái nào thì Catmi sẽ gửi tặng Cùn! ✨`,
        includeMap: false
      });
    }
    
    // If user already chose poems
    if ((guestName === 'cun-221' || guestName === 'Cùn') && isPoetryChoice && !isBirthdayGreeting) {
      const randomPoem = birthdayPoems[Math.floor(Math.random() * birthdayPoems.length)];
      return NextResponse.json({ 
        role: 'assistant', 
        content: randomPoem,
        includeMap: false
      });
    }
    
    // If user already chose wishes
    if ((guestName === 'cun-221' || guestName === 'Cùn') && isWishesChoice && !isBirthdayGreeting) {
      const randomWish = birthdayWishes[Math.floor(Math.random() * birthdayWishes.length)];
      return NextResponse.json({ 
        role: 'assistant', 
        content: randomWish,
        includeMap: false
      });
    }

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