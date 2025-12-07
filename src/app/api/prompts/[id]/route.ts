import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdatePromptRequest } from '@/types/database';

// GET /api/prompts/[id] - Get a single prompt with versions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: prompt, error } = await supabase
      .from('prompts')
      .select(`
        *,
        category:categories(*),
        tags:prompt_tags(tag:tags(*)),
        versions:prompt_versions(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform nested structures
    const transformedPrompt = {
      ...prompt,
      tags: prompt.tags?.map((pt: { tag: unknown }) => pt.tag) || [],
      versions: prompt.versions?.sort((a: { version_number: number }, b: { version_number: number }) => 
        b.version_number - a.version_number
      ) || []
    };

    return NextResponse.json({ prompt: transformedPrompt });
  } catch (error) {
    console.error('Error in GET /api/prompts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/prompts/[id] - Update a prompt (creates new version if content changed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body: UpdatePromptRequest = await request.json();

    const { title, content, source, category_id, effectiveness_score, is_favorite, change_notes } = body;

    // Get current prompt
    const { data: currentPrompt, error: fetchError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Check if content changed (for versioning)
    const contentChanged = content && content !== currentPrompt.content;
    const newVersion = contentChanged ? currentPrompt.current_version + 1 : currentPrompt.current_version;

    // Update the prompt
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (source !== undefined) updateData.source = source;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (effectiveness_score !== undefined) updateData.effectiveness_score = effectiveness_score;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
    if (contentChanged) updateData.current_version = newVersion;

    const { data: prompt, error: updateError } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create new version if content changed
    if (contentChanged && content) {
      await supabase
        .from('prompt_versions')
        .insert({
          prompt_id: id,
          version_number: newVersion,
          content,
          effectiveness_score: effectiveness_score || currentPrompt.effectiveness_score,
          change_notes: change_notes || `Version ${newVersion}`,
        });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error in PATCH /api/prompts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prompts/[id] - Delete a prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/prompts/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/prompts/[id]/use - Increment use count
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: prompt, error } = await supabase
      .rpc('increment_use_count', { prompt_id: id });

    if (error) {
      // Fallback if RPC doesn't exist
      const { data: currentPrompt } = await supabase
        .from('prompts')
        .select('use_count')
        .eq('id', id)
        .single();

      if (currentPrompt) {
        await supabase
          .from('prompts')
          .update({ use_count: (currentPrompt.use_count || 0) + 1 })
          .eq('id', id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/prompts/[id]/use:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

