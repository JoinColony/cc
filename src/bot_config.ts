import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { encode } from 'gpt-3-encoder';

import { type Answer, ask } from './ask.js';
import { execute } from './execute.js';

const { DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_BOT_TOKEN) {
  throw new Error('Need DISCORD_BOT_TOKEN');
}

// Perms: 2147503168
export const config = {
  token: DISCORD_BOT_TOKEN,
  clientId: '1108521294212907038',
  guildId: '562263648173555742',
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

const createCommandReplyText = (cmd: string, r: string) => {
  return `
❓ Your command: **${cmd}**

🇦 ${r.trim()}`;
};

export const commands = {
  ask: {
    data: new SlashCommandBuilder()
      .setName('ask')
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
      if (encode(question).length > 30) {
        return interaction.reply(
          `Apologies, I only support questions with a maximum size of 30 tokens (which are roughly 23 words)`,
        );
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
        if ((e as any).response?.data?.error) {
          console.error((e as any).response.data.error);
        } else {
          console.error(e);
        }
        /* eslint-disable max-len */
        return interaction.editReply(`
❓ You asked: **${question}**

🙅‍♀️ I'm really sorry, but something went terribly wrong. Feel free to report this issue`);
      }
      /* eslint-enable max-len */
    },
  },
  call: {
    data: new SlashCommandBuilder()
      .setName('call')
      .setDescription(
        `Calls a function on chain. Can answer questions about Colonies and users or generate transactions`,
      )
      .addStringOption((option) =>
        option
          .setName('command')
          .setDescription('Your command')
          .setRequired(true),
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const command = interaction.options.getString('command');
      if (!command) {
        return interaction.reply('No command provided.');
      }
      if (encode(command).length > 200) {
        return interaction.reply(
          `Apologies, I only support questions with a maximum size of 200 tokens (which are roughly 150 words)`,
        );
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        const reply = await execute(command);
        if (!reply) {
          return interaction.editReply(
            'Could not find an appropriate reply to your command',
          );
        }
        return interaction.editReply({
          content: createCommandReplyText(command, reply),
        });
      } catch (e) {
        if ((e as any).response?.data?.error) {
          console.error((e as any).response.data.error);
        } else {
          console.error(e);
        }
        /* eslint-disable max-len */
        return interaction.editReply(`
❓ Your command: **${command}**

🙅‍♀️ I'm really sorry, but something went terribly wrong. Feel free to report this issue`);
      }
      /* eslint-enable max-len */
    },
  },
};
