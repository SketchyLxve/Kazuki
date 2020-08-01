import { Collection } from 'discord.js';
import { getRepository } from 'typeorm';
import { NMLMessage } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { Activity } from '../models/economy/TextActivity';
import { VCActivity } from '../models/economy/VCActivity';
import { XP } from '../models/economy/XP';
import { SweepTaskModel } from '../models/tasks/SweepTasks';
import { SweepTask } from '../tasks/Sweep';

export class EconomyHandler {
  public client: NMLClient;
  public messages: Collection<string, NMLMessage>;
  public users: Set<string>;
  public sweepers: Collection<string, Omit<SweepTaskModel, 'id'> & { task: NodeJS.Timeout }>;

  public constructor(client: NMLClient) {
    this.client = client;

    this.messages = new Collection();

    this.users = new Set();

    this.sweepers = new Collection();

    setInterval(async () => {
      if (this.messages.size) {
        const activityRepository = getRepository(Activity);
        const sweeper = getRepository(SweepTaskModel);

        for (const [, message] of this.messages) {
          const guildID = message.guild.id;
          const targetID = message.author.id;
          const activity = await activityRepository.findOne({ guildID, memberID: targetID });

          const current = await sweeper.findOne({ guildID, targetID });
          if (current) continue;

          const sweep = await sweeper.save({
            guildID,
            targetID,
            time: new Date(Date.now() + 432000000)
          });

          this.sweepers.set(sweep.id, {
            ...sweep,
            task: setTimeout(async () => {
              await activityRepository.update(
                { guildID, memberID: targetID },
                {
                  activityLevel: 0,
                  currentMessages: 0,
                  allMessages: activity.allMessages + activity.currentMessages,
                  messageID: message.id,
                  channelID: message.channel.id
                }
              );

              this.sweepers.delete(sweep.id);
            }, 432000000)
          });

          this.messages.delete(message.id);
          continue;
        }
      }
    }, 50000);
  }

  public calculate(activityLevel: number, type: 'text' | 'vc') {
    const xp = {
      text: {
        0: [
          [25, 40],
          [15, 30]
        ],
        1: [
          [50, 75],
          [40, 60]
        ],
        2: [
          [100, 125],
          [80, 100]
        ],
        3: [
          [150, 175],
          [100, 120]
        ],
        4: [
          [300, 350],
          [225, 250]
        ],
        5: [
          [500, 750],
          [400, 600]
        ]
      },

      vc: {
        0: [
          [40, 70],
          [30, 50]
        ],
        1: [
          [60, 90],
          [50, 75]
        ],
        2: [
          [120, 140],
          [100, 115]
        ],
        3: [
          [165, 190],
          [150, 175]
        ],
        4: [
          [340, 390],
          [300, 340]
        ],
        5: [
          [600, 900],
          [350, 700]
        ]
      }
    };

    return {
      xp: Math.floor((Math.random() * ((xp[type][activityLevel][0][1] as number) - (xp[type][activityLevel][0][0]))) + (xp[type][activityLevel][0][0] as number)),
      bal: Math.floor((Math.random() * ((xp[type][activityLevel][1][1] as number) - (xp[type][activityLevel][1][0]))) + (xp[type][activityLevel][1][0] as number))
    };
  }

  public handleTextActivity() {
    this.client.on('normalMessage', async (message: NMLMessage) => {
      if (message.author.bot) return;

      const uniqueID = message.author.id + message.guild.id;

      if (!this.messages.has(uniqueID)) // eslint-disable-line
        this.messages.set(uniqueID, message);

      const activityRepository = getRepository(Activity);
      const xpRepository = getRepository(XP);

      const required = {
        0: 1000,
        1: 2500,
        2: 4000,
        3: 6000,
        4: 7500
      };

      const guildID = message.guild.id;
      const memberID = message.author.id;
      const criteria = { guildID, memberID };
      const activity = await activityRepository.findOne({ guildID, memberID });
      const xp = await xpRepository.findOne({ guildID, memberID });

      if (!activity) {
        await activityRepository.save({
          guildID: message.guild.id,
          memberID: message.author.id,
          lastPosted: message.createdAt,
          messageID: message.id,
          channelID: message.channel.id,
          activityLevel: 0,
          currentMessages: 1,
          allMessages: 1
        } as Activity);
      }

      if (!this.users.has(uniqueID)) {
        this.users.add(uniqueID);

        setTimeout(() => this.users.delete(uniqueID), 20000);

        const { xp: x } = this.calculate(activity?.activityLevel ?? 0, 'text');

        await activityRepository.increment(criteria, 'currentMessages', 1);


        if (!xp) {
          await xpRepository.save({
            guildID,
            memberID,
            xp: x,
            level: 1
          });
        } else {
          xp.xp += x;
          await xpRepository.save(xp);
        }
      }

      if (activity?.activityLevel === 5) return;

      if (required[activity?.activityLevel] <= activity?.currentMessages ?? 0 + 1) {
        const msg = await message.channel.send(`⬆️ | Level up! Current level: ${activity?.activityLevel + 1}`);
        await activityRepository.increment(criteria, 'activityLevel', 1);
        await msg.delete({ timeout: 5000 });
      }
    });

    return this;
  }

  public handleVoiceActivity() {
    this.client.on('voiceStateUpdate', async (o, n) => {
      const vcRepository = getRepository(VCActivity);
      const xpRepository = getRepository(XP);
      const member = await vcRepository.findOne({ guildID: n.guild.id, memberID: n.member.id });

      if (!member) {
        return vcRepository.save({
          guildID: n.guild.id,
          memberID: n.member.id,
          lastJoined: new Date(),
          activityLevel: 1,
          currentHours: 0,
          allHours: 0
        } as VCActivity);
      }

      const sweepTask = new SweepTask({
        time: new Date(Date.now() + 432000000),
        guildID: n.guild.id,
        memberID: n.member.id,
        type: 'vc'
      });

      const giveXp = async () => {
        const { xp } = this.calculate(member.activityLevel, 'vc');

        if (!(await xpRepository.findOne({ guildID: n.guild.id, memberID: n.member.id }))) {
          await xpRepository.save({
            guildID: n.guild.id,
            memberID: n.member.id,
            xp,
            level: 1
          } as XP);
        } else {
          await xpRepository.increment({ guildID: n.guild.id, memberID: n.member.id }, 'xp', 1);
        }
      };

      let handle: NodeJS.Timeout;

      if (n.channel && !n.mute) {
        if (sweepTask.sweeping) sweepTask.stop();

        member.lastJoined = new Date();

        await vcRepository.save(member);

        handle = setInterval(giveXp, 1200000);
      }

      if (n.channel && n.mute && member.lastJoined) {
        member.allHours += (Date.now() - member.lastJoined.getTime());
        member.currentHours = Date.now() - member.lastJoined.getTime();
        member.lastJoined = null;

        await vcRepository.save(member);
      }

      if (o.channel && !n.channel) {
        await sweepTask.sweep(Date.now());
        clearInterval(handle);
      }
    });

    return this;
  }
}
