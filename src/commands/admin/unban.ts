import UnbanAction from '../../actions/Unban';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';

export class UnbanCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'unban',
      aliases: ['remove ban'],
      category: 'admin',
      help: 'unban <user_id>',
      description: 'Unbans the specified user from the guild if they are banned.',
      enabled: true,
      editable: true,
      prefixes: ['u!', '$'],
      permissions: {
        user: ['BAN_MEMBERS'],
        client: ['BAN_MEMBERS']
      },
      reaction: '⚒️',
      configurable: false,
      target: false
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    await new UnbanAction(client, {
      message,
      action: 'unban',
      punishment: 'NORMAL',
      target: null
    }).commit();
  }
}
