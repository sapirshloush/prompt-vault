import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey) {
      // Fallback to basic analysis if no API key
      return NextResponse.json({
        title: generateBasicTitle(content),
        tags: generateBasicTags(content, source),
        category: detectCategory(content),
        effectiveness_score: null,
        ai_powered: false,
        message: 'Basic analysis (no Gemini API key configured)'
      }, { headers: corsHeaders });
    }

    console.log('Initializing Gemini with key:', geminiKey.substring(0, 10) + '...');
    
    const genAI = new GoogleGenerativeAI(geminiKey);
    // Use gemini-pro (stable) - gemini-1.5-flash requires different API version
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    console.log('Gemini model initialized, sending request...');

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

    const prompt = `You are an expert prompt analyst. Analyze the given prompt and provide:
1. A concise, descriptive title (max 60 characters)
2. 3-5 relevant tags (lowercase, single words or hyphenated)
3. The best matching category from: ${categoryList}
4. An effectiveness score (1-10) based on clarity, specificity, and likely results
5. A brief reason for your effectiveness score (max 100 characters)

Consider existing tags for consistency: ${existingTagsList}

The prompt was written for: ${source || 'unknown AI tool'}

IMPORTANT: Respond ONLY with valid JSON, no markdown, no code blocks:
{"title": "string", "tags": ["tag1", "tag2"], "category": "Category Name", "effectiveness_score": number, "effectiveness_reason": "string"}

Analyze this prompt:
${content.slice(0, 2000)}`;

    console.log('Calling Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Gemini response received');
    const response = await result.response;
    const analysisText = response.text().trim();
    console.log('Gemini raw response:', analysisText.substring(0, 200));
    
    // Clean up the response (remove markdown code blocks if present)
    let cleanedText = analysisText;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();
    
    let analysis;
    try {
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', cleanedText);
      throw new Error('Invalid JSON response from Gemini');
    }

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
    
    // Get the actual error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Error Details:', errorMessage);
    
    // Return basic analysis on error with detailed error
    let content = '';
    let source = '';
    try {
      const body = await request.clone().json();
      content = body.content || '';
      source = body.source || '';
    } catch {}
    
    return NextResponse.json({
      title: generateBasicTitle(content),
      tags: generateBasicTags(content, source),
      category: detectCategory(content),
      effectiveness_score: null,
      ai_powered: false,
      error: `AI analysis failed: ${errorMessage}`
    }, { headers: corsHeaders });
  }
}

// Fallback functions when Gemini is not available
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
