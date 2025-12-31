import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch all sessions for a guest
export async function GET(req: NextRequest) {
  try {
    const guestId = req.nextUrl.searchParams.get('guestId');
    if (!guestId) {
      return NextResponse.json({ error: 'Missing guestId' }, { status: 400 });
    }

    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('guest_id', guestId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ sessions: sessions || [] });
  } catch (error: any) {
    console.error('GET sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const guestId = body.guestId || body.guest_id;
    const title = body.title;

    if (!guestId) {
      return NextResponse.json({ error: 'missing guestId' }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .insert({
        guest_id: guestId,
        title: title || 'Cuộc trò chuyện mới',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(session);
  } catch (error: any) {
    console.error('POST session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update session title
export async function PUT(req: NextRequest) {
  try {
    const { sessionId, title } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const { data: session, error } = await supabase
      .from('chat_sessions')
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('PUT session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete session
export async function DELETE(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
