import { Snowflake } from 'discord.js';
import { getRepository, Repository } from 'typeorm';
import { Activity } from '../models/economy/TextActivity';
import { VCActivity } from '../models/economy/VCActivity';

interface SweepData {
  time: Date;
  guildID: Snowflake;
  memberID: Snowflake;
  type: 'text' | 'vc';
}

export class SweepTask {
  public timeout: NodeJS.Timeout;
  public time: Date;
  public guildID: Snowflake;
  public memberID: Snowflake;
  public type: 'text' | 'vc';
  public sweeping: boolean;

  public constructor(data: SweepData) {
    this.time = data.time;

    this.guildID = data.guildID;

    this.memberID = data.memberID;

    this.type = data.type;

    this.sweeping = false;
  }

  public async sweep(time: number) {
    const activityRepository: Repository<Activity | VCActivity> = getRepository(this.type === 'text' ? Activity : VCActivity) as Repository<VCActivity | Activity>;
    const activity = await activityRepository.findOne({ guildID: this.guildID, memberID: this.memberID });
    const current = this.type === 'text' ? 'currentMessages' : 'currentHours';
    const all = this.type === 'text' ? 'allMessages' : 'allHours';

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.timeout = setTimeout(async () => {
      activity.activityLevel = 0;
      activity[current] = 0;
      activity[all] = (activity[all] as number) + (activity[current] as number);

      await activityRepository.save(activity);
    }, this.time.getTime() - time);

    this.sweeping = true;
  }

  public stop() {
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  public reset() {
    this.time = new Date(this.time.getTime() + 432000000);
  }
}
