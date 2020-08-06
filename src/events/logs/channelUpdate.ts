import { GuildChannel, TextChannel } from 'discord.js';
import { getRepository } from 'typeorm';
import { BaseEvent } from '../../core/structures/BaseEvent';
import { SystemChannel } from '../../models/actions/SystemChannels';
import ChannelModificationAction from '../../user-actions/ChannelModification';
import { USER_ACTIONS } from '../../util/constants';

export default class ChannelUpdateEvent extends BaseEvent {
  public constructor() {
    super({
      event: 'channelUpdate',
      type: 'on'
    });
  }

  public async exec(client, o: GuildChannel, n: GuildChannel) {
    const system = getRepository(SystemChannel);
    const systemChannel = await system.findOne({ guildID: n.guild.id, name: 'action-logs' });

    const logChannel = n.guild.channels.cache.get(systemChannel?.channelID) as TextChannel;

    if (!logChannel) return;

    await new ChannelModificationAction(USER_ACTIONS.CHANNEL_MODIFY, {
      id: o.id,
      name: o.name,
      guildID: o.guild.id,
      guildName: o.guild.name,
      permissions: o.permissionOverwrites
    }, {
      name: n.name,
      id: n.id,
      permissions: n.permissionOverwrites
    }).change(logChannel);
  }
}
