import { decode, encode } from 'gpt-3-encoder';

import { client as weaviate } from './weaviate.js';
import { generate } from './openai.js';

export interface Answer {
  answer: string | null;
  title: string | null;
  url: string | null;
}

export const ask = async (q: string): Promise<Answer> => {
  const res = await weaviate.graphql
    .get()
    .withClassName('Doc')
    .withFields('title content url _additional { score }')
    // .withNearText({ concepts: [q], distance: 0.29 })
    .withHybrid({
      query: q,
      alpha: 0.3,
    })
    .withLimit(10)
    .do();

  if (res?.data?.Get?.Doc) {
    // res.data.Get.Doc.forEach(({ content, title, url, _additional }) => {
    //   console.log(title, url, _additional.score);
    // });
    // return;
    const content = res.data.Get.Doc.reduce(
      (all: string, doc: { content: string }) => `${all}\n\n${doc.content}`,
      '',
    );
    const tokens = encode(content);
    // Limit context
    // GPT-3.5-turbo supports 4097 tokens for question and answer combined
    // 4097 - 30 (question) - 70 (system prompt) - 256 (answer) = 3741
    const decoded = decode(tokens.slice(0, 3741));
    const { title, url } = res.data.Get.Doc[0];
    const { answer } = await generate(q, decoded);
    return { answer, title, url };
  }
  const { answer } = await generate(q);
  return {
    answer,
    title: null,
    url: null,
  };
};
