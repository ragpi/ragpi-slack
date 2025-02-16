import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  SLACK_SIGNING_SECRET: z.string({
    required_error: 'SLACK_SIGNING_SECRET is required',
  }),
  SLACK_BOT_TOKEN: z.string({
    required_error: 'SLACK_BOT_TOKEN is required',
  }),
  SLACK_APP_TOKEN: z.string({
    required_error: 'SLACK_APP_TOKEN is required',
  }),
  RAGPI_BASE_URL: z.string({
    required_error: 'RAGPI_BASE_URL is required',
  }),
  RAGPI_API_KEY: z.string().optional(),
  SLACK_SOURCES: z
    .string()
    .optional()
    .transform((str) => {
      if (!str) return [];
      return str.split(',').filter(Boolean);
    }),
  SLACK_CHAT_MODEL: z.string().optional(),
});

function validateConfig() {
  try {
    return ConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid configuration:\n${issues}`);
    }
    throw error;
  }
}

export const config = validateConfig();
