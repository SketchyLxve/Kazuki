import { Message, User } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { UnbanTaskModel } from '../models/tasks/UnbanTasks';
import { ActionData, ACTION_TYPE, COLORS } from '../util/constants';
import Action from './Action';

export default class UnbanAction extends Action {
  protected response: NMLMessage;

  public constructor(
    protected client: NMLClient,
    data: ActionData
  ) {
    super(ACTION_TYPE.UNBAN, data);
  }

  public async before(): Promise<boolean> {
    const user = await this.client.extract(this.client, this.message, { configurable: false, asUser: true }) as User;

    if (!user) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'The specified user doesn\'t exist.'
        }
      });

      return false;
    }

    this.target = user;

    this.handler.target = user;

    const bans = await this.message.guild.fetchBans();

    if (!bans.find(ban => ban.user.id === user.id)) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'The specified user is not banned.'
        }
      });

      return false;
    }

    const action = await this.message.channel.send({
      embed: {
        color: COLORS.TRIGGER,
        description: `Are you sure that you want to unban ${user.tag}? [y/n]`
      }
    });

    try {
      const [[, response]] = await this.message.channel.awaitMessages(
        (msg: Message) => msg.author.id === this.message.author.id && ['yes', 'no', 'y', 'n'].some(o => msg.content.toLowerCase() === o),
        { time: 15000, max: 1, errors: ['time'] }
      );

      if (response.content.toLowerCase().includes('n')) {
        await action.edit({
          embed: {
            color: COLORS.CANCEL,
            description: 'Command cancelled.'
          }
        });

        return false;
      }

      this.response = await action.edit({
        embed: {
          color: COLORS.PROCESSING,
          description: 'Processing...'
        }
      }) as NMLMessage;

      return true;
    } catch {
      await action.edit({
        embed: {
          color: COLORS.FAIL,
          description: 'Time elapsed!'
        }
      });

      return false;
    }
  }

  public async exec() {
    if (!this.target) return;

    const utRepository = getRepository(UnbanTaskModel);

    const task = await utRepository.findOne({ guildID: this.message.guild.id, memberID: this.target.id });

    try {
      await this.message.guild.members.unban(this.target.id, this.handler.audit);

      if (task?.id) {
        const id = task.id.toString();

        this.client.tasks
          .get(id)
          ?.clear();

        this.client.tasks.delete(id);

        await utRepository.delete({ guildID: this.message.guild.id, memberID: this.target.id });

        console.log(`[UNBAN]: Removed task #${task.id} from UNBAN TASKS.`);
      }

      await this.response.edit({
        embed: {
          color: COLORS.SUCCESS,
          description: `Successfully unbanned ${(this.target as User).tag}`
        }
      });
    } catch (e) {
      console.error(e);

      await this.response.edit({
        embed: {
          color: COLORS.FAIL,
          description: `Sudden interruption while processing. \n\nError: ${e.message}`
        }
      });
    }
  }
}
