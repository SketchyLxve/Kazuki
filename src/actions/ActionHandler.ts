import { stripIndent } from 'common-tags';
import { GuildMember, MessageEmbed, User } from 'discord.js';
import ms from 'ms';
import { NMLClient } from '../core/structures/NMLClient';
import { ActionDemoteData, ActionHandlerData, ActionHandlerTypeData, ActionType, ACTION_COLORS, Punishment } from '../util/constants';

export default class ActionHandler {
  protected executor: User;

  public target: User;

  public action: ActionType;

  public punishmentType: Punishment;

  public case: number;

  public reason: string;

  protected duration?: number;

  public assignedDemoteCategory: string;

  public typeColor = {
    'ban': 'BAN',
    'blacklist': 'BLACKLIST',
    'kick': 'KICK',
    'mute': 'MUTE',
    'full demote': 'FULL_DEMOTE',
    'partial demote': 'PARTIAL_DEMOTE',
    get 'fd'() { return this['full demote']; },
    get 'pd'() { return this['partial demote']; },
    get 'softban'() { return this.ban; },
    get 'tempban'() { return this.ban; }
  };

  protected type;

  public constructor(protected client: NMLClient, data: ActionHandlerData) {
    this.executor = data.executor;
    this.target = data.target;
    this.action = data.type;
    this.punishmentType = data.data.type;
    this.reason = data.reason;
    this.client = data.executor.client as NMLClient;

    this.type = {
      NORMAL: `${this.action.includes('blacklist') ? 'blacklisted' : 'banned'} $`,
      SOFT: 'softbanned $',
      TEMP: 'banned $ temporarily',
      KICK: 'kicked $',
      MUTE: 'muted $',
      PARTIAL: 'demoted $ to ^',
      FULL: 'removed $ from staff'
    };

    if (this.instanceOfAHTD(data.data)) {
      this.duration = data.data.duration;
    }

    if (this.instanceOfADD(data.data)) {
      this.assignedDemoteCategory = data.data.demoteCategory;
    }

    if (data.case) {
      this.case = data.case;
    }
  }

  public instanceOfAHTD(value: any): value is ActionHandlerTypeData {
    return 'duration' in value;
  }

  public instanceOfADD(value: any): value is ActionDemoteData {
    return 'role' in value;
  }

  public get audit() {
    return `${this.option} | Issued by ${this.executor.tag} | Case #${this.case?.toString()}`;
  }

  protected get color() { return ACTION_COLORS[this.typeColor[this.action]]; }

  public get option() {
    return this.type[this.punishmentType]
      ?.replace(/\$/, this.target.tag)
      ?.replace(/\^/, this.assignedDemoteCategory ?? '');
  }

  public log(_case): MessageEmbed {
    const cat = this.assignedDemoteCategory;
    return new MessageEmbed()
      .setColor(this.color)
      .setAuthor(this.executor.tag, this.executor.displayAvatarURL({ dynamic: true }))
      .setDescription(stripIndent`
      **Member**: ${this.target.tag} (${this.target.id})
      **Action**: ${this.punishmentType === 'PARTIAL' ? 'partial demote' : this.action}
      ${this.reason ? `**Reason**: ${this.reason}` : ''}
      ${this.duration ? `**Duration**: ${ms(this.duration)}` : ''}
      ${cat ? `**Demoted to**: ${cat.split(' ').map(e => e[0].toUpperCase() + e.slice(1)).join(' ')}` : ''}
      `.replace(/(?<=\w)\n\s?/gm, '\n'))
      .setThumbnail(this.target.displayAvatarURL({ dynamic: true }))
      .setFooter(`Case ${_case}`)
      .setTimestamp();
  }

  public reply({ owner, embed }: { owner?: GuildMember; embed?: boolean }): string | MessageEmbed {
    const context = stripIndent`
    ${this.executor}, successfully ${this.option}.
    ${this.reason ? `**Reason**: ${this.reason}` : ''}
    ${this.duration ? `**Duration**: ${ms(this.duration)}` : ''}
    ${this.action === 'ban' && this.punishmentType === 'NORMAL' ? `This ban is appealable to the guild's owner - ${owner}.` : ''}
    `.replace(/(?<=\w)\n\s?/gm, '\n');

    if (embed) {
      return new MessageEmbed()
        .setAuthor(this.client.user.tag, this.client.user.displayAvatarURL({ dynamic: true }))
        .setDescription(context)
        .setTimestamp();
    }

    return context;
  }

  public send({ owner, embed }: { owner?: GuildMember; embed?: boolean }): string | MessageEmbed {
    const context = stripIndent`
    You've been ${this.type[this.punishmentType]?.replace(/ ?\$/, '')}${this.duration ? ` for ${ms(this.duration)}` : ''}${owner ? ` from ${owner.guild.name}` : ''}.
    ${this.reason ? `**Reason**: ${this.reason}` : ''}
    ${this.action === 'ban' && this.punishmentType === 'NORMAL' ? `This ban is appealable to the guild's owner - ${owner} (${owner.user.tag}) - or one of the Exalteds.` : ''}
    `.replace(/(?<=\w)\n\s?/gm, '\n');

    if (embed) {
      return new MessageEmbed()
        .setAuthor(this.client.user.tag, this.client.user.displayAvatarURL({ dynamic: true }))
        .setDescription(context)
        .setTimestamp();
    }

    return context;
  }
}
