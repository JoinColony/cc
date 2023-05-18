import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { ask } from './ask.ts';

const { DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_BOT_TOKEN) {
  throw new Error('Need DISCORD_BOT_TOKEN');
}

// Perms: 2147503168
export const config = {
  token: DISCORD_BOT_TOKEN,
  clientId: '1108521294212907038',
  guildId: '1073185825484967967',
};

export const commands = {
  q: {
    data: new SlashCommandBuilder()
      .setName('q')
      .setDescription('Ask me anything. As long as it is about Colony')
      .addStringOption((option) =>
        option
          .setName('question')
          .setDescription('Your question')
          .setRequired(true),
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const question = interaction.options.getString('question');
      if (!question) {
        return interaction.reply('No question asked.');
      }
      await interaction.deferReply({ ephemeral: true });
      const reply = await ask(question);
      if (!reply) {
        return interaction.editReply(
          'Could not find an answer to your question',
        );
      }
      return interaction.editReply({
        content: reply,
      });
    },
  },
};
