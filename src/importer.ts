import {
  dirname,
  resolve as resolvePath,
  relative as relativePath,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

import { MarkdownDescriptor, readMarkdown } from './markdown.ts';
import { client as weaviate } from './weaviate.ts';

const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(FILENAME);

export interface DocsDescriptor {
  id: string;
  basePath: string;
  getUrl: (basePath: string, filePath: string) => string;
}

const articleSchema = {
  class: 'Doc',
  description: 'Colony documentation',
  vectorizer: 'text2vec-openai',
  moduleConfig: {
    'text2vec-openai': {
      model: 'ada',
      modelVersion: '002',
      type: 'text',
    },
    'qna-openai': {
      model: 'text-davinci-003',
      maxTokens: 256,
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

const docs: DocsDescriptor[] = [
  {
    id: 'docs',
    basePath: resolvePath(DIRNAME, '..', 'vendor', 'docs', 'colony'),
    getUrl: (basePath, filePath) =>
      `https://docs.colony.io/${relativePath(basePath, filePath)}`
        .replace(/index\.md$/, '')
        .replace(/\.md$/, ''),
  },
  {
    id: 'sdk',
    basePath: resolvePath(
      DIRNAME,
      '..',
      'vendor',
      'colonyJS',
      'packages',
      'sdk',
      'docs',
    ),
    getUrl: (basePath, filePath) =>
      `https://docs.colony.io/colonysdk/${relativePath(basePath, filePath)}`
        .replace(/index\.md$/, '')
        .replace(/\.md$/, ''),
  },
];

const getMarkdownDescriptors = (): MarkdownDescriptor[] => {
  return docs.flatMap(({ basePath, getUrl }) => {
    return fg
      .sync(`${basePath}/**/*.md`)
      .map((fileName) => readMarkdown(basePath, fileName, getUrl));
  });
};

const start = async () => {
  // await weaviate.schema.classDeleter().withClassName('Article').do();
  await weaviate.schema.classCreator().withClass(articleSchema).do();

  const mds = getMarkdownDescriptors();

  let batcher = weaviate.batch.objectsBatcher();

  mds.forEach(({ url, contents, title }) => {
    contents.forEach((content) => {
      batcher = batcher.withObject({
        class: 'Doc',
        properties: { title, content, url },
      });
    });
  });

  const result = await batcher.do();

  console.info(result[0].result);
};

start();
