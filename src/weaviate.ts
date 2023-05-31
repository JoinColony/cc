import weaviate from 'weaviate-ts-client';

const { OPENAI_API_KEY, WEAVIATE_HOST, WEAVIATE_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
  throw new Error('Need OPENAI_API_KEY');
}

if (!WEAVIATE_HOST) {
  throw new Error('Need WEAVIATE_HOST');
}

export const client = weaviate.client({
  scheme: 'https',
  host: WEAVIATE_HOST,
  headers: {
    Authorization: `Bearer ${WEAVIATE_API_KEY}`,
    'X-OpenAI-Api-Key': OPENAI_API_KEY,
  },
});
