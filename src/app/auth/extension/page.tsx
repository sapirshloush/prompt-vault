'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Vault, CheckCircle, XCircle } from 'lucide-react';

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          return;
        }

        if (session) {
          // User is logged in - generate a token for the extension
          const token = session.access_token;
          const userId = session.user.id;
          const email = session.user.email;

          // Send token back to extension via URL
          // The extension will detect this and capture the token
          const extensionData = {
            token,
            userId,
            email,
            expiresAt: session.expires_at,
          };

          // Encode the data
          const encodedData = btoa(JSON.stringify(extensionData));
          
          setStatus('success');
          setMessage('Successfully authenticated! You can close this window.');

          // Try to communicate with extension via postMessage
          window.postMessage({
            type: 'PROMPTVAULT_AUTH',
            data: extensionData
          }, '*');

          // Also store in localStorage for extension to read
          localStorage.setItem('promptvault_extension_auth', JSON.stringify(extensionData));

          // Redirect with token in URL for extension to capture
          setTimeout(() => {
            window.location.href = `/auth/extension/success?data=${encodedData}`;
          }, 1000);
        } else {
          // Not logged in - redirect to login
          window.location.href = '/login?redirect=/auth/extension';
        }
      } catch (err) {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    handleAuth();
  }, [supabase.auth]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
      
      <div className="relative w-full max-w-md text-center">
        <img 
          src="/logo-icon.svg" 
          alt="PromptVault" 
          className="h-16 w-16 mx-auto mb-4"
        />
        <h2 className="text-xl font-bold text-zinc-100 mb-6">PromptVault</h2>

        {status === 'loading' && (
          <>
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              Connecting Extension...
            </h1>
            <p className="text-zinc-500">Please wait while we authenticate your extension.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              Extension Connected!
            </h1>
            <p className="text-zinc-500 mb-6">{message}</p>
            <Button
              onClick={() => window.close()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Close Window
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-zinc-100 mb-2">
              Connection Failed
            </h1>
            <p className="text-zinc-500 mb-6">{message}</p>
            <Button
              onClick={() => window.location.href = '/login?redirect=/auth/extension'}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

