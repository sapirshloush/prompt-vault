import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/extension/save - Save prompt from browser extension
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check extension API key
    const extensionKey = request.headers.get('X-Extension-Key');
    const validKey = process.env.EXTENSION_API_KEY;
    
    if (!validKey || extensionKey !== validKey) {
      return NextResponse.json(
        { error: 'Invalid extension key' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Get the default user (you) for extension saves
    // This is the user_id you'll set in environment variable
    const defaultUserId = process.env.DEFAULT_USER_ID;
    
    if (!defaultUserId) {
      return NextResponse.json(
        { error: 'Default user not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { title, content, source, category_id, effectiveness_score, tags, is_favorite } = body;

    if (!title || !content || !source) {
      return NextResponse.json(
        { error: 'Title, content, and source are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create the prompt
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .insert({
        title,
        content,
        source,
        category_id: category_id || null,
        effectiveness_score: effectiveness_score || null,
        is_favorite: is_favorite || false,
        current_version: 1,
        user_id: defaultUserId,
      })
      .select()
      .single();

    if (promptError) {
      console.error('Error creating prompt:', promptError);
      return NextResponse.json({ error: promptError.message }, { status: 500, headers: corsHeaders });
    }

    // Create the first version
    await supabase
      .from('prompt_versions')
      .insert({
        prompt_id: prompt.id,
        version_number: 1,
        content,
        effectiveness_score: effectiveness_score || null,
        change_notes: 'Saved via browser extension',
        user_id: defaultUserId,
      });

    // Handle tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
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

    return NextResponse.json({ prompt, success: true }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error in POST /api/extension/save:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

