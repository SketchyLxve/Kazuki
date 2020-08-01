import { stripIndent } from 'common-tags';
import { GuildMember, User } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLClient } from '../core/structures/NMLClient';
import { DemoteRoles } from '../models/administration/DemoteRoles';
import { ActionData, ACTION_TYPE, COLORS } from '../util/constants';
import Action from './Action';

export default class DemoteAction extends Action {
  protected actions = ['insert', 'add', '+', 'remove', 'rm', '-'];

  protected demoteRepository = getRepository(DemoteRoles);

  protected demotes;

  protected roles: string[];

  protected isInsert: boolean;

  protected toRemove: string[];

  protected readonly options = {
    'insert': 'Inserts the new specified role(s) to the database',
    'remove': 'Removes the specified role(s) from the database, if any are found.',
    get 'rm'() {
      return this.remove;
    },
    get '-'() {
      return this.remove;
    },
    get '+'() {
      return this.insert;
    }
  };

  public constructor(
    protected client: NMLClient,
    data: Omit<ActionData, 'duration'>
  ) {
    super(
      ACTION_TYPE.FULL_DEMOTE,
      data
    );
  }

  public async before(): Promise<boolean> {
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const guildID = this.message.guild.id;

    if (this.message.content.toLowerCase().includes('config')) {
      const isValid = this.actions.some(a => this.message.content.toLowerCase().split(' ')[2] === a);

      if (!isValid) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: stripIndent`
            Invalid argument.
            All valid arguments: 
            ${this.actions.map(a => `\`${a}\` - ${this.options[a]}`).join('\n')}
            `
          }
        });

        return false;
      }

      this.roles = Array(RegExp(/(?<=(<@&)?)\d{17,18}(?=>?)/g).exec(RegExp(/(?<={).*(?=})|(?<=\[).*(?=\])/gm)
        .exec(this.message.content)?.[0] || '')?.[0]);

      this.roles =
        this.message.content
          .match(/(?<={).*(?=})|(?<=\[).*(?=\])/gm)
          ?.[0].match(/(?<=(<@&)?)\d{17,18}(?=>?)/g);

      if (!this.roles?.length) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: stripIndent`
            Please provide an array of role mentions or IDs.
            Example: \`{720632198050480211, 659489605539856384, @role_name, <@&659501973715812353>}\`
            OR \`[720632198050480211, 659489605539856384, @role_name, <@&659501973715812353>]\`
            Both syntaxes are valid.
            `
          }
        });

        return false;
      }

      const option = this.options[
        this.actions.find(a => this.message.content.toLowerCase().includes(a))
      ];

      this.isInsert = option?.toLowerCase().includes('insert');

      this.demotes = await this.demoteRepository.findOne({ guildID });

      this.roles = this.roles.filter(
        r => this.isInsert ? !this.demotes?.roles.includes(r) : this.demotes?.roles.includes(r)
      );

      if (!this.roles?.length) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: stripIndent`
            The specified role(s) ${this.isInsert ? 'already exist(s)' : 'don\'t/doesn\'t exist(s)'} in this guild's config.
            `
          }
        });

        return false;
      }

      const values = [guildID, this.roles];

      if (!this.isInsert) this.demotes?.roles ? values.push(this.demotes.roles) : void 0;

      return true;
    }

    if (
      this.message.author.id !== this.message.guild.ownerID &&
      this.target.roles.highest.comparePositionTo(this.message.member.roles.highest) >= 0
    ) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'Authority is insufficient. Cannot demote the specified member.'
        }
      });

      return false;
    }

    const demotes = await this.demoteRepository.findOne({ guildID });
    this.toRemove = demotes.roles.filter(r => (this.target as GuildMember).roles.cache.has(r));

    if (!this.toRemove.length) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'This member is not a staff member.'
        }
      });

      return false;
    }

    return true;
  }

  public async exec() {
    if (this.message.content.toLowerCase().includes('config')) return this.handleConfig();

    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const guildID = this.message.guild.id;

    const demoteRepo = getRepository(DemoteRoles);
    const demotes = await demoteRepo.findOne({ guildID });

    if (this.target.id === this.message.author.id) return;

    if (!demotes?.roles.length) {
      return this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'The demote configuration has not been set up for this guild.'
        }
      });
    }

    try {
      await this.target.send(this.handler.send({ embed: false }));

      await this.target.roles.remove(this.toRemove, this.handler.audit);

      await this.message.channel.send({
        embed: {
          color: COLORS.SUCCESS,
          description: stripIndent`
          Successfully demoted ${this.target}
          ${this.reason ? `**Reason**: ${this.reason}` : ''}
          `,
          author: {
            name: this.message.author.tag,
            iconURL: this.message.author.displayAvatarURL({ dynamic: true })
          },
          fields: [
            {
              name: 'Roles',
              value: this.toRemove.map(r => `<@&${r}>`)
            }
          ]
        }
      });
    } catch (e) {
      console.error(e);

      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: `Unexpected error. \nError: ${e.message}`
        }
      });
    }
  }

  protected async handleConfig() {
    const guildID = this.message.guild.id;

    try {
      const r = await this.demoteRepository.save({
        guildID,
        roles: this.isInsert
          ? [...this.demotes?.roles || [], ...this.roles.filter(n => this.demotes?.roles ? !this.demotes?.roles.includes(n) : true)]
          : [...this.demotes?.roles.filter(n => !this.roles.includes(n)) || []]
      });

      const mapped = r.roles.map(e => `<@&${e}>`);

      await this.message.util.send({
        embed: {
          color: COLORS.SUCCESS,
          description: 'Successfully updated this guild\'s demote roles configuration.',
          fields: [
            {
              name: 'Current roles',
              value: mapped.length ? mapped.join(', ') : 'No roles.'
            }
          ]
        }
      });
    } catch (e) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: `Unexpected error. \nError: ${e.message}`
        }
      });

      console.error(e);
    }
  }
}
