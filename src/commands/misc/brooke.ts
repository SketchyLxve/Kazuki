import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLMessage } from '../../app';
import { MessageEmbed } from 'discord.js';
import { NMLClient } from '../../core/structures/NMLClient';
import { COLORS } from '../../util/constants';

export class BrookeCommand extends BaseCommand {
  public constructor() {
    super({
      name: 'brooke',
      aliases: ['kenny', 'brook', 'ken', 'kenneth'],
      category: 'misc',
      description: 'Only Brooke can use this command. They know what it is used for.',
      help: 'They know how to use it :)',
      prefixes: ['b!', 'k!', '?', '!'],
      reaction: '❓'
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    if (!['454171075174203393', '575108662457139201'].some(id => id === message.author.id)) return;

    const brooke = new MessageEmbed()
      .setColor(COLORS.SUCCESS)
      .setDescription(process.env.ARGUMENT);

    try {
      await message.member.send(brooke)
        .then(() => message.util.send('Successfully sent the message to Brooke.'));
    } catch {
      await message.util.send('Unable to send a message to this member. So the message will be sent in here.', { embed: brooke });
    }
  }
}
