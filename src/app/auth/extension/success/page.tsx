'use client';

import { useEffect } from 'react';
import { CheckCircle, Vault } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExtensionAuthSuccessPage() {
  useEffect(() => {
    // The extension content script will read the URL and extract the auth data
    // This page just shows a success message
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
      
      <div className="relative w-full max-w-md text-center">
        <img 
          src="/logo.png" 
          alt="PromptVault" 
          className="h-14 w-auto mx-auto mb-6"
        />

        <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
        
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">
          🎉 Extension Connected!
        </h1>
        
        <p className="text-zinc-400 mb-6">
          Your PromptVault browser extension is now connected to your account.
          You can close this window and start saving prompts!
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">What's next?</h3>
          <ul className="text-sm text-zinc-500 space-y-1 text-left">
            <li>✓ Select text on any AI chat page</li>
            <li>✓ Click "Save to PromptVault" button</li>
            <li>✓ AI will auto-analyze your prompt</li>
            <li>✓ One click to save!</li>
          </ul>
        </div>

        <Button
          onClick={() => window.close()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Close Window
        </Button>
      </div>
    </div>
  );
}

