import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/extension/auth-save - Save prompt using user's auth token
export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token. Please log in again.' },
        { status: 401, headers: corsHeaders }
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

    // Create the prompt with user's ID
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
        user_id: user.id,
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
        user_id: user.id,
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

    return NextResponse.json({ 
      prompt, 
      success: true,
      user: { email: user.email }
    }, { status: 201, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error in POST /api/extension/auth-save:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

