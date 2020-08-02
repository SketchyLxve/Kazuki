import { GuildMember } from 'discord.js';
import BlacklistAction from '../../actions/Blacklist';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';

export default class BlacklistCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['forbid', 'bl'],
      description: 'Blacklist members from your server, specific commands, or the bot overall if you are one of the owners (of the bot).',
      help: 'blacklist {member} [global?/commands?]',
      category: 'admin',
      reaction: '⚒️',
      enabled: true,
      editable: false,
      target: true,
      prefixes: ['$', 'b!'],
      adminOnly: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }: { target: GuildMember }) {
    const isMention = message.mentions.has(target);
    const reason = message.content.split(' ').slice(1).join(' ')
      .replace(isMention ? new RegExp(`<@!?${target.id}>`, 'g') : target.id, '')
      .replace(/-{1,2}(g(lobal)?|only|limit|local|restrict|full|all|deny)/g, '')
      .replace(/\[.*\]/g, '');

    await new BlacklistAction(client, {
      message,
      target,
      reason,
      action: 'blacklist',
      punishment: 'NORMAL'
    }).commit();
  }
}
