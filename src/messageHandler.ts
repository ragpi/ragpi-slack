import { App, KnownEventFromType } from '@slack/bolt';
// eslint-disable-next-line n/no-unpublished-import
import { type ConversationsRepliesResponse } from '@slack/web-api';
import { config } from './config';
import { ChatMessage, ChatRequest, ChatResponse } from './types';

interface HandleMessageArgs {
  app: App;
  message: KnownEventFromType<'message'>;
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
    console.error('Error:', JSON.stringify(error, null, 2));
    throw new Error('An error occurred while fetching chat response');
  }
};

export const handleMessage = async ({ app, message }: HandleMessageArgs) => {
  try {
    const newMessage = await app.client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: '_Thinking..._',
    });

    const chatHistory = await app.client.conversations.replies({
      channel: message.channel,
      // @ts-expect-error thread_ts should exist when message is in a thread
      ts: message.thread_ts || message.ts,
    });

    const messages = formatChatHistory(chatHistory);

    const request: ChatRequest = {
      sources: config.RAGPI_SOURCES,
      messages,
    };

    const response = await fetchChatResponse(request);

    if (newMessage.ts) {
      await app.client.chat.update({
        channel: message.channel,
        ts: newMessage.ts,
        text: response.message,
      });
    } else {
      await app.client.chat.postMessage({
        channel: message.channel,
        thread_ts: message.ts,
        text: response.message,
      });
    }
  } catch (error) {
    console.error(error);
    await app.client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: 'Sorry, an error occurred. Please try again later.',
    });
  }
};
