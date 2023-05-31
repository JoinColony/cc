import {
  dirname,
  resolve as resolvePath,
  relative as relativePath,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

import { type MarkdownDescriptor, readMarkdown } from './markdown.js';
import { client as weaviate } from './weaviate.js';

const FILENAME = fileURLToPath(import.meta.url);
const DIRNAME = dirname(FILENAME);

export type DataType = 'Doc' | 'Code';

export interface DocsDescriptor {
  id: string;
  dataType: DataType;
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
    dataType: 'Doc',
    basePath: resolvePath(DIRNAME, '..', 'vendor', 'docs', 'colony'),
    getUrl: (basePath, filePath) =>
      `https://docs.colony.io/${relativePath(basePath, filePath)}`
        .replace(/index\.md$/, '')
        .replace(/\.md$/, ''),
  },
  {
    id: 'whitepaper',
    dataType: 'Doc',
    basePath: resolvePath(DIRNAME, '..', 'vendor', 'whitepaper'),
    getUrl: () => `https://colony.io/whitepaper.pdf`,
  },
  // {
  //   id: 'sdk',
  //   dataType: 'Code',
  //   basePath: resolvePath(
  //     DIRNAME,
  //     '..',
  //     'vendor',
  //     'colonyJS',
  //     'packages',
  //     'sdk',
  //     'docs',
  //     'api',
  //   ),
  //   getUrl: (basePath, filePath) =>
  //     `https://docs.colony.io/colonysdk/api/${relativePath(basePath, filePath)}`
  //       .replace(/index\.md$/, '')
  //       .replace(/\.md$/, ''),
  // },
];

const getMarkdownDescriptors = (): MarkdownDescriptor[] => {
  return docs.flatMap(({ basePath, getUrl, dataType }) => {
    return fg
      .sync(`${basePath}/**/*.md`)
      .map((fileName) => readMarkdown(basePath, fileName, getUrl, dataType));
  });
};

const start = async () => {
  // await weaviate.schema.classDeleter().withClassName('Doc').do();
  await weaviate.schema.classCreator().withClass(articleSchema).do();

  const mds = getMarkdownDescriptors();

  let batcher = weaviate.batch.objectsBatcher();

  mds.forEach(({ contents, dataType, title, url }) => {
    contents.forEach((content) => {
      batcher = batcher.withObject({
        class: dataType,
        properties: { title, content, url },
      });
    });
  });

  const result = await batcher.do();

  console.info(result[0].result);
};

start();
