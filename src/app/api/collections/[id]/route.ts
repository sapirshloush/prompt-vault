import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/collections/[id] - Get a single collection with its prompts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // Fetch collection
    const { data: collection, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404, headers: corsHeaders });
    }

    // Check ownership (unless public)
    if (collection.user_id !== user.id && !collection.is_public) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: corsHeaders });
    }

    // Fetch prompts in this collection
    const { data: prompts } = await supabase
      .from('prompts')
      .select(`
        *,
        category:categories(*),
        tags:prompt_tags(tag:tags(*))
      `)
      .eq('collection_id', id)
      .order('created_at', { ascending: false });

    // Transform tags
    const promptsWithTags = prompts?.map(p => ({
      ...p,
      tags: p.tags?.map((pt: { tag: unknown }) => pt.tag) || [],
    })) || [];

    return NextResponse.json({ 
      collection: {
        ...collection,
        prompt_count: promptsWithTags.length,
      },
      prompts: promptsWithTags,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in GET /api/collections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

// PATCH /api/collections/[id] - Update a collection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { name, description, icon, color, is_public } = body;

    // Build update object
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (is_public !== undefined) updates.is_public = is_public;

    // Update collection (RLS will ensure ownership)
    const { data: collection, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json({ collection }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in PATCH /api/collections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

// DELETE /api/collections/[id] - Delete a collection
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // First, remove collection_id from all prompts in this collection
    await supabase
      .from('prompts')
      .update({ collection_id: null })
      .eq('collection_id', id);

    // Delete collection (RLS will ensure ownership)
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting collection:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in DELETE /api/collections/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

