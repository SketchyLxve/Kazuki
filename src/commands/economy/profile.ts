import { MessageEmbed } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import { Activity } from '../../models/economy/TextActivity';
import { VCActivity } from '../../models/economy/VCActivity';
import { XP } from '../../models/economy/XP';
import { parseSnowflake } from '../../parsers/SnowflakeParser';
import { COLORS } from '../../util/constants';

export class ProfileCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'profile',
      aliases: ['xp', 'rank'],
      category: 'economy',
      description: 'Preview the economy profile of a specified member.',
      help: 'profile [member]',
      enabled: true,
      editable: true,
      prefixes: ['e!', '$'],
      reaction: '💵'
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    const xpRepository = getRepository(XP);
    const vcRepository = getRepository(VCActivity);
    const textRepository = getRepository(Activity);

    try {
      const snowflakes = (await parseSnowflake(message.client as NMLClient, message.content));
      const member = message.content.split(' ').slice(1).length
        ? (await message.guild.members.fetch(snowflakes[0].snowflake))
        : message.member;
      const data = await xpRepository.findOne({ guildID: message.guild.id, memberID: member.id });
      const vc = await vcRepository.findOne({ guildID: message.guild.id, memberID: member.id });
      const text = await textRepository.findOne({ guildID: message.guild.id, memberID: member.id });

      if (!data) {
        return message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'The specified member is not a part of my database yet.'
          }
        });
      }

      const profile = new MessageEmbed()
        .setColor(member.displayColor)
        .setDescription(`Economy status for ${member}`)
        .addField('XP', data?.xp ?? 0)
        .addField('Level', data?.level ?? 0)
        .addField('VC Activity Level', vc?.activityLevel ?? 0)
        .addField('Current VC Hours', vc?.currentHours ?? 0)
        .addField('All VC Hours (Excluding current VC hours)', vc?.allHours ?? 0)
        .addField('Text Activity Level', text?.activityLevel ?? 0)
        .addField('Current Message Count', text?.currentMessages ?? 0)
        .addField('All Messages (Excluding current message count)', text?.allMessages ?? 0)
        .setFooter(message.guild.name);

      await message.util.send(profile);
    } catch (e) {
      await message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: `An error occurred whilst running the command. We apologize for the inconvenience. Please try again. \n\nIf this error keeps occurring, please contact one of the administrators. \n\nError message: ${e.message}`
        }
      });

      console.error('Failed to run the profile command. Stack trace: \n', e);
    }
  }
}
