import { MessageEmbed } from 'discord.js';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import { COLORS } from '../../util/constants';

export class PreviewCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['guildpreview', 'previewguild', 'pg', 'gp', 'preview guild', 'guild preview'],
      category: 'util',
      prefixes: ['gp!', 'pg!', '?', '!'],
      help: 'preview {guild_id}',
      description: 'Displays any public data available to the /preview/ endpoint. This is only for public guilds.',
      editable: true,
      enabled: true,
      reaction: '🚙'
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    if (!message.content.split(' ')[1]) {
      return message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'Mismatched arguments: missing `{guild_id}` parameter.'
        }
      });
    }

    const guild = message.content.split(' ')[1];

    try {
      const preview = await client.fetchGuildPreview(guild);

      const previewed = new MessageEmbed()
        .addField('Approximate Member Count', preview.approximateMemberCount)
        .addField('Approximate Presene Count (online members)', preview.approximatePresenceCount)
        .addField('Description', preview.description)
        .addField('Amount of Emotes', preview.emojis.size)
        .addField('Features', message.guild.features.map(f => `\`${f}\``).join('\n'))
        .addField('ID', preview.id)
        .addField('Name', preview.name)
        .setThumbnail(preview.iconURL())
        .setImage(preview.discoverySplashURL());

      await message.util.send(previewed);
    } catch {
      await message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: `The specified guild - ${guild} - is not valid or a public guild.`
        }
      });
    }
  }
}
