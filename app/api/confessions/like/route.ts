import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { confessionId, guestId } = await req.json();

    if (!confessionId || !guestId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Check if user already liked
    const { data: existingLikes } = await supabase
      .from("confession_likes")
      .select("*")
      .eq("confession_id", confessionId)
      .eq("guest_id", guestId);

    const existingLike = existingLikes && existingLikes.length > 0;

    if (existingLike) {
      // Unlike
      await supabase
        .from("confession_likes")
        .delete()
        .eq("confession_id", confessionId)
        .eq("guest_id", guestId);
    } else {
      // Like
      await supabase
        .from("confession_likes")
        .insert({ confession_id: confessionId, guest_id: guestId });
    }

    // Get updated like count
    const { count } = await supabase
      .from("confession_likes")
      .select("*", { count: "exact", head: true })
      .eq("confession_id", confessionId);

    // Broadcast to all connected users about like change
    await supabase.channel('likes-broadcast').send({
      type: 'broadcast',
      event: 'like_changed',
      payload: {
        confessionId,
        guestId,
        action: existingLike ? 'unlike' : 'like',
        likeCount: count || 0,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({ 
      success: true, 
      liked: !existingLike,
      likeCount: count || 0
    });
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Failed to like confession" }, { status: 500 });
  }
}
