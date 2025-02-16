import { App, KnownEventFromType, SayFn } from '@slack/bolt';
// import { config } from './config';

interface HandleMessageArgs {
  app: App;
  message: KnownEventFromType<'message'>;
  say: SayFn;
}

export const handleMessage = async ({
  app,
  message,
  say,
}: HandleMessageArgs) => {
  try {
    // const chatHistory = await app.client.conversations.replies({
    //   channel: message.channel,
    //   ts: message.thread_ts,
    // });

    await app.client.chat.postMessage({
      thread_ts: message.ts,
      channel: message.channel,
      text: 'Hello, world!',
    });
  } catch (error) {
    console.error(error);
    await say('Sorry, an error occurred. Please try again later.');
  }
};
