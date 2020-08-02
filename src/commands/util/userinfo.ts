import { MessageEmbed } from 'discord.js';
import moment from 'moment';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import { parseSnowflake } from '../../parsers/SnowflakeParser';

export class UserinfoCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['ui', 'whois'],
      category: 'util',
      help: 'userinfo [member]',
      description: 'Displays information about the [specified] member, in detail.',
      prefixes: ['ui!', '$', '!'],
      editable: true,
      reaction: '🚙'
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    let [user] = await parseSnowflake(client, message.content);

    if (user.isError) {
      user = {
        isError: false,
        snowflake: message.author.id,
        desc: 'Nothing'
      };
    }

    const member = await message.guild.members.fetch(user.snowflake);

    const status = {
      dnd: 'Do not Disturb',
      idle: 'Idle',
      offline: 'Offline',
      online: 'Online'
    };

    const games = {
      PLAYING: 'Playing',
      STREAMING: 'Streaming',
      LISTENING: 'Listening to',
      WATCHING: 'Watching'
    };

    const userinfo = new MessageEmbed()
      .setTitle(`Information about ${member.user.tag}`)
      .addField('Account Created At', moment(member.user.createdTimestamp).format('LLL'))
      .addField('Member Joined Guild At', moment(member.joinedTimestamp).format('LLL'))
      .addField('ID', member.id)
      .addField('Username', member.user.username, true)
      .addField('#', member.user.discriminator, true)
      .addField('Tag', member.user.tag, true)
      .addField('Nitro Booster?', member.premiumSince ? `${moment(member.premiumSinceTimestamp).format('LLL')}` : 'No', true)
      .addField('Bot', member.user.bot ? 'This user is a bot' : 'This user is **not** a bot.', true)
      .addField('Status', status[member.user.presence.status], true)
      .addField(
        'Presence',
        member.user.presence.activities.filter(a => a.type !== 'CUSTOM_STATUS').length ? member.user.presence.activities.filter(activity => activity.type !== 'CUSTOM_STATUS').map(act => `**${games[act.type]}**: ${act.name}`) : 'This user has no activity status',
        true
      )
      .setThumbnail(
        member.user.presence.activities
          .filter(activity => activity.type !== 'CUSTOM_STATUS' && activity.name.toLowerCase() === 'spotify')
          .length
          ? `https://i.scdn.co/image/${member.user.presence.activities.find(activity => activity.type !== 'CUSTOM_STATUS' && activity.name.toLowerCase() === 'spotify').assets.largeImage.replace('spotify:', '')}`
          : member.user.displayAvatarURL({ dynamic: true })
      )
      .setFooter(client.user.tag, client.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    if (member.user.presence.activities.find(activity => activity.type !== 'CUSTOM_STATUS' && activity.name.toLowerCase() === 'spotify')) {
      userinfo.addField(
        'Spotify',
        member.user.presence.activities
          .filter(activity => activity.type !== 'CUSTOM_STATUS' && activity.name.toLowerCase() === 'spotify')
          .map(act => `**Song**: ${act.details} \n**Artist(s)**: ${act.state.replace(/;/g, ', ')} \n**Album**: ${act.assets.largeText}`)
      );
    }

    await message.util.send(userinfo);
  }
}
