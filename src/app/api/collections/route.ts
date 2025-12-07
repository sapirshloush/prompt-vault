import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/collections - Fetch all collections for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // Fetch collections with prompt count
    const { data: collections, error } = await supabase
      .from('collections')
      .select(`
        *,
        prompts:prompts(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collections:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    // Transform to include prompt_count
    const collectionsWithCount = collections?.map(c => ({
      ...c,
      prompt_count: c.prompts?.[0]?.count || 0,
      prompts: undefined,
    })) || [];

    return NextResponse.json({ collections: collectionsWithCount }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in GET /api/collections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

// POST /api/collections - Create a new collection
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { name, description, icon, color, is_public } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create collection
    const { data: collection, error } = await supabase
      .from('collections')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        icon: icon || '📁',
        color: color || '#6366f1',
        is_public: is_public || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating collection:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ collection }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error in POST /api/collections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

