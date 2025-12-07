import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/tags - List all tags
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ tags }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in GET /api/tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { name, color } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400, headers: corsHeaders });
    }

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({ 
        name: name.toLowerCase().trim(),
        color: color || '#6366f1'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Tag already exists' }, { status: 409, headers: corsHeaders });
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ tag }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error in POST /api/tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
