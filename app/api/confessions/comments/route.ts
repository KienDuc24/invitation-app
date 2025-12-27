import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const confessionId = searchParams.get("confessionId");

    if (!confessionId) {
      return NextResponse.json({ error: "Missing confessionId" }, { status: 400 });
    }

    const { data: comments, error } = await supabase
      .from("confession_comments")
      .select("*")
      .eq("confession_id", confessionId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch guest info cho mỗi comment
    const commentsWithGuests = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: guest } = await supabase
          .from("guests")
          .select("id, name, avatar_url")
          .eq("id", comment.guest_id)
          .single();
        return { ...comment, guests: guest };
      })
    );

    return NextResponse.json({ comments: commentsWithGuests || [] });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { confessionId, guestId, content } = await req.json();
    console.log('POST params:', { confessionId, guestId, content });

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

    console.log('Insert result:', { comment, error });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    // Fetch guest info
    const { data: guest } = await supabase
      .from("guests")
      .select("id, name, avatar_url")
      .eq("id", guestId)
      .single();

    const commentWithGuest = { ...comment, guests: guest };
    return NextResponse.json({ comment: commentWithGuest });
  } catch (error: any) {
    console.error("Post comment catch error:", error);
    return NextResponse.json({ error: error?.message || "Failed to post comment", details: JSON.stringify(error) }, { status: 500 });
  }
}
