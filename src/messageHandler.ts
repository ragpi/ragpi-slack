import { App, KnownEventFromType } from '@slack/bolt';
import {
  Logger,
  type AppMentionEvent,
  type ConversationsRepliesResponse,
  // eslint-disable-next-line n/no-unpublished-import
} from '@slack/web-api';
import { config } from './config';
import { ChatMessage, ChatRequest, ChatResponse } from './types';

interface HandleMessageArgs {
  app: App;
  event: KnownEventFromType<'message'> | AppMentionEvent;
}

const formatChatHistory = (
  chatHistory: ConversationsRepliesResponse,
): ChatMessage[] => {
  if (!chatHistory.messages) {
    throw new Error('Chat history does not contain messages');
  }

  const messages = chatHistory.messages
    .filter((message) => message.text)
    .map(
      (message): ChatMessage => ({
        role: message.bot_id ? 'assistant' : 'user',
        content: message.text!,
      }),
    );

  return messages;
};

const fetchChatResponse = async (
  request: ChatRequest,
  logger: Logger,
): Promise<ChatResponse> => {
  const response = await fetch(`${config.RAGPI_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.RAGPI_API_KEY ? { 'x-api-key': config.RAGPI_API_KEY } : {}),
    },
    body: JSON.stringify(request),
  });

  if (response.ok) {
    return response.json() as Promise<ChatResponse>;
  } else {
    const error = await response.json();
    logger.error('Error:', JSON.stringify(error, null, 2));
    throw new Error('An error occurred while fetching chat response');
  }
};

const markdownToSlack = (markdownText: string): string => {
  let slackText = markdownText;

  // Remove language specifier from code blocks
  slackText = slackText.replace(/```[a-zA-Z]+\n/g, '```');

  // Convert links: [text](url) to <url|text>
  slackText = slackText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // Convert bold: **text** or __text__ to *text*
  slackText = slackText.replace(/(\*\*|__)(.*?)\1/g, '*$2*');

  // Handle headings (convert to bold)
  slackText = slackText.replace(/^# (.*?)$/gm, '*$1*');
  slackText = slackText.replace(/^## (.*?)$/gm, '*$1*');
  slackText = slackText.replace(/^### (.*?)$/gm, '*$1*');

  return slackText;
};

export const handleMessage = async ({ app, event }: HandleMessageArgs) => {
  if (event.subtype) {
    app.logger.debug(`Ignoring message subtype: ${event.subtype}`);
    return;
  }

  app.logger.debug(
    // @ts-expect-error user should exist on event
    `Processing message from user ${event?.user || 'unknown'} in channel ${event.channel}`,
  );

  try {
    const newMessage = await app.client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: '_Thinking..._',
    });

    const chatHistory = await app.client.conversations.replies({
      channel: event.channel,
      // @ts-expect-error thread_ts should exist when event is in a thread
      ts: event?.thread_ts || event.ts,
    });

    const messages = formatChatHistory(chatHistory);

    const request: ChatRequest = {
      sources: config.RAGPI_SOURCES,
      messages,
    };

    const response = await fetchChatResponse(request, app.logger);

    const formattedMessage = markdownToSlack(response.message);

    if (newMessage.ts) {
      await app.client.chat.update({
        channel: event.channel,
        ts: newMessage.ts,
        text: formattedMessage,
      });
    } else {
      await app.client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: formattedMessage,
      });
    }
    app.logger.debug(`Successfully responded in channel ${event.channel}`);
  } catch (error) {
    app.logger.error(error);
    await app.client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: 'Sorry, an error occurred. Please try again later.',
    });
  }
};
