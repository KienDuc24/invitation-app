import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const { confessionId, content, visibility, imageUrl } = await request.json();

    if (!confessionId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updateData: any = {
      content,
    };

    if (visibility) {
      updateData.visibility = visibility;
    }

    // Add imageUrl if provided
    if (imageUrl !== undefined) {
      updateData.image_url = imageUrl;
    }

    const { data, error } = await supabase
      .from('confessions')
      .update(updateData)
      .eq('id', confessionId)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message || 'Update failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
