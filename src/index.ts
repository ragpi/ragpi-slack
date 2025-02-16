import 'dotenv/config';
import { App } from '@slack/bolt';
import { handleMessage } from './messageHandler';
import { config } from './config';

const app = new App({
  socketMode: true,
  signingSecret: config.SLACK_SIGNING_SECRET,
  token: config.SLACK_BOT_TOKEN,
  appToken: config.SLACK_APP_TOKEN,
});

app.message('', async ({ message }) => handleMessage({ app, message }));

void (async () => {
  await app.start(process.env.PORT || 3000);

  app.logger.info('⚡️ Bolt app is running!');
})();
