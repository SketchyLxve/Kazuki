import { stripIndent } from 'common-tags';
import { Collection, MessageEmbed, PermissionOverwrites, TextChannel } from 'discord.js';
import { promisify } from 'util';
import { ChannelData, UserActionType } from '../util/UserActionData';
import UserAction from './UserAction';

interface OptionalNewData {
  name: string;
  id: string;
  permissions: Collection<string, PermissionOverwrites>;
}

export default class ChannelModificationAction extends UserAction {
  protected action: 'Channel Delete' | 'Channel Update' | 'Channel Create';
  protected channelID: string;
  protected channelName: string;
  protected guildID: string;
  protected guildName: string;
  protected permissions: Collection<string, PermissionOverwrites>;
  protected newID?: string;
  protected newName?: string;
  protected newPermissions?: Collection<string, PermissionOverwrites>;
  private readonly wait = promisify(setTimeout);

  public constructor(
    action: UserActionType,
    data: ChannelData,
    optional?: OptionalNewData
  ) {
    super({ ...data, action });
    this.channelID = data.id;
    this.channelName = data.name;
    this.guildID = data.guildID;
    this.guildName = data.guildName;
    this.permissions = data.permissions ?? new Collection();
    if (optional) {
      this.newID = optional.id ?? '';
      this.newName = optional.name ?? '';
      this.newPermissions = optional.permissions ?? new Collection();
    }
  }

  public async change(logChannel: TextChannel) {
    await this.wait(5500);
    const guild = this.client.guilds.cache.get(this.guildID);
    const logs = await guild.fetchAuditLogs();
    const entry = logs.entries.first();

    if (entry.target?.['id'] !== this.channelID) return; // eslint-disable-line

    const embed = new MessageEmbed()
      .setColor(this.color)
      .addField('Channel', `<#${this.newID}>`)
      .addField('Guild', this.guildName)
      .setTimestamp();

    await guild.members.fetch();

    if (this.channelName !== this.newName) {
      embed.addField('Name', stripIndent`
      Before: ${this.channelName}
      After: ${this.newName}`, true);
    }

    const _channel = guild.channels.cache.get(this.channelID);
    const _new = guild.channels.cache.get(this.newID);
    if (_channel.parentID !== _new.parentID) {
      embed.addField('Parent', stripIndent`
      Before: ${_channel.parent.name}
      After: ${_new.parent.name}`, true);
    }

    if (!this.newPermissions.difference(this.permissions).size && JSON.stringify(this.newPermissions) !== JSON.stringify(this.permissions)) {
      const mapped = this.newPermissions.filter(a =>
        !this.permissions.some(e => e.deny.bitfield === a.deny.bitfield || e.allow.bitfield === a.allow.bitfield))
        .map(o => stripIndent`
        Target: ${guild.roles.cache.get(o.id) || guild.members.cache.get(o.id)}
        ${o.allow.toArray().length ? `Allowed: ${o.allow.toArray().map(a => `\`${a}\``).join(', ')}` : ''}
        ${o.deny.toArray().length ? `Denied ${o.deny.toArray().map(d => `\`${d}\``)}` : ''}`)
        .join('\n\n');

      embed.addField('Updated Overwrites', mapped);
    }

    if (this.newPermissions.difference(this.permissions).size) {
      const mapped = this.newPermissions
        .difference(this.permissions)
        .map(o => stripIndent`
          Target: ${guild.roles.cache.get(o.id) || guild.members.cache.get(o.id)}
          ${o.allow.toArray().length ? `Allowed: ${o.allow.toArray().map(a => `\`${a}\``).join(', ')}` : ''}
          ${o.deny.toArray().length ? `Denied: ${o.deny.toArray().map(d => `\`${d}\``).join(', ')}` : ''}
        `)
        .join('\n\n');

      embed.addField('Added and/or Removed overwrites', mapped);
    }

    if (!entry || !entry.executor) return;

    embed.setFooter(`Executor: ${entry.executor.tag}`, entry.executor.displayAvatarURL({ dynamic: true }));

    await logChannel.send(embed);
  }

  public async log(channel: TextChannel) {
    await this.wait(5500);
    const guild = this.client.guilds.cache.get(this.guildID);
    const logs = await guild.fetchAuditLogs();
    const entry = logs.entries.first();

    if (entry.target?.['id'] !== this.channelID) return; // eslint-disable-line

    const embed = new MessageEmbed()
      .setColor(this.color)
      .addField('Channel', `<#${this.channelID}>`)
      .addField('ID', this.channelID)
      .addField('Guild', this.guildName)
      .setTimestamp();

    if (entry?.executor) embed.addField('Executor', entry.executor.tag);

    return channel.send(embed);
  }
}
