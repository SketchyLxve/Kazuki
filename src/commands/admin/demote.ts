import DemoteAction from '../../actions/Demote';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import parseDate from '../../parsers/DateParser';

export class DemoteCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'demote',
      aliases: ['declass', 'downgrade', 'dethrone', 'cashier'],
      help: 'demote {member} [reason?] OR demote config insert/remove {role, role2}',
      description: 'Demotes the specified member (removes all specified roles, supposedly that correspond to moderation power)',
      prefixes: ['d!', '?', '!'],
      editable: true,
      enabled: true,
      category: 'admin',
      reaction: '⚒️',
      adminOnly: true,
      target: true,
      configurable: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }) {
    const { reason } = parseDate(message.content, 'normal');

    await new DemoteAction(client, {
      message,
      target,
      reason,
      action: 'full demote',
      punishment: 'FULL',
      role: null
    }).commit();
  }
}
