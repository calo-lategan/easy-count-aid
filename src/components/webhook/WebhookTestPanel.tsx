import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Send, Copy, CheckCircle, Code, Key, Clock, Shield, Eye, EyeOff, Save } from 'lucide-react';
import { ConditionSelector } from '@/components/stock/ConditionSelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WebhookTestPanelProps {
  webhookUrl: string;
  onTestWebhook: (data: { name: string; sku: string; amount: number; condition: 'new' | 'good' | 'damaged' | 'broken' }) => void;
}

export function WebhookTestPanel({ webhookUrl, onTestWebhook }: WebhookTestPanelProps) {
  const { toast } = useToast();
  const [testName, setTestName] = useState('Test Item');
  const [testSku, setTestSku] = useState('TEST-001');
  const [testAmount, setTestAmount] = useState(10);
  const [testCondition, setTestCondition] = useState<'new' | 'good' | 'damaged' | 'broken'>('new');
  const [copied, setCopied] = useState<string | null>(null);
  const [isImplementationOpen, setIsImplementationOpen] = useState(false);
  
  // Webhook secret state
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [secretSaved, setSecretSaved] = useState(false);

  // Load saved secret on mount
  useEffect(() => {
    const savedSecret = localStorage.getItem('webhook_secret');
    if (savedSecret) {
      setWebhookSecret(savedSecret);
      setSecretSaved(true);
    }
  }, []);

  const handleSaveSecret = () => {
    if (webhookSecret.trim()) {
      localStorage.setItem('webhook_secret', webhookSecret.trim());
      setSecretSaved(true);
      toast({ title: 'Secret Saved', description: 'Webhook secret saved locally for signing requests' });
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTest = () => {
    if (!testName.trim() || !testSku.trim() || testAmount <= 0) {
      toast({ 
        title: 'Invalid Input', 
        description: 'Please fill in all fields with valid values',
        variant: 'destructive'
      });
      return;
    }
    onTestWebhook({ name: testName, sku: testSku, amount: testAmount, condition: testCondition });
  };

  // Generate sample payloads
  const samplePayload = JSON.stringify({
    action: "add",
    item_name: testName,
    sku: testSku,
    amount: testAmount,
    condition: testCondition
  }, null, 2);

  const curlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-signature: <YOUR_HMAC_SIGNATURE>" \\
  -H "x-webhook-timestamp: <UNIX_TIMESTAMP_MS>" \\
  -d '${JSON.stringify({ action: "add", item_name: testName, sku: testSku, amount: testAmount, condition: testCondition })}'`;

  const nodeJsExample = `const crypto = require('crypto');

const WEBHOOK_SECRET = 'your-webhook-secret';
const WEBHOOK_URL = '${webhookUrl}';

async function sendWebhook(data) {
  const timestamp = Date.now().toString();
  const body = JSON.stringify(data);
  const signedPayload = \`\${timestamp}.\${body}\`;
  
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp,
    },
    body,
  });

  return response.json();
}

// Example usage:
sendWebhook({
  action: 'add',      // 'add' | 'remove' | 'incoming'
  item_name: 'Widget',
  sku: 'WID-001',
  amount: 10,
  condition: 'new'    // 'new' | 'good' | 'damaged' | 'broken'
});`;

  const pythonExample = `import hmac
import hashlib
import time
import requests
import json

WEBHOOK_SECRET = 'your-webhook-secret'
WEBHOOK_URL = '${webhookUrl}'

def send_webhook(data):
    timestamp = str(int(time.time() * 1000))
    body = json.dumps(data)
    signed_payload = f"{timestamp}.{body}"
    
    signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    response = requests.post(
        WEBHOOK_URL,
        json=data,
        headers={
            'Content-Type': 'application/json',
            'x-webhook-signature': signature,
            'x-webhook-timestamp': timestamp,
        }
    )
    return response.json()

# Example usage:
send_webhook({
    'action': 'add',      # 'add' | 'remove' | 'incoming'
    'item_name': 'Widget',
    'sku': 'WID-001',
    'amount': 10,
    'condition': 'new'    # 'new' | 'good' | 'damaged' | 'broken'
})`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Configuration
        </CardTitle>
        <CardDescription>
          Configure and test your stock webhook integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Webhook URL
          </Label>
          <div className="flex gap-2">
            <Input 
              value={webhookUrl} 
              readOnly 
              className="font-mono text-sm bg-muted"
            />
            <Button variant="outline" size="icon" onClick={() => handleCopy(webhookUrl, 'Webhook URL')}>
              {copied === 'Webhook URL' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Send POST requests to this URL to trigger stock updates
          </p>
        </div>

        {/* Webhook Secret Input */}
        <div className="space-y-2 p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <Label className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Key className="h-4 w-4" />
            Webhook Secret (for signing)
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={(e) => {
                  setWebhookSecret(e.target.value);
                  setSecretSaved(false);
                }}
                placeholder="Enter your webhook secret"
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleSaveSecret} variant={secretSaved ? 'outline' : 'default'} className="gap-2">
              {secretSaved ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Save className="h-4 w-4" />}
              {secretSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠️ This secret must match the WEBHOOK_SECRET configured in your backend. It's stored locally in your browser for signing test requests.
          </p>
        </div>

        {/* Security Headers */}
        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
          <Label className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Shield className="h-4 w-4" />
            Required Security Headers
          </Label>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <code className="bg-muted px-2 py-1 rounded font-mono">x-webhook-signature</code>
              <span className="text-muted-foreground">HMAC-SHA256 signature</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <code className="bg-muted px-2 py-1 rounded font-mono">x-webhook-timestamp</code>
              <span className="text-muted-foreground">Unix timestamp in ms</span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-muted rounded text-sm">
            <p className="font-medium mb-1">Signature Generation:</p>
            <code className="text-xs font-mono block">
              signature = HMAC-SHA256(timestamp + "." + body, WEBHOOK_SECRET)
            </code>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Requests are rejected if timestamp is older than 5 minutes (replay protection)
          </p>
        </div>

        {/* Payload Format */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Payload Format
          </Label>
          <div className="relative">
            <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
{`{
  "action": "add",           // "add" | "remove" | "incoming"
  "item_name": "string",     // Item display name
  "sku": "string",           // Unique stock keeping unit
  "amount": number,          // Positive integer quantity
  "condition": "new"         // "new" | "good" | "damaged" | "broken"
}`}
            </pre>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleCopy(samplePayload, 'Payload')}
            >
              {copied === 'Payload' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>action:</strong> "incoming" = pending confirmation, "add" = direct add, "remove" = direct remove</p>
            <p><strong>condition:</strong> Stock condition for tracking ("new", "good", "damaged", "broken")</p>
          </div>
        </div>

        {/* Implementation Examples */}
        <Collapsible open={isImplementationOpen} onOpenChange={setIsImplementationOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Code className="h-4 w-4" />
              {isImplementationOpen ? 'Hide' : 'Show'} Implementation Examples
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* cURL Example */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">cURL Example</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(curlExample, 'cURL')}>
                  {copied === 'cURL' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {curlExample}
              </pre>
            </div>

            {/* Node.js Example */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Node.js Example</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(nodeJsExample, 'Node.js')}>
                  {copied === 'Node.js' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-64">
                {nodeJsExample}
              </pre>
            </div>

            {/* Python Example */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Python Example</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(pythonExample, 'Python')}>
                  {copied === 'Python' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-64">
                {pythonExample}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Test Webhook */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium">Test Webhook (Simulated)</h4>
          <p className="text-xs text-muted-foreground">
            This simulates receiving a webhook to test the confirmation flow. No actual HTTP request is made.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Item Name</Label>
              <Input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SKU</Label>
              <Input
                value={testSku}
                onChange={(e) => setTestSku(e.target.value)}
                placeholder="SKU"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                min="1"
                value={testAmount}
                onChange={(e) => setTestAmount(parseInt(e.target.value) || 0)}
                placeholder="Amount"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Condition</Label>
              <ConditionSelector
                value={testCondition}
                onChange={setTestCondition}
              />
            </div>
          </div>
          <Button onClick={handleTest} className="w-full gap-2">
            <Send className="h-4 w-4" />
            Send Test Webhook
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}