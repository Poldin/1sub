-- 1sub MVP Phase 1 Seed Data
-- Sample data for testing and development

-- Insert sample tools
INSERT INTO public.tools (id, name, description, url, api_endpoint, credit_cost_per_use, is_active, metadata) VALUES
  (gen_random_uuid(), 'GPT-4 API', 'OpenAI GPT-4 language model access', 'https://openai.com', 'https://api.openai.com/v1/chat/completions', 0.10, true, '{"provider": "openai", "model": "gpt-4"}'),
  (gen_random_uuid(), 'n8n Workflow', 'Automation platform for workflows', 'https://n8n.io', 'https://api.n8n.io/v1/workflows', 0.05, true, '{"provider": "n8n", "version": "1.0"}'),
  (gen_random_uuid(), 'Stripe API', 'Payment processing and subscription management', 'https://stripe.com', 'https://api.stripe.com/v1', 0.02, true, '{"provider": "stripe", "version": "2023-10-16"}'),
  (gen_random_uuid(), 'SendGrid Email', 'Email delivery service', 'https://sendgrid.com', 'https://api.sendgrid.com/v3', 0.01, true, '{"provider": "sendgrid", "version": "v3"}'),
  (gen_random_uuid(), 'GitHub API', 'Code repository and collaboration platform', 'https://github.com', 'https://api.github.com', 0.00, true, '{"provider": "github", "version": "v4"}');

-- Note: User data will be created through Supabase Auth
-- Credit balances will be auto-created via triggers when users sign up


