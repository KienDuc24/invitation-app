import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { confessionId } = await request.json();

    if (!confessionId) {
      return NextResponse.json(
        { error: 'Missing confessionId' },
        { status: 400 }
      );
    }

    // First, get the confession to find image URL
    const { data: confessionData, error: fetchError } = await supabase
      .from('confessions')
      .select('image_url')
      .eq('id', confessionId)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Confession not found' },
        { status: 404 }
      );
    }

    // Delete image from storage if exists
    if (confessionData?.image_url && confessionData.image_url.includes('confessions/')) {
      const path = confessionData.image_url.split('/confessions/')[1];
      await supabase.storage
        .from('confessions')
        .remove([path])
        .catch((err) => {
          console.warn('Could not delete image:', err);
        });
    }

    // Delete confession from database
    const { error: deleteError } = await supabase
      .from('confessions')
      .delete()
      .eq('id', confessionId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Delete failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
