import { useState, useCallback } from 'react';

interface WebhookData {
  item_name: string;
  sku: string;
  amount: number;
  condition?: 'new' | 'good' | 'damaged' | 'broken';
}

// Create HMAC signature for webhook verification (browser-compatible)
async function createHmac(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function useWebhookListener() {
  const [pendingWebhook, setPendingWebhook] = useState<WebhookData | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const showWebhookPopup = useCallback((data: WebhookData) => {
    setPendingWebhook(data);
    setIsPopupOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    setIsPopupOpen(false);
    setPendingWebhook(null);
  }, []);

  const confirmWebhook = useCallback(async (action: 'add' | 'remove', data: WebhookData) => {
    const payload = {
      action,
      item_name: data.item_name,
      sku: data.sku,
      amount: data.amount,
      condition: data.condition || 'new',
    };

    const bodyText = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    
    // Get webhook secret from localStorage (set via Settings)
    const webhookSecret = localStorage.getItem('webhook_secret') || 'default-test-secret';
    const signedPayload = `${timestamp}.${bodyText}`;
    const signature = await createHmac(signedPayload, webhookSecret);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/stock-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
      },
      body: bodyText,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result?.error) {
      throw new Error(result.error);
    }

    return result;
  }, []);

  // Simulate receiving a webhook (for testing/demo)
  const simulateIncomingWebhook = useCallback((data: Partial<WebhookData>) => {
    showWebhookPopup({
      item_name: data.item_name || 'Test Item',
      sku: data.sku || 'TEST-001',
      amount: data.amount || 10,
      condition: data.condition || 'new',
    });
  }, [showWebhookPopup]);

  return {
    pendingWebhook,
    isPopupOpen,
    showWebhookPopup,
    closePopup,
    confirmWebhook,
    simulateIncomingWebhook,
  };
}