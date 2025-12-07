import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public API - no auth required
// Uses service role to bypass RLS for public shared collections

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Create Supabase client with service role for public access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Find collection by share token
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found or not shared' },
        { status: 404 }
      );
    }

    // Fetch prompts in this collection
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select(`
        id,
        title,
        content,
        source,
        effectiveness_score,
        created_at,
        category:categories(id, name, icon),
        tags:prompt_tags(tag:tags(id, name))
      `)
      .eq('collection_id', collection.id)
      .order('created_at', { ascending: false });

    if (promptsError) {
      console.error('Error fetching prompts:', promptsError);
    }

    // Transform prompts
    const transformedPrompts = prompts?.map(p => ({
      ...p,
      tags: p.tags?.map((pt: { tag: unknown }) => pt.tag) || [],
    })) || [];

    // Get owner info (just email, not sensitive data)
    const { data: owner } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', collection.user_id)
      .single();

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        icon: collection.icon,
        color: collection.color,
        created_at: collection.created_at,
        prompt_count: transformedPrompts.length,
      },
      prompts: transformedPrompts,
      owner: owner?.email ? { email: owner.email.split('@')[0] + '@...' } : null,
    });
  } catch (error) {
    console.error('Error in GET /api/share/[token]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

