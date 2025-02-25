import 'dotenv/config';
import { App } from '@slack/bolt';
import { handleMessage } from './messageHandler';
import { config } from './config';

const app = new App({
  socketMode: true,
  token: config.SLACK_BOT_TOKEN,
  appToken: config.SLACK_APP_TOKEN,
  logLevel: config.LOG_LEVEL,
});

const eventName = config.SLACK_REQUIRE_MENTION ? 'app_mention' : 'message';
app.event(eventName, async ({ event }) => await handleMessage({ app, event }));

void (async () => {
  await app.start(process.env.PORT || 3000);

  app.logger.info('⚡️ Ragpi bot is running!');
})();
