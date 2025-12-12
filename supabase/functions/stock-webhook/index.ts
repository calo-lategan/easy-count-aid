import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
};

interface WebhookPayload {
  action: 'incoming' | 'add' | 'remove';
  item_name?: string;
  sku?: string;
  amount?: number;
}

// Create HMAC signature for webhook verification
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

// Verify webhook signature
async function verifyWebhookSignature(
  body: string, 
  signature: string | null, 
  timestamp: string | null,
  secret: string
): Promise<{ valid: boolean; error?: string }> {
  if (!signature || !timestamp) {
    return { valid: false, error: 'Missing signature or timestamp headers' };
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const timestampMs = parseInt(timestamp);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
    return { valid: false, error: 'Timestamp expired or invalid' };
  }

  // Create expected signature from timestamp + body
  const signedPayload = `${timestamp}.${body}`;
  const expectedSignature = await createHmac(signedPayload, secret);

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    
    // Get request body as text for signature verification
    const bodyText = await req.text();
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('x-webhook-signature');
      const timestamp = req.headers.get('x-webhook-timestamp');
      
      const verification = await verifyWebhookSignature(bodyText, signature, timestamp, webhookSecret);
      
      if (!verification.valid) {
        console.error('Webhook signature verification failed:', verification.error);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Webhook signature verified successfully');
    } else {
      // SECURITY: Reject requests when webhook secret is not configured
      console.error('WEBHOOK_SECRET not configured - rejecting request');
      return new Response(
        JSON.stringify({ 
          error: 'Webhook not configured',
          message: 'WEBHOOK_SECRET must be set to enable webhook functionality'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = JSON.parse(bodyText);
    console.log('Received webhook payload:', payload);

    // Validate payload
    if (!payload.action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle "incoming" action - just acknowledge and return pending status
    if (payload.action === 'incoming') {
      return new Response(
        JSON.stringify({ 
          status: 'pending',
          message: 'Webhook received. Awaiting confirmation.',
          requires_confirmation: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields for add/remove actions
    if (!payload.item_name || !payload.sku || payload.amount === undefined) {
      console.error('Missing required fields. Received:', payload);
      return new Response(
        JSON.stringify({ error: 'Bad request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount is a positive integer
    if (!Number.isInteger(payload.amount) || payload.amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be a positive integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find item by SKU
    const { data: item, error: findError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('sku', payload.sku)
      .maybeSingle();

    if (findError) {
      console.error('Error finding item:', findError);
      return new Response(
        JSON.stringify({ error: 'Unable to process request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If item doesn't exist and action is add, create it
    if (!item && payload.action === 'add') {
      // Get the Uncategorized category
      const uncategorizedId = '00000000-0000-0000-0000-000000000000';
      
      const { data: newItem, error: createError } = await supabase
        .from('inventory_items')
        .insert({
          name: payload.item_name,
          sku: payload.sku,
          current_quantity: payload.amount,
          category_id: uncategorizedId,
          condition: 'good'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating item:', createError);
        return new Response(
          JSON.stringify({ error: 'Unable to create item' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record the stock movement
      await supabase.from('stock_movements').insert({
        item_id: newItem.id,
        movement_type: 'add',
        quantity: payload.amount,
        entry_method: 'manual',
        notes: 'Created via webhook'
      });

      return new Response(
        JSON.stringify({ 
          status: 'success',
          action: 'created',
          item: newItem,
          message: `Created new item "${payload.item_name}" with quantity ${payload.amount}`
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!item) {
      console.error('Item not found for SKU:', payload.sku);
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify item name matches (case-insensitive)
    if (item.name.toLowerCase() !== payload.item_name.toLowerCase()) {
      console.error('Item name mismatch for SKU:', payload.sku, 'Expected:', item.name, 'Received:', payload.item_name);
      return new Response(
        JSON.stringify({ error: 'Item name mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new quantity (allow negative)
    const newQuantity = payload.action === 'add' 
      ? item.current_quantity + payload.amount
      : item.current_quantity - payload.amount;

    // Warn but allow removal even if it results in negative stock
    if (payload.action === 'remove' && payload.amount > item.current_quantity) {
      console.log(`Warning: Removing ${payload.amount} from ${item.current_quantity} will result in negative stock`);
    }

    // Update item quantity
    const { data: updatedItem, error: updateError } = await supabase
      .from('inventory_items')
      .update({ 
        current_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating item:', updateError);
      return new Response(
        JSON.stringify({ error: 'Unable to update item' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the stock movement
    await supabase.from('stock_movements').insert({
      item_id: item.id,
      movement_type: payload.action,
      quantity: payload.amount,
      entry_method: 'manual',
      notes: `Updated via webhook`
    });

    return new Response(
      JSON.stringify({ 
        status: 'success',
        action: payload.action,
        item: updatedItem,
        previous_quantity: item.current_quantity,
        new_quantity: newQuantity,
        change: payload.action === 'add' ? `+${payload.amount}` : `-${payload.amount}`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
