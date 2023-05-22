import { client as weaviate } from './weaviate.ts';

export const ask = async (q: string) => {
  const res = await weaviate.graphql
    .get()
    .withClassName('Doc')
    .withFields('title content url')
    .withNearText({ concepts: [q] })
    .withGenerate({
      // eslint-disable-next-line max-len
      singlePrompt: `You are a helpful assistant with knowledge around the Colony DAO ecosystem. The following prompt is two-fold: there will be the actual prompt (which will be surrounded by three pairs of curly braces) and then context (which will be surrounded by three pairs of angled brackets) provided to help you process the prompt. Process the following prompt with the given context. In your answer, do not mention that there was a context given. If you can't answer the question based on the context, answer it without referring to the context.

Prompt: {{{ ${q} }}}

Context: <<< {content} >>>`,
    })
    .withLimit(1)
    .do();
  if (res?.data?.Get?.Doc && res.data.Get.Doc[0]) {
    const {
      _additional: {
        generate: { singleResult: result },
      },
      url,
    } = res.data.Get.Doc[0];
    return `
❓ You asked: **${q}**

🇦 **${result.trim()}**

📃 For more info check: ${url}`;
  }
  return null;
};
