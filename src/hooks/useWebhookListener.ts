import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebhookData {
  item_name: string;
  sku: string;
  amount: number;
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
    const { data: result, error } = await supabase.functions.invoke('stock-webhook', {
      body: {
        action,
        item_name: data.item_name,
        sku: data.sku,
        amount: data.amount,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to process webhook');
    }

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