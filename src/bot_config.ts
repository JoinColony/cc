import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { Answer, ask } from './ask.ts';

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

/* eslint-disable max-len */
const createAnswerText = (q: string, a: Answer) => {
  if (a.answer) {
    return `
❓ You asked: **${q}**

🇦 ${a.answer.trim()} ${a.url ? `\n\n📃 For more info check: ${a.url}` : ''}`;
  }
  return `
❓ You asked: **${q}**

🙅‍♀️ I'm really sorry, but I could not find any helpful information on that question.

📃 For more info you might want to search our docs: https://docs.colony.io/search/?q=${encodeURIComponent(
    q,
  )}`;
};
/* eslint-enable max-len */

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
      await interaction.deferReply();
      try {
        const answer = await ask(question);
        if (!answer) {
          return interaction.editReply(
            'Could not find an answer to your question',
          );
        }
        return interaction.editReply({
          content: createAnswerText(question, answer),
        });
      } catch (e) {
        /* eslint-disable max-len */
        console.error(e);
        return interaction.editReply(`
❓ You asked: **${question}**

🙅‍♀️ I'm really sorry, but something went terribly wrong. Feel free to report this issue`);
      }
      /* eslint-enable max-len */
    },
  },
};
