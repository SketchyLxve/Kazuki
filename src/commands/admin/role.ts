import { GuildMember, Role } from 'discord.js';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import { COLORS } from '../../util/constants';

interface ExtractData {
  err: {
    is: boolean;
    description: string | null;
  };
  target: GuildMember | null;
  role: Role | null;
}
export default class RoleCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['addrole', 'role+', 'role add', 'add role'],
      description: 'Adds the specified role to the specified member.',
      help: 'role {member} {role/role_name}',
      category: 'admin',
      reaction: '⚒️',
      prefixes: ['r!', '$', '?'],
      editable: true,
      enabled: true,
      adminOnly: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    const { err, target, role } = await this.extract(message);

    if (err.is) {
      return message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: err.description
        }
      });
    }

    try {
      const has = target.roles.cache.has(role.id);

      await target.roles[!has ? 'add' : 'remove'](role);

      return message.channel.send({
        embed: {
          color: COLORS.SUCCESS,
          description: `Successfully ${has ? 'removed' : 'added'} ${role} ${has ? 'from' : 'to'} ${target}`
        }
      });
    } catch {}
  }

  protected async extract(msg: NMLMessage) {
    const alias = this.aliases.find(a => msg.content.toLowerCase().startsWith(a));
    const match = new RegExp(`(?<=${alias} )([a-zA-Z]+|[0-9]{17,18})`, 'gm');
    const replace = new RegExp(`${alias} ([a-zA-Z]+|<@!?[0-9]{17,18}>|[0-9]{17,18}) `, 'gm');

    const targetSign = msg.mentions.members.first()?.id || msg.content.match(match)?.[0].toLowerCase();
    const roleSign = msg.mentions.roles.first()?.id || msg.content.replace(replace, '').toLowerCase();

    const members = await msg.guild.members.fetch();
    const target = members.get(targetSign) || members.find(m => m.displayName.toLowerCase() === targetSign || m.user.tag.toLowerCase().includes(targetSign));
    const role = msg.guild.roles.cache.get(roleSign) || msg.guild.roles.cache.find(r => r.name.toLowerCase() === roleSign);

    if (!target || !role) {
      const e: ExtractData = {
        err: {
          is: true,
          description: `You must provide the \`${target ? 'role' : 'target'}\` parameter.`
        },
        target: null,
        role: null
      };

      return e;
    }

    const res: ExtractData = {
      err: {
        is: false,
        description: null
      },
      target,
      role
    };

    return res;
  }
}
