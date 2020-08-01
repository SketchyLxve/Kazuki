import { MessageEmbed } from 'discord.js';
import moment from 'moment';
import { NMLMessage } from '../../app';
import { BaseCommand } from '../../core/structures/BaseCommand';
import { NMLClient } from '../../core/structures/NMLClient';

export class ServerCommand extends BaseCommand {
  public constructor() {
    super({
      aliases: ['si', 'sinfo'],
      category: 'util',
      help: 'si',
      description: 'Displays information about the guild the command has been ran in.',
      prefixes: ['s!', '?', '!'],
      enabled: true,
      editable: true,
      reaction: '🚙'
    });
  }

  public async run(client: NMLClient, message: NMLMessage) {
    const regions = {
      'europe': ':flag_eu: Europe',
      'brazil': ':flag_br: Brazil',
      'hongkong': ':flag_hk: Hong Kong',
      'india': ':flag_in: India',
      'japan': ':flag_jp: Japan',
      'russia': ':flag_ru: Russia',
      'singapore': ':flag_sg: Singapore',
      'southafrica': ':flag_za: South Africa',
      'sydney': ':flag_au: Sydney',
      'us-central': ':flag_us: US Central',
      'us-easy': ':flag_us: US East',
      'us-south': ':flag_us: US South',
      'us-west': ':flag_us: US West'
    };

    const server = new MessageEmbed()
      .setColor('RANDOM')
      .setAuthor(`Information about ${message.guild.name}`, message.guild.iconURL())
      .addField('Created At', moment(message.guild.createdTimestamp).format('LLL'))
      .addField('Member Count', message.guild.memberCount, true)
      .addField('Bots', (await message.guild.members.fetch()).filter(m => m.user.bot).size, true)
      .addField('Users', message.guild.members.cache.filter(m => !m.user.bot).size, true)
      .addField('Server Region', regions[message.guild.region], true)
      .addField('Server Owner', message.guild.owner)
      .addField('Boosters', message.guild.premiumSubscriptionCount ? `${message.guild.premiumSubscriptionCount} boosters` : 'No boosters.', true)
      .setFooter(message.guild.me.displayName, client.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await message.util.send(server);
  }
}
