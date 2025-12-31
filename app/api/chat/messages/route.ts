import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch all messages in a session
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    console.log('Fetching messages for sessionId:', sessionId);

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }
    
    console.log('Messages fetched:', messages?.length || 0);
    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error('GET messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add message to session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId || body.session_id;
    const guestId = body.guestId || body.guest_id || 'unknown';
    const role = body.role;
    const content = body.content;
    const imageUrl = body.imageUrl || body.image_url;

    if (!sessionId || !role || !content) {
      console.warn('Missing fields:', { sessionId, role, content });
      return NextResponse.json({ error: 'Missing required fields: sessionId, role, content' }, { status: 400 });
    }

    console.log('Creating message in sessionId:', sessionId, 'user:', guestId, 'role:', role);

    // Tạo object insert - chỉ thêm guest_id nếu database hỗ trợ
    const insertData: any = {
      session_id: sessionId,
      role,
      content,
    };

    // Thêm guest_id nếu có
    if (guestId) {
      insertData.guest_id = guestId;
    }

    // Thêm image_url nếu có
    if (imageUrl) {
      insertData.image_url = imageUrl;
    }

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      // Nếu lỗi vì cột guest_id không tồn tại, retry mà không guest_id
      if (error.message && error.message.includes('guest_id')) {
        console.warn('guest_id column not found, retrying without it');
        const { data: retryMessage, error: retryError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            role,
            content,
            image_url: imageUrl || null,
          })
          .select()
          .single();
        
        if (retryError) throw retryError;
        return NextResponse.json(retryMessage);
      }
      throw error;
    }

    // Update session's updated_at timestamp
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    console.log('Message saved:', message?.id);
    return NextResponse.json(message);
  } catch (error: any) {
    console.error('POST message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete message
export async function DELETE(req: NextRequest) {
  try {
    const messageId = req.nextUrl.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
