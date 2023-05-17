import { client as weaviate } from './weaviate.ts';

export const ask = async () => {
  const res = await weaviate.graphql
    .get()
    .withClassName('Article')
    // .withFields('title content')
    .withFields(
      `title content _additional { answer { hasAnswer property result startPosition endPosition } distance }`,
    )
    .withAsk({
      question: 'What is allowedToTransfer?',
      properties: ['content'],
    })
    .withLimit(1)
    .do();
  console.log(res.data.Get.Article[0]);
  // console.log(res.data.Get.Article[0]);
};
