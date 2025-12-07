import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/ai/analyze - Analyze a prompt and return suggestions
export async function POST(request: NextRequest) {
  try {
    const { content, source } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      // Fallback to basic analysis if no API key
      return NextResponse.json({
        title: generateBasicTitle(content),
        tags: generateBasicTags(content, source),
        category: detectCategory(content),
        effectiveness_score: null,
        ai_powered: false,
        message: 'Basic analysis (no OpenAI key configured)'
      }, { headers: corsHeaders });
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Fetch existing categories from database
    const supabase = await createClient();
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');
    
    const categoryList = categories?.map(c => c.name).join(', ') || 
      'Copywriting, Coding, Analysis, Creative, Automation, Communication, Learning';

    // Fetch existing tags for consistency
    const { data: existingTags } = await supabase
      .from('tags')
      .select('name')
      .limit(20);
    
    const existingTagsList = existingTags?.map(t => t.name).join(', ') || '';

    const systemPrompt = `You are an expert prompt analyst. Analyze the given prompt and provide:
1. A concise, descriptive title (max 60 characters)
2. 3-5 relevant tags (lowercase, single words or hyphenated)
3. The best matching category from: ${categoryList}
4. An effectiveness score (1-10) based on clarity, specificity, and likely results
5. A brief reason for your effectiveness score

Consider existing tags for consistency: ${existingTagsList}

The prompt was written for: ${source || 'unknown AI tool'}

Respond in JSON format only:
{
  "title": "string",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Category Name",
  "effectiveness_score": number,
  "effectiveness_reason": "string"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective and fast
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this prompt:\n\n${content.slice(0, 2000)}` }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const analysisText = response.choices[0]?.message?.content;
    
    if (!analysisText) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(analysisText);

    // Match category to actual category ID
    let categoryId = null;
    if (analysis.category && categories) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === analysis.category.toLowerCase()
      );
      categoryId = matchedCategory?.id || null;
    }

    return NextResponse.json({
      title: analysis.title || generateBasicTitle(content),
      tags: analysis.tags || [],
      category: analysis.category,
      category_id: categoryId,
      effectiveness_score: analysis.effectiveness_score,
      effectiveness_reason: analysis.effectiveness_reason,
      ai_powered: true
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    // Return basic analysis on error
    const { content, source } = await request.json().catch(() => ({ content: '', source: '' }));
    
    return NextResponse.json({
      title: generateBasicTitle(content || ''),
      tags: generateBasicTags(content || '', source || ''),
      category: detectCategory(content || ''),
      effectiveness_score: null,
      ai_powered: false,
      error: 'AI analysis failed, using basic analysis'
    }, { headers: corsHeaders });
  }
}

// Fallback functions when OpenAI is not available
function generateBasicTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length <= 60) return firstLine;
  return firstLine.slice(0, 57) + '...';
}

function generateBasicTags(content: string, source: string): string[] {
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // Source-based tag
  if (source && source !== 'other') {
    tags.push(source.replace('_', '-'));
  }
  
  // Content-based tags
  const tagPatterns: [RegExp, string][] = [
    [/\b(write|writing|copy|headline|hook)\b/i, 'copywriting'],
    [/\b(code|function|programming|debug|api)\b/i, 'coding'],
    [/\b(image|visual|design|poster|graphic)\b/i, 'visual'],
    [/\b(automat|workflow|script|n8n|zapier)\b/i, 'automation'],
    [/\b(analyz|data|research|insight|report)\b/i, 'analysis'],
    [/\b(creative|brainstorm|idea|concept)\b/i, 'creative'],
    [/\b(email|message|present|communicate)\b/i, 'communication'],
    [/\b(explain|teach|learn|tutorial|summary)\b/i, 'learning'],
    [/\b(market|brand|advertis|campaign|social)\b/i, 'marketing'],
    [/\b(seo|keyword|search|rank)\b/i, 'seo'],
  ];
  
  for (const [pattern, tag] of tagPatterns) {
    if (pattern.test(lowerContent) && !tags.includes(tag)) {
      tags.push(tag);
    }
    if (tags.length >= 4) break;
  }
  
  return tags;
}

function detectCategory(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (/\b(code|function|programming|debug|api|javascript|python|typescript)\b/.test(lowerContent)) {
    return 'Coding';
  }
  if (/\b(write|copy|headline|hook|ad|marketing|sales)\b/.test(lowerContent)) {
    return 'Copywriting';
  }
  if (/\b(image|visual|design|poster|graphic|art|creative)\b/.test(lowerContent)) {
    return 'Creative';
  }
  if (/\b(automat|workflow|script|integration)\b/.test(lowerContent)) {
    return 'Automation';
  }
  if (/\b(analyz|data|research|insight|report)\b/.test(lowerContent)) {
    return 'Analysis';
  }
  if (/\b(email|message|present|communicate)\b/.test(lowerContent)) {
    return 'Communication';
  }
  if (/\b(explain|teach|learn|tutorial|summary)\b/.test(lowerContent)) {
    return 'Learning';
  }
  
  return 'Creative'; // Default
}

