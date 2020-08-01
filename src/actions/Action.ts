import { stripIndent } from 'common-tags';
import { GuildMember, TextChannel, User } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { Case } from '../models/actions/Cases';
import { SystemChannel } from '../models/actions/SystemChannels';
import { Blacklist } from '../models/configuration/Blacklists';
import { ActionData, ActionDemoteData, ActionHandlerTypeData, ActionType, KickData, Punishment, PUNISHMENT } from '../util/constants';
import ActionHandler from './ActionHandler';

export default abstract class Action {
  protected client: NMLClient;

  protected case: number;

  protected duration: number = 5 * 60 * 1000;

  protected message: NMLMessage;

  protected target: GuildMember | User;

  protected handler: ActionHandler;

  protected punishment: Punishment | null;

  protected reason?: string;

  protected category?: string;

  public constructor(
    protected action: ActionType,
    data: ActionData | Omit<ActionData, 'duration'> | KickData
  ) {
    this.client = data.message.client as NMLClient;
    this.message = data.message;
    this.target = data.target;
    this.action = data.action;
    this.punishment = data.punishment;
    this.reason = data.reason;

    if ('duration' in data) {
      this.duration = data.duration;
    }
  }

  public async commit() {
    await this.instantiate();

    try {
      if (!(await this.before())) return;
      await this.exec();
      await this.after();
    } catch (e) {
      console.log(e);
      await this.message.channel.send(e.message);
    }
  }

  public abstract async before(...args: any): Promise<boolean>;

  public abstract async exec(): Promise<unknown>;

  public async after() {
    if (RegExp(/config/).exec(this.message.content)?.length) return;

    if (PUNISHMENT[this.handler.punishmentType?.toUpperCase?.()?.replace?.(/ /g, '_')]) {
      const cases = getRepository(Case);
      const modLogs = getRepository(SystemChannel);

      const guild = this.message.guild;

      const _case = await cases.save({
        guildID: guild.id,
        targetID: this.target.id,
        reason: this.reason,
        executorID: this.message.author.id,
        caseType: this.action
      });

      this.case = _case.case;

      const modLog = await modLogs.findOne({ name: 'mod-logs', guildID: guild.id });
      const blacklists = Blacklist;
      const blacklist = await blacklists.findOne({ memberID: this.target.id });

      if (modLog) {
        const logChannel = this.client.channels.cache.get(modLog.channelID) as TextChannel;

        const embed = this.handler.log(_case.case.toString());

        // eslint-disable-next-line
        if (this.handler.action === 'blacklist') embed.description += `\n${stripIndent`
        **Local**: ${blacklist.global ? 'No' : 'Yes'}
        ${blacklist.commands?.length ? `**Commands**: ${blacklist.commands.map(c => `\`${c}\``).join(', ')}` : '**Complete restriction**'}
        `}`;

        await logChannel.send(embed);
      }
    }
  }

  public async instantiate() {
    const options = ['mute', 'ban', 'pd', 'fd', 'partial demote', 'full demote'];
    let determined: ActionHandlerTypeData | ActionDemoteData = {
      type: this.punishment
    };

    if (options.some(a => this.action === a)) {
      determined = Boolean(
        (this.action === 'ban' && this.punishment === 'TEMP' ||
          this.action === 'mute') && this.duration
      )
        ? {
          type: this.punishment,
          duration: this.duration
        }
        : {
          type: this.punishment,
          demoteCategory: this.category
        };
    }

    const cases = getRepository(Case);
    const all = await cases.find();

    this.handler = new ActionHandler(this.client, {
      'executor': this.message.author,
      'target': this.target instanceof User ? this.target : this.target?.user,
      'type': this.action,
      'data': determined,
      'case': all.length + 1,
      'reason': this.reason
    });
  }
}
