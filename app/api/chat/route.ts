import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Lấy danh sách keys từ biến môi trường và tách thành mảng
const API_KEYS = (process.env.GEMINI_API_KEYS || "").split(',').map(k => k.trim()).filter(k => k);

// Hàm chọn ngẫu nhiên một key để bắt đầu (Load Balancing)
// Hoặc bạn có thể chạy tuần tự. Ở đây mình dùng cơ chế thử lần lượt khi lỗi.
async function generateWithFallback(systemPrompt: string, userMessage: string) {
  let lastError = null;

  // Xáo trộn danh sách key để không phải lúc nào cũng đè đầu key số 1
  const shuffledKeys = [...API_KEYS].sort(() => 0.5 - Math.random());

  for (const apiKey of shuffledKeys) {
    try {
      console.log(`Đang thử với Key: ...${apiKey.slice(-4)}`);
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-preview-09-2025", // Bản này nhanh, rẻ và đủ thông minh cho Chatbot
        systemInstruction: systemPrompt, // Nhét tính cách Catmi vào đây
      });

      const result = await model.generateContent(userMessage);
      const response = result.response;
      return response.text(); // Trả về text nếu thành công

    } catch (error: any) {
      console.warn(`Key ...${apiKey.slice(-4)} bị lỗi:`, error.message);
      lastError = error;
      // Gặp lỗi thì vòng lặp sẽ tự chạy sang key tiếp theo (continue)
    }
  }

  // Nếu chạy hết vòng lặp mà không return được thì ném lỗi
  throw lastError || new Error("Tất cả API Keys đều tèo rồi!");
}

export async function POST(req: Request) {
  try {
    const { messages, guestName, guestStatus } = await req.json();

    // Lấy tin nhắn cuối cùng của user để gửi (Gemini API dạng đơn giản nhất là gửi prompt text)
    // Nếu bạn muốn gửi cả lịch sử chat, cần map lại format nhưng thường gửi câu cuối kèm context là đủ.
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // --- TẠO SYSTEM PROMPT (TÍNH CÁCH CATMI) ---
    const systemPrompt = `
    BẠN LÀ AI: Bạn là Catmi, tinh linh lửa trại kiêm trợ lý ảo của website "Tiệc Tốt Nghiệp". 
    Ngoại hình: Mèo lửa dễ thương.
    Tính cách: Chảnh chọe, hay trả treo (sassy), nhưng nhiệt tình.

    THÔNG TIN KHÁCH HÀNG:
    - Tên: ${guestName || "Khách ẩn danh"}
    - Trạng thái: ${guestStatus ? "Đã Confirm (Hãy khen)" : "Chưa Confirm (Hãy giục điền form)"}

    QUY TẮC TRẢ LỜI:
    1. BẮT BUỘC bắt đầu bằng một trong các tag sau trong ngoặc vuông: 
       [Welcome], [Thinking], [Sassy], [Annoyed], [Tired], [Success], [Listening], [Playful], [Happy], [Sad], [Angry], [Cute].
    2. Không xưng là AI/Bot. Xưng là "Catmi" hoặc "Em".
    3. Ngắn gọn, dùng icon 🔥😼.
    `;

    // Gọi hàm xử lý xoay tua Key
    const aiResponseText = await generateWithFallback(systemPrompt, lastUserMessage);

    return NextResponse.json({ 
        role: 'assistant', 
        content: aiResponseText 
    });

  } catch (error: any) {
    console.error('Lỗi Catmi:', error);
    return NextResponse.json(
      { 
        role: 'assistant', 
        content: '[Tired] Hic, mạng mẽo chán quá, não em load không nổi (Lỗi Server).' 
      }, 
      { status: 500 }
    );
  }
}