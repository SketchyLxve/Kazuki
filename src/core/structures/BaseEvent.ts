import { ClientEvents } from 'discord.js';
import { client } from '../../app';
import { BaseEventData } from '../../util/constants';
import { NMLClient } from './NMLClient';

export abstract class BaseEvent {
  protected client: NMLClient = client;
  public event: keyof ClientEvents;
  public type: 'on' | 'once';

  protected constructor(data: BaseEventData) {
    const { event, type } = data;

    this.event = event;
    this.type = type;
  }

  public abstract exec(...args: any[] extends (infer R)[] ? R : any): Promise<any>;
}
