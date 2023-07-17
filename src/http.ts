import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import handlebars from 'handlebars';

import { prisma } from './tx.js';

const PORT = 3000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const startServer = () => {
  const fastify = Fastify();

  const DIRNAME = fileURLToPath(new URL('.', import.meta.url));

  fastify.register(fastifyView, {
    engine: {
      handlebars,
    },
    root: resolvePath(DIRNAME, '..', 'frontend', 'templates'),
  });

  fastify.register(fastifyStatic, {
    root: resolvePath(DIRNAME, '..', 'dist', 'www'),
  });

  fastify.get<{ Params: { sessionId: string } }>(
    '/tx/:sessionId',
    async (request, reply) => {
      if (!request.params.sessionId.match(UUID_REGEX)) {
        return reply.send(400);
      }
      const session = await prisma.transaction.findUnique({
        where: {
          id: request.params.sessionId,
        },
      });
      if (!session) {
        // TODO: make 404 page
        return reply.send(404);
      }
      return reply.view('index.html', { session });
    },
  );

  fastify.delete<{ Params: { sessionId: string } }>(
    '/tx/:sessionId',
    async (request, reply) => {
      if (!request.params.sessionId.match(UUID_REGEX)) {
        return reply.send(400);
      }
      await prisma.transaction.delete({
        where: {
          id: request.params.sessionId,
        },
      });
      return reply.send(200);
    },
  );

  fastify.listen({ port: PORT }, (err) => {
    if (err) throw err;
    console.info(`HTTP server running in port ${PORT}`);
  });
};
