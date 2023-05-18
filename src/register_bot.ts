import { REST, Routes } from 'discord.js';

import { config, commands } from './bot_config.ts';

const rest = new REST().setToken(config.token);

const commandsToRegister = Object.values(commands).map((command) =>
  command.data.toJSON(),
);

(async () => {
  try {
    console.info(
      `Started refreshing ${commandsToRegister.length} application (/) commands.`,
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commandsToRegister },
    );

    console.info(
      `Successfully reloaded ${
        (data as unknown[]).length
      } application (/) commands.`,
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
