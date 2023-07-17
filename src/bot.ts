import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import {
  Events,
  Client,
  ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';
import Fastify from 'fastify';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import handlebars from 'handlebars';

import { config, commands } from './bot_config.js';
import { prisma } from './tx.js';

const DIRNAME = fileURLToPath(new URL('.', import.meta.url));

const client = new Client({ intents: [] });

client.on('ready', async () => {
  if (!client.user || !client.application) {
    return;
  }

  console.info(`${client.user.username} is online`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await handleSlashCommand(client, interaction);
  } catch (e) {
    console.error(e);
  }
});

const handleSlashCommand = async (
  _c: Client,
  interaction: ChatInputCommandInteraction,
) => {
  const slashCommand =
    commands[interaction.commandName as keyof typeof commands];
  if (!slashCommand) {
    return interaction.reply({
      content: 'I have no idea how to handle this command',
    });
  }

  return slashCommand.execute(interaction);
};

client.login(config.token);

const fastify = Fastify();

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
    if (
      !request.params.sessionId.match(
        // eslint-disable-next-line max-len
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    ) {
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

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err;
});
