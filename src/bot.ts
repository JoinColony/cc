import {
  Events,
  Client,
  ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';

import Fastify from 'fastify';

import { config, commands } from './bot_config.js';
import { prisma } from './tx.js';

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

fastify.get<{ Params: { sessionId: string } }>(
  '/:sessionId',
  async (request, reply) => {
    if (
      !request.params.sessionId.match(
        // eslint-disable-next-line max-len
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
    ) {
      return reply.send(400);
    }
    const session = prisma.transaction.findUnique({
      where: {
        id: request.params.sessionId,
      },
    });
    return reply.code(200).send(session);
  },
);
