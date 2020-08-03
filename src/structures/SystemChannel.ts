import { Guild, Snowflake, TextChannel } from 'discord.js';
import { getRepository } from 'typeorm';
import { SystemChannelDeleteError, SystemChannelDeleteSuccess, SystemChannelOptions } from '..//util/constants';
import { NMLClient } from '../core/structures/NMLClient';
import { SystemChannel as SystemChannelModel } from '../models/actions/SystemChannels';

export class SystemChannel {
  public category: string;
  public client!: NMLClient;
  public id: Snowflake;
  public name: string;
  public channelData?: TextChannel;

  public constructor(client: NMLClient, data: SystemChannelOptions) {
    this.category = data.category ?? null;

    this.client = client;

    this.id = data.id ?? null;

    this.name = data.name ?? null;

    this.channelData = data.data ?? null;
  }

  public get guild() { return this.channelData.guild ?? null; }

  public async update(channel: TextChannel): Promise<SystemChannel> {
    this.id = channel.id;

    this.channelData = (await this.client.channels.fetch(this.id)) as TextChannel;

    const scRepository = getRepository(SystemChannelModel);

    await scRepository.save({
      guildID: this.guild.id,
      channelID: this.id,
      name: this.name,
      category: this.category
    });

    return this;
  }

  public async delete(guild?: Guild): Promise<SystemChannelDeleteSuccess | SystemChannelDeleteError> {
    const scRepository = getRepository(SystemChannelModel);

    if (!guild && !this.guild) {
      return {
        isError: true,
        error: new Error('Guild instance not present: please provide one for the method.'),
        type: 'Missing Data'
      };
    } else if (!guild.id || !this.guild.id) {
      return {
        isError: true,
        error: new Error('Guild instance present; however cannot access the id property.'),
        type: 'Partial Data'
      };
    }


    const id = Boolean(guild) ? guild.id : this.guild.id;

    await scRepository.delete({ channelID: this.id, guildID: id });

    this.client.channels.system
      .delete(this.id);

    const systemChannel: SystemChannelDeleteSuccess = {
      data: this,
      isError: false
    };

    return systemChannel;
  }
}
