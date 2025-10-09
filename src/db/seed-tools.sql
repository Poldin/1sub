-- Insert test tools for Phase 3
INSERT INTO tools (name, description, url, credit_cost_per_use, is_active, metadata) VALUES
(
  'Random Quote Generator',
  'Get inspirational quotes from famous personalities',
  'http://localhost:3000/api/v1/tools/demo-quote',
  1.00,
  true,
  '{"category": "entertainment", "emoji": "💬", "version": "1.0.0"}'::jsonb
),
(
  'GPT Text Generator',
  'Generate text content using OpenAI GPT-3.5-turbo',
  'http://localhost:3000/api/v1/tools/gpt-util',
  10.00,
  true,
  '{"category": "ai", "emoji": "🤖", "version": "1.0.0", "requires_api_key": "OPENAI_API_KEY"}'::jsonb
),
(
  'n8n Workflow Simulator',
  'Simulate n8n automation workflows (demo)',
  'http://localhost:3000/api/v1/tools/n8n-webhook',
  5.00,
  true,
  '{"category": "automation", "emoji": "⚡", "version": "1.0.0", "type": "webhook"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;
