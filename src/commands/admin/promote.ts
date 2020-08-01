import PromoteAction from '../../actions/Promote';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import parseDate from '../../parsers/DateParser';
import { rgx } from '../../util/constants';

export class PromoteCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'promote',
      aliases: ['upgrade', 'advance', 'boost'],
      help: 'promote {member} {-lvl/--level=number} OR config { level: number, roles: [@role, role_id, ...], strip_roles: true/false/y/n}',
      description: 'Promotes the member to the specified level',
      reaction: '⚒️',
      category: 'admin',
      prefixes: ['p!', '?', '!'],
      editable: true,
      enabled: true,
      adminOnly: true,
      target: true,
      configurable: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }) {
    let { reason } = parseDate(message.content);
    reason = reason.replace(rgx, '');

    await new PromoteAction(client, {
      message,
      target,
      reason,
      action: 'promote',
      punishment: null
    }).commit();
  }
}
