import UnmuteAction from '../../actions/Unmute';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import parseDate from '../../parsers/DateParser';

export class UnmuteCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['removemute', 'rm'],
      category: 'mod',
      description: 'Unmutes the specified member if they are muted.',
      help: 'unmute <member>',
      prefixes: ['m!', '$'],
      reaction: '🛡️',
      permissions: {
        user: ['MANAGE_MESSAGES']
      },
      target: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }) {
    const { reason } = await parseDate(message.content);

    await new UnmuteAction(client, {
      message,
      target,
      reason,
      action: 'unmute',
      punishment: null
    }).commit();
  }
}
