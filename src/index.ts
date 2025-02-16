import 'dotenv/config';
import { App } from '@slack/bolt';
import { handleMessage } from './messageHandler';

const app = new App({
  socketMode: true,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.message('', async ({ message, say }) =>
  handleMessage({ app, message, say }),
);

void (async () => {
  await app.start(process.env.PORT || 3000);

  app.logger.info('⚡️ Bolt app is running!');
})();
