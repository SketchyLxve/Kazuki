import MuteAction from '../../actions/Mute';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import parseDate from '../../parsers/DateParser';

export default class Mute extends BaseCommand {
  public constructor() {
    super({
      aliases: ['tempmute', 'surpress'],
      description: 'Mutes the specified member and revokes all their permissions.',
      category: 'mod',
      help: 'mute <member> [reason?] [--time=\'\'/-t=\'\'?] [--hard/-h?] [--link=\'\'/-l=\'\'?]',
      enabled: true,
      prefixes: ['!', 'a!', '$'],
      permissions: {
        user: ['MANAGE_MESSAGES'],
        client: ['MANAGE_ROLES']
      },
      reaction: '🛡️',
      target: true,
      configurable: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }) {
    const noEmotes = message.content.replace(/<(a)?:(\w{2,32}):(\d{17,19})>/g, '');
    const { total = 60000, reason } = parseDate(noEmotes);

    await new MuteAction(client, {
      message,
      reason,
      target,
      action: 'mute',
      duration: total,
      punishment: 'MUTE'
    }).commit();
  }
}
