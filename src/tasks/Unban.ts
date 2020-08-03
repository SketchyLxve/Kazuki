import { Snowflake } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLClient } from '../core/structures/NMLClient';
import { UnbanTaskModel } from '../models/tasks/UnbanTasks';

export interface UnbanTaskData {
  time: Date;
  guildID: Snowflake;
  memberID: Snowflake;
}

export class UnbanTask implements UnbanTaskData {
  public client: NMLClient;
  public time: Date;
  public guildID: Snowflake;
  public memberID: Snowflake;
  public timeout: NodeJS.Timeout;

  public constructor(
    client: NMLClient,
    data: UnbanTaskData
  ) {
    const {
      time,
      guildID,
      memberID
    } = data;

    this.client = client;

    this.time = time;

    this.guildID = guildID;

    this.memberID = memberID;
  }

  public execute(id: string | number): UnbanTask {
    const utRepository = getRepository(UnbanTaskModel);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.timeout = setTimeout(async () => {
      await this.client.guilds.cache
        .get(this.guildID)
        .members.unban(this.memberID);

      await utRepository.delete({ id });

      console.log(`[UNBAN]: Successfully removed task #${id} \nAdditionally, unbanned: ${(await this.client.users.fetch(this.memberID)).tag} (${this.memberID})`);
    }, this.time.getTime() - Date.now());

    console.log(`[UNBAN]: Successfully loaded task #${id}`);

    return this;
  }

  public clear() {
    clearTimeout(this.timeout);
  }
}
