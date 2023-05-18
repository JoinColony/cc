import {
  Events,
  Client,
  Interaction,
  ChatInputCommandInteraction,
} from 'discord.js';

import { config, commands } from './bot_config.ts';

const client = new Client({ intents: [] });

client.on('ready', async () => {
  if (!client.user || !client.application) {
    return;
  }

  console.info(`${client.user.username} is online`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await handleSlashCommand(client, interaction);
});

const handleSlashCommand = async (
  _c: Client,
  interaction: ChatInputCommandInteraction,
) => {
  const slashCommand =
    commands[interaction.commandName as keyof typeof commands];
  if (!slashCommand) {
    interaction.reply({ content: 'I have no idea how to handle this command' });
    return;
  }

  slashCommand.execute(interaction);
};

client.login(config.token);
