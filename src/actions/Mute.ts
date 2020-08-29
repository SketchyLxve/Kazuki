import { stripIndent } from 'common-tags';
import { GuildMember, MessageEmbed, User } from 'discord.js';
import ms from 'ms';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { MuteConfiguration } from '../models/configuration/MuteImageConfiguration';
import { MuteRole } from '../models/moderation/MuteRoles';
import { MuteTaskModel } from '../models/tasks/MuteTasks';
import { MuteTask } from '../tasks/Mute';
import { ActionData, ACTION_COLORS, ACTION_TYPE, COLORS, configOption, linkRegex } from '../util/constants';
import Action from './Action';

export default class MuteAction extends Action {
  public constructor(
    protected client: NMLClient,
    data: ActionData
  ) {
    super(ACTION_TYPE.MUTE, data);
  }

  public async before(): Promise<boolean> {
    if (RegExp(/config/g).exec(this.message.content)?.length) return true;

    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    if (
      this.message.guild.ownerID !== this.message.member.id &&
      this.target.roles.highest.comparePositionTo(this.message.member.roles.highest) >= 0 ||
      this.target.roles.highest.comparePositionTo(this.message.guild.me.roles.highest) >= 0
    ) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'Authority is insufficient. Cannot mute the specified member.'
        }
      });

      return false;
    }

    if (this.target.roles.cache.find(role => ['exiled', 'mute'].some(n => role.name.toLowerCase().includes(n)))) {
      return false;
    }

    return true;
  }

  public async exec() {
    if (RegExp(/config/g).exec(this.message.content)?.length) return this.handleConfig(this.message);

    const mrRepository = getRepository(MuteRole);
    const mtRepository = getRepository(MuteTaskModel);
    const mcRepository = getRepository(MuteConfiguration);

    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const roles = this.target.roles?.cache.filter(r => !r.managed || r.id !== this.message.guild.id).keyArray() ?? [];
    const cantRemove = this.target.roles.cache.filter(r => r.managed || r.id === this.message.guild.id).keyArray() ?? [];
    const audit = this.handler.audit;

    if (['--h', '-h'].some(h => this.message.content.toLowerCase().includes(h))) {
      await this.target.roles.set([
        this.message.guild.roles.cache.find(role => role.name.toLowerCase().includes('mute')).id
      ], audit);

      await mrRepository.save({
        guildID: this.message.guild.id,
        memberID: this.target.id,
        roles
      });

      this.handler.punishmentType = 'HARD';

      return this.message.util.send({
        embed: {
          color: COLORS.SUCCESS,
          description: `Executed a hard mute on ${this.target}. They must've done something bad, eh?`
        }
      });
    }

    const link =
      RegExp(linkRegex).exec(this.message.content)?.[0] ||
      (await mcRepository.findOne({ guildID: this.message.guild.id, memberID: this.message.author.id }))?.imageLink ||
      'https://i.imgur.com/N4A40dR.gif';

    await this.target.roles.set(
      [
        ...cantRemove,
        ...this.target.roles.cache.filter(role =>
          Boolean(role.name.match(/^[0-9]{1,2}/g)?.length)).map(r => r.id),
        this.message.guild.roles.cache.find(r => r.name.toLowerCase().includes('exiled') || r.name.startsWith('mute'))
      ]
      , audit
    );

    const time = new Date(Date.now() + this.duration);

    try {
      const raw = await mtRepository.save({
        guildID: this.message.guild.id,
        memberID: this.target.id,
        roles,
        time
      });

      await new MuteTask(this.client, {
        time,
        roles,
        guildID: this.message.guild.id,
        memberID: this.target.id
      }).execute(raw.id);

      await mrRepository.save({
        guildID: this.message.guild.id,
        memberID: this.target.id,
        roles
      });

      const context = stripIndent`
      **Muted** (in ${this.message.guild.name})
      **Time**: ${ms(this.duration)}
      ${this.reason ? `**Reason**: ${this.reason}` : ''}
      `;

      const format = link.includes('gif') ? 'gif' : 'jpg';

      const muteEmbed = new MessageEmbed()
        .setColor(ACTION_COLORS.MUTE)
        .setDescription(context)
        .setImage(`attachment://mute.${format}`)
        .attachFiles([
          {
            attachment: link,
            name: `mute.${format}`
          }
        ]);

      await this.target.send({
        embed: {
          color: '#FFFF00',
          description: context
        }
      })
        .catch(() => muteEmbed.setFooter(`${(this.target as GuildMember).user.tag}'s (${this.target.id}) DMs are unavailable to the client.`));

      await this.message.channel.send(muteEmbed);
    } catch (e) { console.error(e); }
  }

  public async handleConfig(message: NMLMessage) {
    const mcRepository = getRepository(MuteConfiguration);
    const exists = await mcRepository.findOne({ guildID: message.guild.id, memberID: message.author.id });

    if (
      RegExp(configOption.remove).exec(message.content)?.length &&
      exists
    ) {
      await mcRepository.delete({ guildID: message.guild.id, memberID: message.author.id });

      return message.util.send({
        embed: {
          color: COLORS.SUCCESS,
          description: 'Successfully disabled your link configuration.'
        }
      });
    }

    if (RegExp(configOption.add).exec(message.content)?.length) {
      const link = this.extract(message.content);

      if (!link) {
        return message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'Missing `{link}` flag / argument.'
          }
        });
      }

      if (exists && exists.imageLink === link) {
        return message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'This link is already applied to your mute configuration.'
          }
        });
      }

      await mcRepository.save({
        guildID: message.guild.id,
        memberID: message.author.id,
        imageLink: link
      });

      await message.channel.send({
        embed: {
          color: COLORS.SUCCESS,
          description: `Successfully configured mute image/gif for ${message.author}`,
          footer: {
            text: link
          }
        }
      });
    }
  }

  public extract(content: string): string {
    const link = RegExp(linkRegex).exec(content)?.[0];

    if (!link) return null;

    return link.replace(/'$/, '');
  }
}
