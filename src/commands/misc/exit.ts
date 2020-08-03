import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';

export class ExitCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'exit',
      aliases: ['end-process', 'end process', 'end'],
      prefixes: ['$', '?'],
      description: 'Exits the process (bot).',
      help: '?exit',
      category: 'misc',
      reaction: '❓'
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    if (message.author.id !== '575108662457139201') return;

    const exit = await message.channel.send('Exiting process...');

    await exit.edit('Shut down the process successfully.');

    process.exit(0);
  }
}
