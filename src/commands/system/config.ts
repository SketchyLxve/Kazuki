import { stripIndents } from 'common-tags';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import { SystemChannel } from '../../models/actions/SystemChannels';
import { COLORS } from '../../util/constants';

export default class ConfigCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'config',
      aliases: ['cfg'],
      additionalArguments: ['insert', 'add', 'update', 'remove', 'delete', 'rm', '+', '-', '+-'],
      category: 'system',
      description: 'Configure a system channel for the guild. Replace existing ones, or instantiate new ones.',
      editable: true,
      help: '<keyword> {channel-type} [value]',
      permissions: {
        user: ['ADMINISTRATOR', 'MANAGE_GUILD']
      },
      reaction: '💻',
      prefixes: ['cfg!', '?', '$'],
      target: false
    });
  }

  public options = {
    'new': ['add', 'update', 'insert', '+', '-', '+-'],
    'remove': ['delete', 'remove', 'rm', '-']
  };

  public async run(client: NMLClient, message: NMLMessage) {
    const args = message.content.toLowerCase().split(' ');
    const channelID = message.content.match(/(?<=(<#)?)\d{17,18}(?=>?)/g)?.[0];

    const systemChannels = getRepository(SystemChannel);
    const systemChannel = await systemChannels.findOne({ name: args[2], guildID: message.guild.id });

    const optionNew = this.options.new.some(o => args[1] === o);
    const optionRemove = this.options.remove.some(o => args[1] === o);

    if (systemChannel?.name === args[2] && systemChannel?.channelID === channelID) {
      return message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: `<#${channelID}> is already a system channel for \`${args[2]}\`.`
        }
      });
    }

    if (optionNew && (args[2] && channelID)) {
      await systemChannels.save({
        guildID: message.guild.id,
        name: args[2],
        channelID
      });

      return message.channel.send(stripIndents`
      ${message.member}, successfully ${systemChannel ? 'updated' : 'inserted'} <#${channelID}> as the system channel for \`${args[2]}\`.
      `);
    }

    if (optionRemove && systemChannel) {
      await systemChannels.delete({ uuid: systemChannel.uuid });

      return message.channel.send(stripIndents`
      ${message.member}, successfully removed <#${systemChannel.channelID}> as the system channel for \`${args[2]}\`.
      `);
    }
  }
}
