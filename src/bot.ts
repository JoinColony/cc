import {
  Events,
  Client,
  ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';

import { config, commands } from './bot_config.js';

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
