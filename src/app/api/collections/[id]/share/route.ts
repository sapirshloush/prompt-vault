import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

// Generate a share link for a collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns this collection
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Generate share token if not exists
    let shareToken = collection.share_token;
    if (!shareToken) {
      shareToken = randomBytes(16).toString('hex');
    }

    // Update collection to be public with share token
    const { data: updated, error: updateError } = await supabase
      .from('collections')
      .update({
        is_public: true,
        share_token: shareToken,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating collection:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Build share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prompt-vault-ebon-psi.vercel.app';
    const shareUrl = `${baseUrl}/share/${shareToken}`;

    return NextResponse.json({
      collection: updated,
      shareUrl,
      shareToken,
    });
  } catch (error) {
    console.error('Error in POST /api/collections/[id]/share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Disable sharing for a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update collection to disable sharing
    const { data: updated, error } = await supabase
      .from('collections')
      .update({
        is_public: false,
        share_token: null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error disabling share:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ collection: updated, success: true });
  } catch (error) {
    console.error('Error in DELETE /api/collections/[id]/share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

