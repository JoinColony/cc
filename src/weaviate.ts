import weaviate from 'weaviate-ts-client';

const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
  throw new Error('Need OPENAI_API_KEY');
}

export const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
  headers: { 'X-OpenAI-Api-Key': OPENAI_API_KEY },
});
