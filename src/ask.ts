import { client as weaviate } from './weaviate.ts';
import { generate } from './openai.ts';

export interface Answer {
  answer: string | null;
  foundAnswer: boolean;
  foundInContext: boolean;
  title: string | null;
  url: string | null;
}

export const ask = async (q: string): Promise<Answer> => {
  const res = await weaviate.graphql
    .get()
    .withClassName('Doc')
    .withFields('title content url')
    .withNearText({ concepts: [q] })
    .withLimit(1)
    .do();
  if (res?.data?.Get?.Doc && res.data.Get.Doc[0]) {
    const { content, title, url } = res.data.Get.Doc[0];
    const { answer, foundInContext, foundAnswer } = await generate(q, content);
    return { answer, foundAnswer, foundInContext, title, url };
  }
  return {
    answer: null,
    foundAnswer: false,
    foundInContext: false,
    title: null,
    url: null,
  };
};
