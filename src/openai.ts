import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from 'openai';

const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
  throw new Error('Need OPENAI_API_KEY');
}

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

/* eslint-disable max-len */
const getSystemPrompt = (ctx?: string) => `
You are a friendly, helpful assistant with expert knowledge about the Colony DAO ecosystem and DAOs and Ethereum in general. Always answer in one brief paragraph only.${
  ctx
    ? `Additionally the following information is provided to help you process the prompt:\n\n${ctx}`
    : ''
}`;
/* eslint-enable max-len */

export const generate = async (
  q: string,
  ctx?: string,
): Promise<{
  answer: string | null;
}> => {
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    frequency_penalty: 1,
    temperature: 0.8,
    max_tokens: 512,
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: getSystemPrompt(ctx),
      },
      {
        role: ChatCompletionRequestMessageRoleEnum.User,
        content: q,
      },
    ],
  });
  if (response?.data?.choices && response.data.choices[0]?.message) {
    const { content } = response.data.choices[0].message;
    return { answer: content };
  }
  return { answer: null };
};
