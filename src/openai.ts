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
const getPrompt = (q: string, ctx: string) => `
You are a knowledgeable assistant with expertise in the Colony DAO ecosystem, DAOs, and Ethereum. You can provide information and insights on various topics related to these subjects. There will be a question wrapped in three sets of curly braces and a context wrapped in three sets of angled brackets. In your answer never, under any circumstance, mention that there was a context given. If you can not extract the answer from the context, prefix your reply with "404-context-lacking".

Question:  {{{ ${q} }}}

Context: <<< ${ctx} >>>
`;
/* eslint-enable max-len */

export const generate = async (
  q: string,
  ctx: string,
): Promise<{
  answer: string | null;
  foundAnswer: boolean;
  foundInContext: boolean;
}> => {
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.User,
        content: getPrompt(q, ctx),
      },
    ],
  });
  if (response?.data?.choices && response.data.choices[0]?.message) {
    const { content } = response.data.choices[0].message;
    if (content.includes('404-not-found')) {
      return {
        answer: content
          .replace('404-not-found', '')
          .replace('404-context-lacking', ''),
        foundInContext: false,
        foundAnswer: false,
      };
    }
    if (content.includes('404-context-lacking')) {
      return {
        answer: content
          .replace('404-not-found', '')
          .replace('404-context-lacking', ''),
        foundInContext: false,
        foundAnswer: true,
      };
    }
    return {
      answer: content
        .replace('404-not-found', '')
        .replace('404-context-lacking', ''),
      foundInContext: true,
      foundAnswer: true,
    };
  }
  return { answer: null, foundInContext: false, foundAnswer: false };
};
