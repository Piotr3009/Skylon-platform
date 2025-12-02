// app/api/account/delete/route.js

import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(url, key);
};

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const { userId } = await request.json();

    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Delete user's documents from storage
    const { data: documents } = await supabase
      .from('subcontractor_documents')
      .select('file_path')
      .eq('subcontractor_id', userId);

    if (documents && documents.length > 0) {
      const filePaths = documents.map(doc => doc.file_path);
      await supabase.storage
        .from('documents')
        .remove(filePaths);
    }

    // Step 2: Delete user's bids
    const { error: bidsError } = await supabase
      .from('bids')
      .delete()
      .eq('subcontractor_id', userId);

    if (bidsError) {
      console.error('Error deleting bids:', bidsError);
    }

    // Step 3: Delete subcontractor documents records
    const { error: docsError } = await supabase
      .from('subcontractor_documents')
      .delete()
      .eq('subcontractor_id', userId);

    if (docsError) {
      console.error('Error deleting documents:', docsError);
    }

    // Step 4: Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return Response.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      );
    }

    // Step 5: Delete user from auth (this will cascade delete related data)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return Response.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      );
    }

    // Step 6: Log GDPR deletion for compliance
    try {
      await supabase
        .from('gdpr_deletion_logs')
        .insert({
          user_id: userId,
          deleted_at: new Date().toISOString(),
          reason: 'User requested account deletion'
        });
    } catch (logError) {
      // If table doesn't exist, just log the error but continue
      console.log('GDPR deletion log table not found:', logError);
    }

    return Response.json({ 
      success: true,
      message: 'Account successfully deleted' 
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return Response.json(
      { error: 'Internal server error during account deletion' },
      { status: 500 }
    );
  }
}