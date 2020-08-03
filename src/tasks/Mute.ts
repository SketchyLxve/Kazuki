import { RoleResolvable } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLClient } from '../core/structures/NMLClient';
import { MuteRole } from '../models/moderation/MuteRoles';
import { MuteTaskModel } from '../models/tasks/MuteTasks';

interface MuteTaskData {
  time: Date;
  guildID: string;
  memberID: string;
  roles: RoleResolvable[];
}

export class MuteTask implements MuteTaskData {
  public client: NMLClient;
  public time: Date;
  public guildID: string;
  public memberID: string;
  public roles: RoleResolvable[];
  public timeout: NodeJS.Timeout;

  public constructor(
    client: NMLClient,
    data: MuteTaskData
  ) {
    const {
      time,
      guildID,
      memberID,
      roles
    } = data;

    this.client = client;

    this.time = time;

    this.guildID = guildID;

    this.memberID = memberID;

    this.roles = roles;
  }

  public execute(id: string | number) {
    const mtRepository = getRepository(MuteTaskModel);
    const mrRepository = getRepository(MuteRole);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.timeout = setTimeout(async () => {
      const member = await this.client.guilds.cache
        .get(this.guildID)
        .members.fetch(this.memberID);

      await member.roles.set(this.roles)
        .then(() => member.send(`Unmuted from ${this.client.guilds.cache.get(this.guildID).name}. \n**Reason**: Mute duration expired.`))
        .catch(() => console.error(`Unable to modify roles for ${member.displayName} (${member.id})`));

      await mtRepository.delete({ id })
        .then(async () =>
          console.log(`[UNMUTE]: Successfully removed task #${id} from the tasks table. \nAdditionally, unmuted: ${(await this.client.guilds.cache.get(this.guildID).members.fetch(this.memberID)).displayName} (${this.memberID})`));

      await mrRepository.delete({ memberID: member.id })
        .then(() => console.log(`[UNMUTE]: Successfully removed ${member.user.tag}'s (${member.id}) roles from the database in [guild]: ${member.guild.name} (${member.guild.id})`));
    }, this.time.getTime() - Date.now());

    console.log(`[UNMUTE]: Successfully loaded task #${id}`);
  }

  public clear() {
    clearTimeout(this.timeout);
  }
}
