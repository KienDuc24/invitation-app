import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const confessionId = searchParams.get("confessionId");

    if (!confessionId) {
      return NextResponse.json({ error: "Missing confessionId" }, { status: 400 });
    }

    console.log('📝 [GET /comments] Fetching comments for confession:', confessionId);

    // Get confession to check for admin comment
    const { data: confession, error: confError } = await supabase
      .from("confessions")
      .select("*")
      .eq("id", confessionId)
      .single();

    console.log('📝 [GET /comments] Confession data:', confession);
    console.log('📝 [GET /comments] Admin comment value:', confession?.admin_comment);
    
    if (confError) {
      console.warn('⚠️ [GET /comments] Error fetching confession:', confError);
    }

    const { data: comments, error } = await supabase
      .from("confession_comments")
      .select("*")
      .eq("confession_id", confessionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error('❌ [GET /comments] Error fetching comments:', error);
      throw error;
    }

    console.log('✅ [GET /comments] Found comments:', comments?.length || 0);

    // Fetch guest info cho mỗi comment
    const commentsWithGuests = await Promise.all(
      (comments || []).map(async (comment, idx) => {
        console.log(`🔍 [GET /comments] Fetching guest for comment ${idx}, guest_id:`, comment.guest_id);
        
        const { data: guest, error: guestError } = await supabase
          .from("guests")
          .select("id, name, avatar_url")
          .eq("id", comment.guest_id);

        if (guestError) {
          console.warn(`⚠️ [GET /comments] Error fetching guest ${idx}:`, guestError);
          // Return comment with null guest if error
          return { ...comment, guests: null };
        }

        // Use first item if array, or null if empty
        const guestData = guest && guest.length > 0 ? guest[0] : null;
        console.log(`✅ [GET /comments] Got guest for comment ${idx}:`, guestData);
        
        return { ...comment, guests: guestData };
      })
    );

    console.log('📦 [GET /comments] Returning:', commentsWithGuests.length, 'comments');
    return NextResponse.json({ comments: commentsWithGuests || [] });
  } catch (error) {
    console.error("❌ Get comments error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { confessionId, guestId, content } = await req.json();
    console.log('📝 [POST /comments] Posting comment:', { confessionId, guestId, contentLength: content?.length });

    if (!confessionId || !guestId || !content?.trim()) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from("confession_comments")
      .insert({
        confession_id: confessionId,
        guest_id: guestId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [POST /comments] Supabase insert error:", error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    console.log('✅ [POST /comments] Comment inserted:', comment?.id);

    // Fetch guest info
    const { data: guests, error: guestError } = await supabase
      .from("guests")
      .select("id, name, avatar_url")
      .eq("id", guestId);

    if (guestError) {
      console.warn('⚠️ [POST /comments] Error fetching guest:', guestError);
      const commentWithGuest = { ...comment, guests: null };
      return NextResponse.json({ comment: commentWithGuest });
    }

    const guest = guests && guests.length > 0 ? guests[0] : null;
    console.log('✅ [POST /comments] Got guest:', guest);

    const commentWithGuest = { ...comment, guests: guest };
    return NextResponse.json({ comment: commentWithGuest });
  } catch (error: any) {
    console.error("❌ [POST /comments] Catch error:", error);
    return NextResponse.json({ error: error?.message || "Failed to post comment", details: JSON.stringify(error) }, { status: 500 });
  }
}
