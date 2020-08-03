import { stripIndent } from 'common-tags';
import { GuildMember, User } from 'discord.js';
import { getRepository, Like, Not } from 'typeorm';
import { NMLMessage } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { PromoteRoles } from '../models/administration/PromoteRoles';
import { ActionData, ACTION_TYPE, COLORS, PromoteRolesData } from '../util/constants';
import Action from './Action';

export default class PromoteAction extends Action {
  protected response: NMLMessage;

  protected insertOptions = ['insert', 'add', '+', 'update', '+-'];

  protected removeOptions = ['remove', 'rm', '-'];

  protected deleted: PromoteRolesData;

  protected data: PromoteRolesData;

  protected promotes = getRepository(PromoteRoles);

  protected arg = {
    category: 'category',
    level: 'level',
    roles: 'roles'
  };

  private readonly replacements = {
    'true': true,
    'false': false,
    get 'yes'() { return this.true; },
    get 'y'() { return this.true; },
    get 'no'() { return this.false; },
    get 'n'() { return this.false; }
  };

  public constructor(
    protected client: NMLClient,
    data: Omit<ActionData, 'duration'>
  ) {
    super(
      ACTION_TYPE[data.role ? 'PARTIAL_DEMOTE' : 'FULL_DEMOTE'],
      data
    );
  }

  public async before(): Promise<boolean> {
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const [level] = this.client.parsePatterns(this.message.content.replace(/(?<=^|\D)(?:\d{17,18})(?=$|\D)/g, ''), [
      /(?<=(-{1,2}(lvl|level))?=?)\d{1,2}/g
    ]);
    const guildID = this.message.guild.id;

    if (this.message.content.toLowerCase().includes('config')) {
      const [arg, ...args] = this.message.content.toLowerCase().split(' ').slice(2);

      if (this.removeOptions.some(o => arg === o) && this.message.content.toLowerCase().includes('all')) {
        this.response = await this.message.channel.send({
          embed: {
            color: COLORS.PROCESSING,
            description: 'Deleting...'
          }
        }) as NMLMessage;

        return true;
      }

      if (this.insertOptions.some(o => arg === o)) {
        const [category, insertLevel, roles, stripExistent] = this.client.parsePatterns(args.join(' '), [
          /(?<=category:? ?").*(?=")/g,
          /(?<=(level|lvl):? ?)\d{1}/g,
          /(?<=roles:? ?\[)(\d+(,? ?))+(?=\])/g,
          /(?<=strip_(roles|existent):? ?)(true|false|y(es)?|no?)/g
        ]);

        const temp = { category, level: insertLevel, roles };
        const found = Object.keys(temp).find(e => !this.message.content.includes(e));

        if (found) {
          await this.message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: stripIndent`
              Mismatched arguments.
              Please provide the \`${this.arg[found]}\` argument.
              `
            }
          });

          return false;
        }

        this.data = {
          category,
          level: insertLevel,
          roles: [...roles.replace(/, ?/g, ' ').split(' ')],
          stripExistent: stripExistent ? this.replacements[stripExistent] : true
        };

        const current = await this.promotes.findOne({ guildID, ...(category ? { category: Like(`%${category.toLowerCase()}%`) } : { level: insertLevel }) });

        if (
          JSON.stringify(current?.roles) === JSON.stringify(this.data.roles)
        ) {
          await this.message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: stripIndent`
              Pointless to update something if it won't make a difference, eh?
              `
            }
          });

          return false;
        }

        this.response = await this.message.channel.send({
          embed: {
            color: COLORS.PROCESSING,
            description: stripIndent`
            ${arg.toLowerCase() === 'update' ? 'Updating' : 'Inserting'}...
            `
          }
        }) as NMLMessage;
      }

      if (this.removeOptions.some(o => arg === o)) {
        if (!level) {
          await this.message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: stripIndent`
              Mismatched arguments.
              Please provide the \`level\` argument/flag.
              `
            }
          });

          return false;
        }

        this.response = await this.message.channel.send({
          embed: {
            color: COLORS.PROCESSING,
            description: 'Deleting...'
          }
        }) as NMLMessage;

        return true;
      }

      if (!level) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: stripIndent`
            Mismatched arguments.
            Missing \`--level\` flag.
            `
          }
        });

        return false;
      }
    } else {
      const [category] = this.client.parsePatterns(this.message.content,
        [/(?<=(<@!?\d{17,18}>) ?(-{1,2}category=?"?)?)[a-zA-Z]+( ?[A-Za-z]+)?/],
        false);
      const promote = await this.promotes.findOne({ guildID, ...(category ? { category: Like(`%${category.toLowerCase()}%`) } : { level }) });

      if (!promote?.roles) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'The provided level/category was not found.'
          }
        });

        return false;
      }

      if (promote.roles.some(e => (this.target as GuildMember).roles.cache.has(e))) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'This staff member is already at this level.'
          }
        });

        return false;
      }

      return true;
    }

    return true;
  }

  public async exec() {
    if (this.message.content.toLowerCase().includes('config')) return this.handleConfig();

    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const guildID = this.message.guild.id;
    const [category, level] = this.client.parsePatterns(this.message.content,
      [
        /(?<=(<@!?\d{17,18}>) ?(-{1,2}category=?"?)?)[a-zA-Z]+( ?[A-Za-z]+)?/,
        /(?<=(<?@?!?\d{18}>?) ?(level|lvl)?=?)\d{1}/g
      ],
      false);
    const promote = await this.promotes.findOne({ guildID, ...(category ? { category: Like(`%${category.toLowerCase()}%`) } : { level }) });

    const exceptionals = await this.promotes.find({ ...(category ? { category: Not(category) } : { level: Not(level) }) });
    const toSet = [...this.target.roles.cache.filter(r =>
      promote?.stripExistent ? !exceptionals.some(e => e.roles.includes(r.id)) : true).keyArray(),
    ...promote.roles];
    const [current] = (await this.promotes.find())
      .filter(r =>
        r.roles.some(e => (this.target as GuildMember).roles.cache.has(e)));

    const removed =
      exceptionals
        .filter(e =>
          promote.stripExistent
            ? e.roles.some(r => (this.target as GuildMember).roles.cache.has(r))
            : false)
        .map(r => r.roles)
        .flat()
        .map(e => `<@&${e}>`)
        .join(', ') || 'No roles were removed.';

    const added = promote.roles.map(e => `<@&${e}>`)
      .join(', ');

    if (current?.level > promote.level) {
      this.handler.punishmentType = 'PARTIAL';

      this.handler.assignedDemoteCategory = promote.category;

      if (!this.reason) {
        await this.message.channel.send({
          embed: {
            color: COLORS.TRIGGER,
            description: 'What was the reason for this partial demote?'
          }
        });

        const [[, response]] = await this.message.channel.awaitMessages(
          (msg: NMLMessage) => msg.author.id === this.message.author.id,
          { time: 15000, max: 1, errors: ['time'] }
        );

        if (response.content.toLowerCase() !== 'cancel') this.handler.reason = response.content;
      }
    }

    try {
      await this.target.roles.set(toSet, this.handler.audit);

      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: stripIndent`
          Successfully ${current?.level > promote.level ? 'demoted' : 'promoted'} ${this.target} to \`${promote.category.split(' ').map(e => `${e[0].toUpperCase() + e.slice(1)}`).join(' ')}\`
          Roles that were added: ${added}
          Roles that were removed: ${removed}
          `
        }
      });

      return void 0;
    } catch (e) {
      console.error(e);

      return this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: stripIndent`
          Unexpected error.
          Error: ${e.message}
          `
        }
      });
    }
  }

  public async handleConfig() {
    const guildID = this.message.guild.id;
    const [arg] = this.message.content.split(' ').slice(2);

    if (this.removeOptions.some(o => arg === o) && this.message.content.toLowerCase().includes('all')) {
      await this.promotes.delete({});

      return this.response.edit(null, {
        embed: {
          color: COLORS.SUCCESS,
          description: 'Successfully removed all promotes configuration for this guild.'
        }
      });
    }

    if (this.insertOptions.some(o => arg === o)) {
      await this.promotes.save({
        guildID,
        category: this.data.category.toLowerCase(),
        level: parseInt(this.data.level as string),
        roles: this.data.roles,
        stripExistent: this.data.stripExistent
      });

      return this.response.edit(null, {
        embed: {
          color: COLORS.SUCCESS,
          description: stripIndent`
          Successfully ${arg.toLowerCase() === 'update' ? 'Updated' : 'Inserted'} data to this guild's promotes configuration.
          Data:
          Level: ${this.data.level}
          Category: ${this.data.category}
          Roles: ${this.data.roles.map(e => `<@&${e}>`).join(', ')}
          Strip All: ${this.data.stripExistent ? 'Yes' : 'No'}
          `
        }
      });
    }

    if (this.removeOptions.some(o => arg === o)) {
      let { raw: data } = await this.promotes.delete({ guildID, ...(this.category ? { category: Like(`%${this.data.category.toLowerCase()}%`) } : { level: parseInt(this.data.level as string) }) });
      data = data[0];

      return this.response.edit(null, {
        embed: {
          color: COLORS.SUCCESS,
          description: stripIndent`
          Successfully removed configuration level ${data.level}'s data from this guild's config.
          Data:
          Level: ${data.level}
          Category: ${data.category}
          Roles: ${data.roles.map(r => `<@&${r}>`).join(', ')}
          Strip All: ${data.stripExistent ? 'Yes' : 'No'}
          `
        }
      });
    }
  }
}
