import { client as weaviate } from './weaviate.ts';

export const ask = async (q: string) => {
  const res = await weaviate.graphql
    .get()
    .withClassName('Doc')
    // .withFields('title content')
    .withFields(
      `title url _additional { answer { hasAnswer property result startPosition endPosition } distance }`,
    )
    .withAsk({
      question: q,
      properties: ['content'],
    })
    .withLimit(1)
    .do();
  if (res?.data?.Get?.Doc && res.data.Get.Doc[0]) {
    const {
      _additional: {
        answer: { result },
      },
      url,
    } = res.data.Get.Doc[0];
    return `${result.trim()}
For more info check: ${url}`;
  }
  return null;
};
