import { client as weaviate } from './weaviate.ts';
import { generate } from './openai.ts';

export interface Answer {
  answer: string | null;
  title: string | null;
  url: string | null;
}

export const ask = async (q: string): Promise<Answer> => {
  const res = await weaviate.graphql
    .get()
    .withClassName('Doc')
    .withFields('title content url')
    .withNearText({ concepts: [q], distance: 0.29 })
    .withLimit(1)
    .do();
  if (res?.data?.Get?.Doc && res.data.Get.Doc[0]) {
    const { content, title, url } = res.data.Get.Doc[0];
    const { answer } = await generate(q, content);
    return { answer, title, url };
  }
  const { answer } = await generate(q);
  return {
    answer,
    title: null,
    url: null,
  };
};
