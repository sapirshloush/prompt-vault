# 🗃️ PromptVault Setup Guide

Welcome! Follow these steps to get your personal prompt vault running in just 10 minutes.

## Step 1: Create a Supabase Project (FREE)

1. Go to [supabase.com](https://supabase.com) and sign up (it's free!)
2. Click **"New Project"**
3. Choose your organization
4. Fill in:
   - **Project name**: `prompt-vault`
   - **Database password**: (save this somewhere safe!)
   - **Region**: Choose closest to you
5. Click **"Create new project"** and wait ~2 minutes for it to spin up

## Step 2: Set Up the Database

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste it into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" - that means it worked!

## Step 3: Get Your Supabase Credentials

1. In Supabase, go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. You'll need:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

## Step 4: Configure Your Local Environment

1. In the project root, create a file called `.env.local`:

```bash
# Copy this and fill in your values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Save the file

## Step 5: Run the App!

```bash
cd ~/Projects/prompt-vault
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser - you should see your beautiful PromptVault dashboard! 🎉

---

## 🤖 Optional: Set Up Telegram Bot

Want to save prompts from your phone? Here's how to set up the Telegram bot:

### 1. Create Your Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name: "My PromptVault"
4. Choose a username: `your_promptvault_bot`
5. Save the **bot token** you receive (looks like `123456:ABC-DEF1234...`)

### 2. Add to Your Environment

Add to your `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_WEBHOOK_SECRET=any-random-string-you-want
```

### 3. Set Up Webhook (after deploying to Vercel)

Once deployed, run this command (replace the values):

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/telegram/webhook&secret_token=<YOUR_WEBHOOK_SECRET>"
```

Now you can:
- `/save [your prompt]` - Save a prompt
- `/search [query]` - Search prompts  
- `/recent` - View recent prompts
- `/stats` - See your stats

---

## 🚀 Deploy to Vercel (FREE)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial PromptVault setup"
   git push origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up with GitHub

3. Click **"New Project"** and import your `prompt-vault` repo

4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `TELEGRAM_BOT_TOKEN` = your Telegram bot token (optional)
   - `TELEGRAM_WEBHOOK_SECRET` = your webhook secret (optional)

5. Click **Deploy** - your app will be live in ~1 minute!

---

## 📱 Quick Start Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server
```

## 🆘 Troubleshooting

### "Error: Missing Supabase environment variables"
Make sure your `.env.local` file exists and has the correct values.

### "Error: relation 'prompts' does not exist"
Run the SQL schema in Supabase SQL Editor.

### Prompts not showing up
Check the browser console for errors. Make sure your Supabase anon key is correct.

---

## 🎯 What's Next?

- [ ] Add your first prompt!
- [ ] Try the Telegram bot for quick saves
- [ ] Rate your prompts to track what works
- [ ] Use version control to iterate on prompts
- [ ] Become a prompt engineering master! 🚀

