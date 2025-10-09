import { config } from 'dotenv';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// Load environment variables
config({ path: '.env.local' });

async function seedTools() {
  console.log('🌱 Seeding tools...');

  const tools = [
    {
      name: 'Random Quote Generator',
      description: 'Get inspirational quotes from famous personalities',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/v1/tools/demo-quote`,
      credit_cost_per_use: 1.00,
      is_active: true,
      metadata: {
        category: 'entertainment',
        emoji: '💬',
        version: '1.0.0'
      }
    },
    {
      name: 'GPT Text Generator',
      description: 'Generate text content using OpenAI GPT-3.5-turbo',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/v1/tools/gpt-util`,
      credit_cost_per_use: 10.00,
      is_active: true,
      metadata: {
        category: 'ai',
        emoji: '🤖',
        version: '1.0.0',
        requires_api_key: 'OPENAI_API_KEY'
      }
    },
    {
      name: 'n8n Workflow Simulator',
      description: 'Simulate n8n automation workflows (demo)',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/v1/tools/n8n-webhook`,
      credit_cost_per_use: 5.00,
      is_active: true,
      metadata: {
        category: 'automation',
        emoji: '⚡',
        version: '1.0.0',
        type: 'webhook'
      }
    }
  ];

  try {
    // Clear existing tools
    await supabaseAdmin.from('tools').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('🗑️ Cleared existing tools');

    // Insert new tools
    const { data, error } = await supabaseAdmin
      .from('tools')
      .insert(tools)
      .select();

    if (error) {
      console.error('❌ Error seeding tools:', error);
      process.exit(1);
    }

    console.log('✅ Successfully seeded tools:');
    data?.forEach(tool => {
      console.log(`  - ${tool.name} (${tool.credit_cost_per_use} credits)`);
    });

  } catch (err) {
    console.error('❌ Error seeding tools:', err);
    process.exit(1);
  }
}

// Run the seed function
seedTools().then(() => {
  console.log('🎉 Tools seeding completed!');
  process.exit(0);
});
