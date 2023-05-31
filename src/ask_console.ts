import { ask } from './ask.js';

const [, , q] = process.argv;

(async () => {
  const answer = await ask(q);
  console.info(answer.answer);
})();
