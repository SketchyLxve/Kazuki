import BanAction from '../../actions/Ban';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import parseDate from '../../parsers/DateParser';
import { allMentions } from '../../util/constants';

export class Ban extends BaseCommand {
  public constructor() {
    super({
      name: 'ban',
      aliases: ['softban', 'tempban'],
      category: 'admin',
      description: 'Bans the specified member',
      help: 'ban <@member/user_id> [reason?] [--soft/-s?] [--temp=\'time\'/-t=\'time\'?]',
      enabled: true,
      editable: false,
      permissions: {
        user: ['BAN_MEMBERS'],
        client: ['BAN_MEMBERS']
      },
      prefixes: ['$'],
      reaction: '⚒️',
      target: true,
      configurable: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }) {
    const mentionLess = message.content.replace(allMentions, '');
    const { total, reason } = parseDate(mentionLess);
    const option = ['temp', 'soft'].some(b => message.content.toLowerCase().includes(b))
      ? message.content.toLowerCase().includes('temp')
        ? 'TEMP'
        : 'SOFT'
      : 'NORMAL';

    await new BanAction(client, {
      message,
      reason,
      target,
      action: 'ban',
      duration: total,
      punishment: option
    }).commit();
  }
}
