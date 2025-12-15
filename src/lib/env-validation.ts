/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are set at startup.
 * Fails fast with clear error messages if any are missing.
 */

interface EnvConfig {
  name: string;
  required: boolean;
  minLength?: number;
  validate?: (value: string) => boolean | string;
  description: string;
}

const ENV_CONFIG: EnvConfig[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validate: (value) => value.startsWith('https://') || 'Must be a valid HTTPS URL',
    description: 'Supabase project URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    minLength: 20,
    description: 'Supabase anonymous key',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    minLength: 20,
    description: 'Supabase service role key (for server-side operations)',
  },
  {
    name: 'JWT_SECRET',
    required: false,
    minLength: 32,
    description: '[DEPRECATED] JWT secret for legacy endpoints only (minimum 32 characters)',
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    validate: (value) => value.startsWith('sk_') || 'Must be a valid Stripe secret key (starts with sk_)',
    description: 'Stripe secret key for payment processing',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    validate: (value) => value.startsWith('whsec_') || 'Must be a valid Stripe webhook secret (starts with whsec_)',
    description: 'Stripe webhook secret for signature verification',
  },
  {
    name: 'ADMIN_EMAIL',
    required: false,
    validate: (value) => value.includes('@') || 'Must be a valid email address',
    description: 'Admin email for notifications',
  },
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for sending emails',
  },
  {
    name: 'CRON_SECRET',
    required: false,
    description: 'Secret for authenticating cron job endpoints',
  },
];

interface ValidationError {
  variable: string;
  error: string;
  description: string;
}

/**
 * Validate a single environment variable
 */
function validateEnvVar(config: EnvConfig): ValidationError | null {
  const value = process.env[config.name];

  // Check if required variable is missing
  if (config.required && !value) {
    return {
      variable: config.name,
      error: 'Required environment variable is not set',
      description: config.description,
    };
  }

  // If not required and not set, skip validation
  if (!value) {
    return null;
  }

  // Check minimum length
  if (config.minLength && value.length < config.minLength) {
    return {
      variable: config.name,
      error: `Must be at least ${config.minLength} characters (current: ${value.length})`,
      description: config.description,
    };
  }

  // Custom validation
  if (config.validate) {
    const result = config.validate(value);
    if (result !== true) {
      return {
        variable: config.name,
        error: typeof result === 'string' ? result : 'Validation failed',
        description: config.description,
      };
    }
  }

  return null;
}

/**
 * Validate all environment variables
 * Throws an error with detailed information if any validation fails
 */
export function validateEnv(): void {
  const errors: ValidationError[] = [];

  for (const config of ENV_CONFIG) {
    const error = validateEnvVar(config);
    if (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    const errorMessage = [
      '\n',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '❌ Environment Variable Validation Failed',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'The following environment variables have issues:',
      '',
      ...errors.map(err => [
        `❌ ${err.variable}`,
        `   Error: ${err.error}`,
        `   Description: ${err.description}`,
        '',
      ]).flat(),
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'Please create a .env.local file in the root directory with:',
      '',
      ...errors.map(err => `${err.variable}=your_value_here`),
      '',
      'See README.md for more information on environment variables.',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '\n',
    ].join('\n');

    throw new Error(errorMessage);
  }
}

/**
 * Get environment information (safe for logging)
 */
export function getEnvInfo(): Record<string, string> {
  const info: Record<string, string> = {
    NODE_ENV: process.env.NODE_ENV || 'unknown',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing',
  };

  return info;
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnv();
    console.log('✓ Environment variables validated successfully');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Environment validation failed');
    process.exit(1);
  }
}

