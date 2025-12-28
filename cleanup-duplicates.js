// Script để xóa duplicate likes từ database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  console.error('URL:', supabaseUrl);
  console.error('KEY exists:', !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupDuplicates() {
  try {
    console.log('🔍 Fetching all likes...');
    const { data: allLikes, error: fetchError } = await supabase
      .from('confession_likes')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`📊 Total likes in DB: ${allLikes.length}`);

    // Group by (confession_id, guest_id)
    const groups = {};
    allLikes.forEach(like => {
      const key = `${like.confession_id}:${like.guest_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(like);
    });

    let duplicateCount = 0;
    const toDelete = [];

    // Find duplicates - keep only the first, delete rest
    for (const key in groups) {
      if (groups[key].length > 1) {
        console.log(`⚠️ Found ${groups[key].length} likes for key: ${key}`);
        duplicateCount += groups[key].length - 1;
        
        // Keep first (oldest), delete rest
        const toKeep = groups[key][0];
        const toRemove = groups[key].slice(1);
        
        toRemove.forEach(like => {
          toDelete.push(like.id);
        });
      }
    }

    console.log(`\n🗑️ Found ${duplicateCount} duplicate likes to delete`);

    if (toDelete.length > 0) {
      console.log(`🔄 Deleting duplicates...`);
      for (const likeId of toDelete) {
        const { error: deleteError } = await supabase
          .from('confession_likes')
          .delete()
          .eq('id', likeId);
        
        if (deleteError) {
          console.error(`❌ Failed to delete like ${likeId}:`, deleteError);
        } else {
          console.log(`✅ Deleted like ${likeId}`);
        }
      }
      
      console.log(`\n✅ Cleanup complete! Deleted ${toDelete.length} duplicate likes`);
    } else {
      console.log('✅ No duplicates found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

cleanupDuplicates();
