import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Send, Copy, CheckCircle } from 'lucide-react';

interface WebhookTestPanelProps {
  webhookUrl: string;
  onTestWebhook: (data: { name: string; sku: string; amount: number }) => void;
}

export function WebhookTestPanel({ webhookUrl, onTestWebhook }: WebhookTestPanelProps) {
  const { toast } = useToast();
  const [testName, setTestName] = useState('Test Item');
  const [testSku, setTestSku] = useState('TEST-001');
  const [testAmount, setTestAmount] = useState(10);
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
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
    onTestWebhook({ name: testName, sku: testSku, amount: testAmount });
  };

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
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input 
              value={webhookUrl} 
              readOnly 
              className="font-mono text-sm bg-muted"
            />
            <Button variant="outline" size="icon" onClick={handleCopyUrl}>
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Send POST requests to this URL to trigger stock updates
          </p>
        </div>

        {/* Payload Format */}
        <div className="space-y-2">
          <Label>Expected Payload Format</Label>
          <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
{`{
  "action": "incoming",  // or "add", "remove"
  "item_name": "string",
  "sku": "string", 
  "amount": number
}`}
          </pre>
        </div>

        {/* Security Headers */}
        <div className="space-y-2">
          <Label>Required Security Headers</Label>
          <pre className="p-3 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
{`x-webhook-signature: <HMAC-SHA256 of timestamp.body>
x-webhook-timestamp: <Unix timestamp in ms>`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Sign the request with HMAC-SHA256 using your webhook secret. 
            Signature = HMAC(timestamp + "." + body, WEBHOOK_SECRET)
          </p>
        </div>

        {/* Test Webhook */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium">Test Webhook</h4>
          <div className="grid grid-cols-3 gap-3">
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