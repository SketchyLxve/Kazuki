import { stripIndent } from 'common-tags';
import { MessageEmbed, User } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLClient } from '../core/structures/NMLClient';
import { MuteRole } from '../models/moderation/MuteRoles';
import { MuteTaskModel } from '../models/tasks/MuteTasks';
import { ActionData, ACTION_TYPE, COLORS } from '../util/constants';
import Action from './Action';

export default class UnmuteAction extends Action {
  public constructor(
    protected client: NMLClient,
    data: ActionData
  ) {
    super(ACTION_TYPE.UNMUTE, data);
  }

  public async before(): Promise<boolean> {
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const hasRole = this.target.roles.cache.find(r => ['exiled', 'mute'].some(n => r.name.toLowerCase().includes(n)));

    if (!hasRole) {
      await this.message.util.send('The specified member is not muted.');

      return false;
    }

    return true;
  }

  public async exec() {
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const muteTasks = getRepository(MuteTaskModel);
    const muteRoles = getRepository(MuteRole);
    const guildID = this.message.guild.id;
    const memberID = this.target.id;

    const task = await muteTasks.findOne({ guildID, memberID });
    const roles = await muteRoles.findOne({ guildID, memberID });

    try {
      try {
        const id = task.id.toString();

        this.client.tasks
          .get(id)
          ?.clear?.();

        this.client.tasks.delete(id);

        await muteTasks.delete({ id });

        console.log(`[UNMUTE]: Successfully stopped & deleted task #${id}`);
      } catch { }

      const muteRole = this.message.guild.roles.cache.find(r => ['exiled', 'mute'].some(n => r.name.toLowerCase().includes(n))).id;

      await muteRoles.delete({ guildID, memberID });

      await (roles?.roles
        ? this.target.roles.set(roles.roles)
        : this.target.roles.remove(muteRole));

      const success = new MessageEmbed()
        .setColor(COLORS.SUCCESS)
        .setDescription(stripIndent`
        Successfully unmuted ${this.target}
        ${this.reason ? `**Reason**: ${this.reason}` : ''}
        `);

      try {
        await this.target.send({
          embed: {
            color: COLORS.PROCESSING,
            description: stripIndent`
            You've been unmuted in \`${this.message.guild.name}\`
            **Executor**: ${this.target}
            ${this.reason ? `**Reason**: ${this.reason}` : ''}
            `
          }
        });
      } catch {
        success.setFooter(`Unable to DM ${this.target.user.tag}; DMs closed most likely.`);
      }

      await this.message.channel.send(success);
    } catch (e) {
      console.error(e);

      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: `Something went wrong during execution. \n\nError: ${e.message}`
        }
      });
    }
  }
}
