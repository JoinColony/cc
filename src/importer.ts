import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMarkdown } from './parse-markdown.ts';
import { client as weaviate } from './weaviate.ts';

const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(FILENAME);

const articleSchema = {
  class: 'Article',
  description: 'A collection of articles',
  vectorizer: 'text2vec-openai',
  moduleConfig: {
    'text2vec-openai': {
      model: 'ada',
      modelVersion: '002',
      type: 'text',
    },
    'qna-openai': {
      model: 'text-davinci-003',
      maxTokens: 128,
      temperature: 0.0,
      topP: 1,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
    },
  },
  properties: [
    {
      name: 'title',
      description: 'Title of the article',
      dataType: ['string'],
    },
    {
      name: 'content',
      description: 'Contents of the article',
      dataType: ['text'],
    },
    {
      name: 'url',
      description: 'URL to the article',
      dataType: ['string'],
      moduleConfig: {
        'text2vec-openai': {
          skip: true,
        },
      },
    },
  ],
};

const markdown = readFileSync(
  resolvePath(DIRNAME, '..', 'docs', 'Colony.md'),
).toString();

const start = async () => {
  await weaviate.schema.classDeleter().withClassName('Article').do();
  await weaviate.schema.classCreator().withClass(articleSchema).do();
  const { title, contents } = parseMarkdown(markdown);

  console.log(`Importing ${title} with ${contents.length} chunks...`);

  let batcher = weaviate.batch.objectsBatcher();

  contents.forEach((text, idx) => {
    batcher = batcher.withObject({
      class: 'Article',
      properties: { title, content: text },
    });
  });

  const result = await batcher.do();

  console.log(result[0].result);
};

start();
