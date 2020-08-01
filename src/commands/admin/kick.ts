import KickAction from '../../actions/Kick';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import parseDate from '../../parsers/DateParser';

export default class KickCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['prune'],
      category: 'admin',
      description: 'Kicks the specified member from the guild if possible.',
      help: '{member} [reason]',
      prefixes: ['$', 'k!'],
      reaction: '⚒️',
      permissions: {
        user: ['KICK_MEMBERS'],
        client: ['KICK_MEMBERS']
      },
      target: true,
      configurable: false
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }) {
    if (!target) return;

    const { reason } = parseDate(message.content, 'normal');

    await new KickAction(client, {
      message,
      reason,
      target,
      punishment: 'KICK',
      action: 'kick'
    }).commit();
  }
}
