import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreatePromptRequest, SearchPromptsRequest } from '@/types/database';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/prompts - List all prompts with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user (RLS will automatically filter, but we check for auth)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query');
    const source = searchParams.get('source');
    const category_id = searchParams.get('category_id');
    const collection_id = searchParams.get('collection_id');
    const is_favorite = searchParams.get('is_favorite');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let dbQuery = supabase
      .from('prompts')
      .select(`
        *,
        category:categories(*),
        collection:collections(*),
        tags:prompt_tags(tag:tags(*))
      `)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (source) {
      dbQuery = dbQuery.eq('source', source);
    }
    
    if (category_id) {
      dbQuery = dbQuery.eq('category_id', category_id);
    }
    
    if (collection_id) {
      dbQuery = dbQuery.eq('collection_id', collection_id);
    }
    
    if (is_favorite === 'true') {
      dbQuery = dbQuery.eq('is_favorite', true);
    }

    // Full-text search
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
    }

    const { data: prompts, error } = await dbQuery;

    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the nested tags structure
    const transformedPrompts = prompts?.map(prompt => ({
      ...prompt,
      tags: prompt.tags?.map((pt: { tag: unknown }) => pt.tag) || []
    }));

    // Filter by tags if specified (post-query filter)
    let filteredPrompts = transformedPrompts;
    if (tags && tags.length > 0) {
      filteredPrompts = transformedPrompts?.filter(prompt => 
        tags.some(tagName => 
          prompt.tags?.some((t: { name: string }) => t.name.toLowerCase() === tagName.toLowerCase())
        )
      );
    }

    return NextResponse.json({ prompts: filteredPrompts }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in GET /api/prompts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

// POST /api/prompts - Create a new prompt
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    
    const body: CreatePromptRequest = await request.json();

    const { title, content, source, category_id, collection_id, effectiveness_score, tags, is_favorite } = body;

    if (!title || !content || !source) {
      return NextResponse.json(
        { error: 'Title, content, and source are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create the prompt with user_id
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .insert({
        title,
        content,
        source,
        category_id: category_id || null,
        collection_id: collection_id || null,
        effectiveness_score: effectiveness_score || null,
        is_favorite: is_favorite || false,
        current_version: 1,
        user_id: user.id,
      })
      .select()
      .single();

    if (promptError) {
      console.error('Error creating prompt:', promptError);
      return NextResponse.json({ error: promptError.message }, { status: 500, headers: corsHeaders });
    }

    // Create the first version
    const { error: versionError } = await supabase
      .from('prompt_versions')
      .insert({
        prompt_id: prompt.id,
        version_number: 1,
        content,
        effectiveness_score: effectiveness_score || null,
        change_notes: 'Initial version',
        user_id: user.id,
      });

    if (versionError) {
      console.error('Error creating version:', versionError);
    }

    // Handle tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Get or create tag
        let { data: tag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName.toLowerCase())
          .single();

        if (!tag) {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({ name: tagName.toLowerCase() })
            .select('id')
            .single();
          tag = newTag;
        }

        if (tag) {
          await supabase
            .from('prompt_tags')
            .insert({ prompt_id: prompt.id, tag_id: tag.id });
        }
      }
    }

    return NextResponse.json({ prompt }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error in POST /api/prompts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

