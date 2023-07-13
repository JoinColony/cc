import { execute } from './execute.js';

const [, , cmd] = process.argv;

(async () => {
  console.info(cmd);
  const answer = await execute(cmd);
  console.info(answer);
})();
