import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  action: 'incoming' | 'add' | 'remove';
  item_name?: string;
  sku?: string;
  amount?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
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
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['item_name', 'sku', 'amount'],
          received: payload
        }),
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
        JSON.stringify({ error: 'Database error', details: findError.message }),
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
          JSON.stringify({ error: 'Failed to create item', details: createError.message }),
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
      return new Response(
        JSON.stringify({ 
          error: 'Item not found',
          sku: payload.sku,
          message: 'Cannot remove stock from non-existent item'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify item name matches (case-insensitive)
    if (item.name.toLowerCase() !== payload.item_name.toLowerCase()) {
      return new Response(
        JSON.stringify({ 
          error: 'Item name mismatch',
          expected: item.name,
          received: payload.item_name,
          message: 'SKU exists but item name does not match'
        }),
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
        JSON.stringify({ error: 'Failed to update item', details: updateError.message }),
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});