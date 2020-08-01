import { Message, MessageEmbed, User } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { BanConfiguration } from '../models/configuration/BanImageConfiguration';
import { UnbanTaskModel } from '../models/tasks/UnbanTasks';
import { ActionData, ACTION_TYPE, COLORS, configOption, linkRegex } from '../util/constants';
import Action from './Action';

export default class Ban extends Action {
  protected response: NMLMessage;

  public constructor(
    protected client: NMLClient,
    data: ActionData
  ) {
    super(ACTION_TYPE.BAN, data);
  }

  public async before(): Promise<boolean> {
    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    const isConfig = this.message.content.toLowerCase().match(/conf(ig)?/g)?.length;

    if (Boolean(isConfig)) {
      const bcRepository = getRepository(BanConfiguration);
      const exists = await bcRepository.findOne({ guildID: this.message.guild.id, memberID: this.message.author.id });

      if (
        this.message.content.match(configOption.remove)?.[0] &&
        !exists
      ) {
        await this.message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'You don\'t have a ban configuration set up.'
          }
        });

        return false;
      }

      if (this.message.content.match(configOption.add)?.[0]) {
        const link = this.extract(this.message.content);

        if (!link) {
          await this.message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: 'Missing `{link}` flag / argument.'
            }
          });

          return false;
        }

        if (exists && exists.imageLink === link) {
          await this.message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: 'This link is already applied to your mute configuration.'
            }
          });

          return false;
        }
      }

      return true;
    }
    if (
      !this.target.bannable ||
      this.message.guild.ownerID !== this.message.member.id &&
      this.target.roles.highest.comparePositionTo(this.message.member.roles.highest) >= 0
    ) {
      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'Authority is insufficient. Cannot ban the specified member.'
        }
      });

      return false;
    }

    const action = await this.message.channel.send({
      embed: {
        color: COLORS.TRIGGER,
        description: `Are you sure that you want to ban ${this.target}? [y/n]`
      }
    });

    try {
      const response = await this.message.channel.awaitMessages(
        (msg: Message) => msg.author.id === this.message.author.id && ['yes', 'no', 'y', 'n'].some(o => msg.content.toLowerCase() === o),
        { time: 15000, max: 1, errors: ['time'] }
      );

      if (response.first().content.toLowerCase().includes('n')) {
        await action.edit(null, {
          embed: {
            color: COLORS.CANCEL,
            description: 'Command cancelled.'
          }
        });

        return false;
      }

      this.response = await action.edit(null, {
        embed: {
          color: COLORS.PROCESSING,
          description: 'Processing...'
        }
      }) as NMLMessage;

      return true;
    } catch {
      await action.edit(null, {
        embed: {
          color: COLORS.FAIL,
          description: 'Time elapsed! Command cancelled.'
        }
      });

      return false;
    }
  }

  public async exec() {
    if (this.message.content.match(/conf(ig)?/g)?.[0]) return this.handleConfig();

    if (this.target instanceof User) this.target = await this.message.guild.members.fetch(this.target);

    try {
      const bcRepository = getRepository(BanConfiguration);

      await this.target.send(this.handler.send({ owner: this.message.guild.owner, embed: false }));

      await this.target.ban({ reason: this.handler.audit })
        .then(async () => {
          if (this.handler.option.includes('temp') && this.duration) {
            this.handler.action = 'tempban';
            const unbanTasksRepo = getRepository(UnbanTaskModel);

            await unbanTasksRepo.save({
              guildID: this.message.guild.id,
              memberID: this.target.id,
              time: new Date(Date.now() + this.duration)
            });

            setTimeout(async () => {
              await this.message.guild.members.unban(this.target.id);

              await unbanTasksRepo.delete({ guildID: this.message.guild.id, memberID: this.target.id });
            }, this.duration);
          } else if (this.handler.option.includes('soft')) {
            this.handler.action = 'softban';
            await this.message.guild.members.unban(this.target.id);
          }

          const link =
            this.extract(this.message.content.toLowerCase()) ||
            (await bcRepository.findOne({ guildID: this.message.guild.id, memberID: this.message.author.id }))?.imageLink;
          const ctx = this.handler.reply({ owner: this.message.guild.owner, embed: true });
          const format = link?.includes('gif') ? 'gif' : 'jpg';

          if (link && ctx instanceof MessageEmbed) {
            ctx
              .setImage(`attachment://ban.${format}`)
              .attachFiles([
                {
                  attachment: link,
                  name: `ban.${format}`
                }
              ]);
          }

          await this.response.delete();

          await this.message.channel.send(ctx);
        });
    } catch (e) {
      console.error(e);

      await this.message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: `Something went wrong during the command. \n\nError message: ${e.message}`
        }
      });
    }
  }

  public async handleConfig() {
    const bcRepository = getRepository(BanConfiguration);

    if (this.message.content.match(configOption.remove)?.[0]) {
      await bcRepository.delete({ guildID: this.message.guild.id, memberID: this.message.author.id });

      return this.message.util.send({
        embed: {
          color: COLORS.SUCCESS,
          description: 'Successfully disabled your link configuration.'
        }
      });
    }

    if (this.message.content.match(configOption.add)?.[0]) {
      const link = this.extract(this.message.content);

      await bcRepository.save({
        guildID: this.message.guild.id,
        memberID: this.message.author.id,
        imageLink: link
      });

      await this.message.channel.send({
        embed: {
          color: COLORS.SUCCESS,
          description: `Successfully configured mute image/gif for ${this.message.author}`,
          footer: {
            text: link
          }
        }
      });
    }
  }

  public extract(content: string): string {
    // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
    const link = content.match(linkRegex)?.[0];

    if (!link) return null;

    return link.replace(/'$/, '');
  }
}
