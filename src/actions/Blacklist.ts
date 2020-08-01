import { stripIndent } from 'common-tags';
import { Message, MessageEmbed, User } from 'discord.js';
import { NMLClient } from '../core/structures/NMLClient';
import { Blacklist } from '../models/configuration/Blacklists';
import { ActionData, ACTION_TYPE, cmds, COLORS, delRegex, targetRegex } from '../util/constants';
import Action from './Action';

export default class BlacklistAction extends Action {
  protected global = Boolean(this.message.content.match(/-{1,2}g(lobal)?/g)?.length);

  protected limitToGuild = Boolean(this.message.content.match(/-{1,2}(only|limit|local)/g)?.length);

  protected restrict = Boolean(this.message.content.match(/-{1,2}(restrict|full|all|deny)/g)?.length);

  protected args = this.message.content.match(cmds)?.[0];

  protected deletes = Boolean(this.message.content.match(delRegex)?.length);

  protected extracted = this.message.content.match(targetRegex)?.[0];

  protected hasGlobal = this.message.content.match(/-{1,2}g(lobal)?/g)?.length;

  protected hasLimit = this.message.content.match(/-{1,2}(only|limit|local)/g)?.length;

  protected commands = this.client.commands
    .filter(c =>
      (this.args?.length
        ? this.args.split(' ').length > 1
          ? this.args.split(' ')
          : (this.args.split(';').length > 1
            ? this.args.split(';')
            : this.args.split(','))
        : [])
        .filter(e => e.replace(/^\s+(?=[^a-zA-Z]+|[a-zA-Z]+)|(?<=[^a-zA-Z]+|[a-zA-Z]+ )\s+$/g, ''))
        .some(e => c.aliases.includes(e.replace(/(, ?|; ?| )/g, '').toLowerCase())));

  protected owners = ['681758580466384939', '575108662457139201', '410745005557284874'];

  protected blacklists = Blacklist;

  protected blacklist: Blacklist;

  public constructor(
    protected client: NMLClient,
    data: Omit<ActionData, 'duration'>
  ) {
    super(
      ACTION_TYPE.BLACKLIST,
      data
    );
  }

  public async before(): Promise<boolean> {
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    if (this.target.id === this.message.author.id) return false;

    const isNotOwner = this.message.guild.ownerID !== this.message.author.id;

    if (
      !this.message.member.permissions.has('ADMINISTRATOR') && isNotOwner && !this.global ||
      !this.owners.some(id => this.message.author.id === id) && this.global ||
      this.target.roles.highest.comparePositionTo(this.message.member.roles.highest) >= 0 && isNotOwner
    ) return false;

    this.blacklist = await this.blacklists.findOne({ memberID: this.target.id });

    if (!this.blacklist && this.deletes) return false;

    if (this.deletes && this.commands.size && this.blacklist.commands.filter(c => this.commands.find(cmd => c === cmd.name)).length <= 0) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'The specified command(s) don\'t exist in the target\'s blacklist.'
        }
      });

      return false;
    }

    const guildID = this.message.guild.id;

    if (this.blacklist && !this.deletes) {
      if ( // eslint-disable-line
        this.commands.every(c => this.blacklist.commands?.length
          ? this.blacklist.commands.includes(c.name)
          : true) &&
        (this.blacklist.guildID === guildID || !this.blacklist.guildID) &&
        this.blacklist.global === this.global
      ) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'Entry is identical.'
          }
        });

        return false;
      }

      return true;
    }

    return true;
  }

  public async exec() {
    const guildID = this.message.guild.id;
    const memberID = this.target.id;

    const commands = !this.restrict
      ? this.commands.map(c => c?.name).filter(e => e.length)
      : null;

    if (!this.commands.size) this.restrict = true;

    if (
      !this.deletes &&
      !this.hasGlobal &&
      !this.hasLimit
    ) {
      const msg = await this.message.channel.send('Do you wish to limit the blacklist to only this guild? [y/n]');
      try {
        const [[, response]] = await this.message.channel.awaitMessages((m: Message) => this.message.author.id === m.author.id, {
          time: 15000,
          max: 1,
          errors: ['time']
        });

        if (response) {
          if (['yes', 'y'].some(a => response.content === a)) {
            if (this.blacklist) {
              this.blacklist.guildID = response.guild.id;
              this.blacklist.global = false;
            }

            this.limitToGuild = true;
            this.global = false;
          } else {
            if (this.blacklist) {
              this.blacklist.guildID = null;
              this.blacklist.global = true;
            }

            this.limitToGuild = false;
            this.global = true;
          }
        }
      } catch {
        await msg.edit('Timed out! Set to global.');
        if (this.blacklist) {
          this.blacklist.guildID = null;
          this.blacklist.global = true;
        }

        this.limitToGuild = false;
        this.global = true;
      }
    }

    if (!this.blacklist) {
      const _data = await this.blacklists.create({
        guildID: !this.limitToGuild ? null : guildID,
        memberID,
        commands: commands,
        global: this.limitToGuild ? false : true,
        restricted: this.restrict
      });

      await this.blacklists.save(_data);

      const embed = this.handler.reply({ owner: await this.message.guild.owner.fetch(), embed: true }) as MessageEmbed;

      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      embed.description += `\n${stripIndent`
      **Local** (limited to only this guild): ${_data.global ? 'No' : 'Yes'}
      ${_data.commands?.length ? `**Commands**: ${_data.commands.map(c => `\`${c}\``).join(' ')}` : ''}`}`;

      return this.message.channel.send(embed);
    }

    if (this.deletes) return this.delete();

    if (this.commands.filter(c => !this.blacklist.commands?.includes(c.name)) && !this.restrict) {
      if (this.blacklist.commands?.length <= 0) this.blacklist.commands = [];

      for (const [name] of this.commands.filter(c => !this.blacklist.commands?.includes(c.name))) {
        this.blacklist.commands?.push(name);
      }
    }

    if (this.blacklist && this.global && !this.blacklist.global) {
      this.blacklist.guildID = null;
      this.blacklist.global = true;
    }

    if (this.limitToGuild) {
      this.blacklist.guildID = guildID;
      this.blacklist.global = false;
    }

    if (this.restrict) {
      this.blacklist.commands = null;
      this.blacklist.restricted = true;
    }

    const data = await this.blacklists.save(this.blacklist);
    const embed = this.handler.reply({ owner: await this.message.guild.owner.fetch(), embed: true }) as MessageEmbed;

    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    embed.description += (`\n${stripIndent`
      **Local** (limited to only this guild): ${data.global ? 'No' : 'Yes'}
      ${data.commands?.length ? `**Commands**: ${data.commands.map(c => `\`${c}\``).join(', ')}` : '**Complete restriction**'}`}`
    );

    return this.message.channel.send(embed);
  }

  protected async delete() {
    this.handler.punishmentType = null;

    if (this.commands.size) {
      this.blacklist.commands = this.blacklist.commands.filter(c => !this.commands.find(cmd => c === cmd.name));

      const data = await this.blacklists.save(this.blacklist);

      return this.message.channel.send({
        embed: {
          color: COLORS.SUCCESS,
          description: stripIndent`
          Successfully removed a few commands from ${this.target}'s blacklist.
          **Commands** (left): ${data.commands.map(c => `\`${c}\``).join(', ') ?? 'None'}
          **Commands** (removed): ${this.commands.map(c => `\`${c.name}\``).join(', ')}`
        }
      });
    }

    try {
      const target = await this.message.guild.members.fetch(this.extracted);
      const blacklist = await this.blacklists.findOne({ memberID: target.id });

      if (blacklist.global && !this.owners.some(id => this.message.author.id === id)) return;

      await this.blacklists.delete(blacklist);
      return this.message.channel.send(`Successfully removed ${target} from the blacklists.`);
    } catch (e) {
      console.error(e);
    }
  }
}
