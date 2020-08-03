import { NMLMessage } from '../app';
import { SystemChannel } from '../structures/SystemChannel';

declare module 'discord.js' {
  interface ClientEvents {
    'normalMessage': [NMLMessage];
  }

  interface ChannelManager {
    system: Collection<string, SystemChannel>;
  }
}
