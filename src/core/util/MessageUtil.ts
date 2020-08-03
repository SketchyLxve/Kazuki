import {
  APIMessage,
  Message,

  MessageEmbed, MessageOptions,


  TextChannel
} from 'discord.js';
import { NMLMessage } from '../../app';
import { NMLClient } from '../structures/NMLClient';

export class MessageUtil {
  public message: NMLMessage;
  public _responses: NMLMessage[];
  public client: NMLClient;

  public constructor(message: NMLMessage) {
    this.message = message;
    this.client = message.client as NMLClient;
    this._responses = [];
  }

  public async send(content: string | MessageEmbed | MessageOptions, options?: MessageOptions): Promise<Message | Message[]> {
    const combinedOptions = APIMessage.transformOptions(content, options);

    if ('files' in combinedOptions) return this.message.channel.send(combinedOptions);

    const _messages = new APIMessage((this.message.channel as TextChannel), combinedOptions).resolveData().split()
      .map(mes => {
        if (!(mes.data as any).embed) (mes.data as any).embed = null;
        if (!(mes.data as any).content) (mes.data as any).content = null;
        return mes;
      });

    const responses = this._responses.filter(msg => !msg.deleted);
    const promises = [];
    const max = Math.max(_messages.length, responses.length);

    for (let i = 0; i < max; i++) {
      if (i >= _messages.length) await responses[i].delete();
      else if (responses.length > i) promises.push(responses[i].edit(_messages[i]));
      else promises.push(this.message.channel.send(_messages[i]));
    }

    const _new = await Promise.all(promises);

    this._responses = _messages.map((_, i) => responses[i] || _new[i]);

    return _new.length === 1 ? _new[0] : _new;
  }

  public async parseSnowflake(content: string, checkType = true, getData = true) {
    const snowflakes = content.match(/[0-9]{17,18}/g);

    if (!snowflakes) return null;

    const snowflakeStore = [];

    const type = {
      check: id => {
        if (this.client.guilds.cache.get(id)) return 'guild';

        else if (this.client.users.cache.has(id)) return 'user';

        else if (this.client.channels.cache.has(id)) return 'channel';

        else if (this.client.guilds.cache.some(g => g.roles.cache.has(id))) return 'roles';
      },

      guild: {
        name: 'Guild',
        data: id => this.client.guilds.cache.get(id)
      },

      user: {
        name: 'User',
        data: id => this.client.users.fetch(id)
      },

      channel: {
        name: 'GuildChannel',
        data: id => this.client.channels.fetch(id)
      },

      roles: {
        name: 'Roles',
        data: id => this.client.guilds.cache.find(g => g.roles.cache.has(id)).roles.fetch(id)
      }
    };

    for (const snowflake of snowflakes) {
      const snowflakeEntry = {};

      const check = await type.check(snowflake);

      Object.assign(snowflakeEntry, {
        snowflake: snowflake,
        type: checkType ? await type[check].name : null,
        data: getData ? await type[check].data(snowflake) : null
      });

      (snowflakeStore).push(
        Object.keys(snowflakeEntry).length
          ? snowflakeEntry
          : {
            snowflake: snowflake, desc: 'Client couldn\'t resolve this snowflake.'
          }
      );
    }

    return snowflakeStore || null;
  }
}
