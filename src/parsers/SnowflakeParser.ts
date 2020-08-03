import { NMLClient } from '../core/structures/NMLClient';
import { SnowflakeEntry, SnowflakeErr } from '../util/constants';

export async function parseSnowflake(
  client: NMLClient,
  content: string,
  options: { checkType: boolean; getData: boolean } = { checkType: true, getData: true }
): Promise<(SnowflakeEntry | SnowflakeErr)[]> {
  const snowflakes = content.match(/[0-9]{17,18}/g);
  const snowflakeStore = [];

  if (!snowflakes) {
    return [
      {
        snowflake: null,
        desc: 'No snowflakes provided.',
        isError: true
      }
    ];
  }

  const type = {
    check: id => {
      if (client.guilds.cache.get(id)) return 'guild';

      else if (client.users.cache.has(id)) return 'user';

      else if (client.channels.cache.has(id)) return 'channel';

      else if (client.guilds.cache.some(g => g.roles.cache.has(id))) return 'role';
    },

    guild: {
      name: 'Guild',
      data: id => client.guilds.cache.get(id)
    },

    user: {
      name: 'User',
      data: id => client.users.fetch(id)
    },

    channel: {
      name: 'GuildChannel',
      data: id => client.channels.fetch(id)
    },

    roles: {
      name: 'Role',
      data: id => client.guilds.cache.find(g => g.roles.cache.has(id)).roles.fetch(id)
    }
  };

  for (const snowflake of snowflakes) {
    const snowflakeEntry = {};

    let check;

    try {
      check = await type.check(snowflake);
    } catch {}

    let data;

    try {
      data = await type[check]?.data(snowflakes);
    } catch {}

    Object.assign(snowflakeEntry, {
      snowflake: snowflake,
      type: options.checkType ? type[check]?.name : null,
      data: options.getData ? data : null,
      isError: false
    });

    (snowflakeStore).push(
      Object.keys(snowflakeEntry).length
        ? snowflakeEntry as SnowflakeEntry
        : {
          snowflake: snowflake,
          desc: 'Client couldn\'t resolve this snowflake.',
          isError: true
        }
    );
  }

  return snowflakeStore || null;
}
