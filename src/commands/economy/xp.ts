import { GuildMember } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';
import { XP } from '../../models/economy/XP';
import { COLORS } from '../../util/constants';

export class XPCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'xp',
      aliases: ['scores'],
      additionalArguments: ['give', 'remove', 'clear', 'rm', 'add'],
      category: 'economy',
      help: 'xp {argument} <member> [amount]',
      description: 'Modifies the specified member\'s economy.',
      prefixes: ['?', '$'],
      enabled: false,
      editable: true,
      reaction: '💵',
      target: true
    });
  }

  public async run(client: NMLClient, message: NMLMessage, { target }) {
    const xpRepository = getRepository(XP);

    const option = message.content.match(/add|remove|rm|give|clear/g);

    if (option.length > 1 || !option.length) {
      return message.util.send({
        embed: {

          color: COLORS.FAIL,
          description: `${option.length
            ? 'Please provide only a single additional argument. '
            : 'Please provide an additional argument.'} \n\nAvailable arguments: ${this.additionalArguments.map(a => `\`${a}\``).join(', ')}`
        }
      });
    }

    const xp = await xpRepository.findOne({ guildID: message.guild.id, memberID: target.id });

    if (!xp && target) {
      await message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'The specified member is not a part of the economy. Do you want me to insert them? [y/n]'
        }
      });

      try {
        const response = await message.channel.awaitMessages(msg => msg.author.id === message.author.id, { max: 1, time: 15000, errors: ['time'] });

        if (response.first().content.toLowerCase().includes('y')) {
          await xpRepository.save({
            guildID: message.guild.id,
            memberID: target.id,
            xp: 0,
            level: 1
          });

          await this.handle(message, xp, target);
        }
      } catch {
        return message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'Time is up! Command cancelled.'
          }
        });
      }
    }

    await this.handle(message, xp, target);
  }

  public async handle(message: NMLMessage, xp, member: GuildMember, amount = parseInt(message.content.match(/(?<=^|\D)(?:\d{1,16}|\d{19,})(?=$|\D)/g)[0])) {
    const xpRepository = getRepository(XP);
    const memberXP = await xpRepository.findOne({ guildID: message.guild.id, memberID: member.id });

    if (
      message.content.includes('clear') &&
            !message.member.permissions.has('MANAGE_GUILD')
    ) {
      return message.util.send({
        embed: {
          color: COLORS.FAIL,
          description: 'Insufficient permission; command cancelled.'
        }
      });
    } else if (message.content.includes('clear')) {
      try {
        await xpRepository.update(
          { guildID: message.guild.id, memberID: member.id },
          { xp: null }
        );

        await message.util.send({
          embed: {
            color: COLORS.SUCCESS,
            description: `Successfully reset ${member}'s XP score.`
          }
        });
      } catch (err) {
        console.error(err);

        await message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: `An error occurred while running the command. We apologize for the inconvience. Please try again. \n\nError message: ${err.message}`
          }
        });
      }

      if (message.content.includes('give') && amount) {
        const authorXP = await xpRepository.findOne({ guildID: message.guild.id, memberID: message.author.id });

        if (!isNaN(amount) && authorXP.xp < amount) {
          return message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: 'Insufficient amount; the provided amount exceeds your current XP amount.'
            }
          });
        }

        try {
          const updated = await xpRepository.save([
            { guildID: message.guild.id, memberID: message.author.id, xp: authorXP.xp - amount, level: authorXP.level },
            { guildID: message.guild.id, memberID: message.member.id, xp: memberXP.xp + amount, level: memberXP.level }
          ]);

          await message.util.send({
            embed: {
              color: COLORS.SUCCESS,
              description: `Transferred ${amount} to ${member}. Their current amount: ${updated[1].xp}`
            }
          });
        } catch (err) {
          console.error(err);

          await message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: 'An error occurred while running the command. We apologize for the inconvenience. Please try again.'
            }
          });
        }
      } else if (
        !message.content.toLowerCase().includes('give') &&
                !message.member.permissions.has('MANAGE_GUILD')
      ) {
        return message.util.send({
          embed: {
            color: COLORS.FAIL,
            description: 'Insufficient permission; command cancelled.'
          }
        });
      }

      const options = {
        add: {
          sign: '+',
          statement: ['added', 'to']
        },

        remove: {
          sign: '-',
          statement: ['removed', 'from']
        },

        get rm() { return options.remove; }
      };

      if (
        (message.content.toLowerCase().includes('add') ||
                    ['remove', 'rm'].some(kw => message.content.toLowerCase().includes(kw))) && amount
      ) {
        const argument = message.content.toLowerCase().match(/add|remove|rm/g)[0];

        if (['remove', 'rm'].includes(argument) && amount >= xp.xp) amount = xp.xp;

        try {
          const value = await xpRepository.update(
            { guildID: message.guild.id, memberID: member.id },
            { xp: options[argument]?.sign === '+' ? memberXP.xp + amount : memberXP.xp - amount }
          );

          await message.util.send({
            embed: {
              color: COLORS.SUCCESS,
              description: `Successfully ${options[argument].statement[0]} ${amount}XP ${options[argument].statement[1]} ${member}'s amount. \nThey currently have ${value.raw[0].xp}XP`
            }
          });
        } catch (err) {
          console.error(err);

          await message.util.send({
            embed: {
              color: COLORS.FAIL,
              description: `An unexpected error occurred. We apologize for the inconvience. Please try again. \n\nError message: ${err.message}`
            }
          });
        }
      }
    }
  }
}
