import { User } from 'discord.js';
import { NMLMessage } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { ActionData, ACTION_TYPE, COLORS } from '../util/constants';
import Action from './Action';

export default class KickAction extends Action {
  protected response: NMLMessage;

  public constructor(
    protected client: NMLClient,
    data: ActionData
  ) {
    super(ACTION_TYPE.KICK, data);
  }

  public async before(): Promise<boolean> {
    if (!this.handler.punishmentType) this.handler.punishmentType = 'KICK';
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    if (
      !this.target.kickable ||
            this.message.author.id !== this.message.guild.ownerID &&
            this.target.roles.highest.comparePositionTo(this.message.member.roles.highest) >= 0
    ) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'Authority is insufficient. Cannot kick the specified member.'
        }
      });

      return false;
    }

    const action = await this.message.channel.send({
      embed: {
        color: COLORS.TRIGGER,
        description: `Are you sure that you want to kick ${this.target}? [y/n]`
      }
    });

    try {
      const responses = await this.message.channel.awaitMessages(
        msg => msg.author.id === this.message.author.id && ['yes', 'no', 'y', 'n'].some(o => msg.content.toLowerCase() === o),
        { time: 15000, max: 1, errors: ['time'] }
      );

      if (responses.first().content.toLowerCase().includes('n')) {
        await action.edit({
          embed: {
            color: COLORS.CANCEL,
            description: 'Command cancelled successfully.'
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
    }
  }

  public async exec() {
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    try {
      await this.target.send(this.handler.send({ embed: false }));

      await this.target.kick(this.handler.audit);

      await this.response.edit({
        embed: {
          color: COLORS.SUCCESS,
          description: `Successfully kicked ${this.target}`
        }
      });
    } catch (e) {
      console.error(e);
      await this.response.edit({
        embed: {
          color: COLORS.FAIL,
          description: `Sudden interruption during command process. \n\nError: ${e.message}`
        }
      });
    }
  }
}
