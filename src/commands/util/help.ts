import { stripIndent } from 'common-tags';
import { MessageEmbed } from 'discord.js';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import { PaginationHandler } from '../../handlers/PaginationHandler';
import { CategoryData, COLORS } from '../../util/constants';

export class HelpCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['commands'],
      prefixes: ['h!', '$', '!', 'c!'],
      category: 'util',
      help: 'help [command]',
      description: 'Sends a rich embed about [the specified] command(s)',
      editable: true,
      reaction: '🚙'
    });
  }

  public readonly descriptions = {
    admin: 'Administration commands allowing you to modify / change data revolving around a guild or to punish members.',
    mod: 'Moderation commands allowing you to strike, mute, and provide punishments for members who break your guild\'s rules.',
    misc: 'Miscellanous commands that provide short-term entertainment or interest.',
    eco: 'Economy commands allowing you to see / modify data revolving around economy.',
    util: 'Utility commands that help provide more information about something, or simply to ease a member\'s life.',
    system: 'System commands allowing you to modify the channel-type (action-logs, mod-logs, ect) of your guild.',
    get economy() {
      return this.eco;
    }
  };

  public readonly full = {
    admin: 'Administration',
    mod: 'Moderation',
    misc: 'Miscellanous',
    eco: 'Economy',
    util: 'Utility',
    system: 'System',
    get economy() {
      return this.eco;
    }
  };

  public async run(client: NMLClient, message: NMLMessage) {
    const arg = message.content.split(' ').slice(1);

    if (arg.length) {
      const command =
        client.commands
          .find(
            cmd => cmd.aliases.includes(arg[0].toLowerCase())
          );

      if (!command) {
        return message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'Unable to retrieve the specified command. \nEither you\'ve made a typo, or the command doesn\'t exist.'
          }
        });
      }


      const aliases =
        command.aliases
          .filter(a => a !== command.name.toLowerCase());

      return message.util.send({
        embed: {
          color: COLORS.SUCCESS,
          description: stripIndent`
          **Command**: \`${command.name.toLowerCase()}\` 
          \n**Aliases**: ${aliases.map(a => `\`${a}\``).join(', ') ?? 'no aliases'} ${command.additionalArguments?.length ? `\n\nAdditional arguments: ${command.additionalArguments.map(g => `\`${g}\``).join(', ')}` : ''}
          \n${this.full[command.category] ? `**Category**: \`${this.full[command.category]}\`` : 'Category not specified.'}
          \n${command.help ? `**Help**: \`${command.help}\`` : 'Usage not provided for this command.'}
          \n${command.description?.length ? `**Description**: \`${command.description}\`` : 'Description not provided for this command'}
          \n**Admin Only**: ${command.adminOnly ? 'Yes' : 'No'}
          \n**Owner Only**: ${command.ownerOnly ? 'Yes' : 'No'}
          \n**Prefixes**: ${command.prefixes.map(p => `\`${p}\``).join(', ')}
          \n**Reaction**: ${command.reaction ?? 'Reaction not specified'} 
          \n${command.roles?.length ? `**Required Roles**: ${command.roles.map((r: string) => `\`${message.guild.roles.cache.get(r).name}\``).join(', ')}` : ''}
          `
        }
      });
    }


    const data: CategoryData<BaseCommand>[] = [];

    const msg = (await message.channel.send('Here at your service.')) as NMLMessage;

    for (const [, command] of client.commands) {
      if (data.find(d => d.name === command.category)) continue;

      data.push({
        description: this.descriptions[command.category],
        name: command.category,
        reaction: command.reaction,
        data: client.commands.filter(c => c.category === command.category).array()
      });
    }

    const handler = new PaginationHandler<BaseCommand>(
      msg,
      new MessageEmbed(),
      5,
      data,
      (embed, data) => {
        for (const d of data) {
          embed.addField(
            d.name.toUpperCase()[0] + d.name.toLowerCase().slice(1),
            `Help: \`${d.help ?? 'No usage specified.'}\` \nDescription: \`${d.description?.length ? d.description : 'No description specified.'}\` \nPrefixes: ${d.prefixes.map(p => `\`${p}\``).join(', ')}`
          );
        }

        return embed;
      }
    );

    await handler.start(message.author);
  }
}
