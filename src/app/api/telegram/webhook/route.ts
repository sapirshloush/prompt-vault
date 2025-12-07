import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Telegram Bot Webhook Handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook secret (optional but recommended)
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = body.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return NextResponse.json({ ok: true });
    }

    // Parse commands
    if (text.startsWith('/save ')) {
      const promptContent = text.slice(6).trim();
      if (promptContent) {
        await handleSaveCommand(chatId, promptContent, botToken);
      } else {
        await sendMessage(chatId, '❌ Please provide the prompt content after /save', botToken);
      }
    } else if (text.startsWith('/search ') || text.startsWith('/find ')) {
      const query = text.replace(/^\/(search|find)\s+/, '').trim();
      await handleSearchCommand(chatId, query, botToken);
    } else if (text === '/recent' || text === '/last') {
      await handleRecentCommand(chatId, botToken);
    } else if (text === '/stats') {
      await handleStatsCommand(chatId, botToken);
    } else if (text === '/help' || text === '/start') {
      await handleHelpCommand(chatId, botToken);
    } else if (text.startsWith('/')) {
      await sendMessage(chatId, '❓ Unknown command. Use /help to see available commands.', botToken);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

async function sendMessage(chatId: number, text: string, botToken: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
}

async function handleSaveCommand(chatId: number, content: string, botToken: string) {
  try {
    const supabase = await createClient();
    
    // Generate a title from the first line or first 50 chars
    const firstLine = content.split('\n')[0];
    const title = firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;

    // Create the prompt
    const { data: prompt, error } = await supabase
      .from('prompts')
      .insert({
        title,
        content,
        source: 'other', // Default to 'other' from Telegram
        current_version: 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Create first version
    await supabase
      .from('prompt_versions')
      .insert({
        prompt_id: prompt.id,
        version_number: 1,
        content,
        change_notes: 'Saved via Telegram',
      });

    await sendMessage(
      chatId,
      `✅ <b>Prompt saved!</b>\n\n📝 <b>Title:</b> ${title}\n\n💡 <i>Tip: Open the dashboard to add tags, category, and rate effectiveness.</i>`,
      botToken
    );
  } catch (error) {
    console.error('Error saving prompt:', error);
    await sendMessage(chatId, '❌ Failed to save prompt. Please try again.', botToken);
  }
}

async function handleSearchCommand(chatId: number, query: string, botToken: string) {
  try {
    const supabase = await createClient();
    
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('id, title, content, source, effectiveness_score')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!prompts || prompts.length === 0) {
      await sendMessage(chatId, `🔍 No prompts found for "${query}"`, botToken);
      return;
    }

    let response = `🔍 <b>Found ${prompts.length} prompt(s) for "${query}":</b>\n\n`;
    
    prompts.forEach((p, i) => {
      const stars = p.effectiveness_score 
        ? '⭐'.repeat(Math.ceil(p.effectiveness_score / 2)) 
        : '';
      const preview = p.content.slice(0, 100) + (p.content.length > 100 ? '...' : '');
      response += `${i + 1}. ${stars} <b>${p.title}</b>\n<code>${preview}</code>\n\n`;
    });

    await sendMessage(chatId, response, botToken);
  } catch (error) {
    console.error('Error searching prompts:', error);
    await sendMessage(chatId, '❌ Search failed. Please try again.', botToken);
  }
}

async function handleRecentCommand(chatId: number, botToken: string) {
  try {
    const supabase = await createClient();
    
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('title, content, source, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!prompts || prompts.length === 0) {
      await sendMessage(chatId, '📭 No prompts saved yet. Use /save to add your first prompt!', botToken);
      return;
    }

    let response = '📋 <b>Your recent prompts:</b>\n\n';
    
    prompts.forEach((p, i) => {
      const preview = p.content.slice(0, 80) + (p.content.length > 80 ? '...' : '');
      response += `${i + 1}. <b>${p.title}</b>\n<code>${preview}</code>\n\n`;
    });

    await sendMessage(chatId, response, botToken);
  } catch (error) {
    console.error('Error fetching recent prompts:', error);
    await sendMessage(chatId, '❌ Failed to fetch recent prompts.', botToken);
  }
}

async function handleStatsCommand(chatId: number, botToken: string) {
  try {
    const supabase = await createClient();
    
    const { count: total } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true });

    const { count: favorites } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('is_favorite', true);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: thisWeek } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    const response = `📊 <b>Your PromptVault Stats</b>\n\n` +
      `📝 Total prompts: <b>${total || 0}</b>\n` +
      `⭐ Favorites: <b>${favorites || 0}</b>\n` +
      `📅 Added this week: <b>${thisWeek || 0}</b>`;

    await sendMessage(chatId, response, botToken);
  } catch (error) {
    console.error('Error fetching stats:', error);
    await sendMessage(chatId, '❌ Failed to fetch stats.', botToken);
  }
}

async function handleHelpCommand(chatId: number, botToken: string) {
  const helpText = `🗃️ <b>PromptVault Bot</b>\n\n` +
    `Save and search your AI prompts from anywhere!\n\n` +
    `<b>Commands:</b>\n\n` +
    `📥 <code>/save [prompt]</code>\nSave a new prompt\n\n` +
    `🔍 <code>/search [query]</code> or <code>/find [query]</code>\nSearch your prompts\n\n` +
    `📋 <code>/recent</code> or <code>/last</code>\nShow recent prompts\n\n` +
    `📊 <code>/stats</code>\nView your stats\n\n` +
    `❓ <code>/help</code>\nShow this help message\n\n` +
    `<i>💡 Tip: For full editing and version control, use the web dashboard!</i>`;

  await sendMessage(chatId, helpText, botToken);
}

