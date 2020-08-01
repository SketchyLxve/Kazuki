// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import { Structures } from 'discord.js';
import 'reflect-metadata';
import { NMLClient } from './core/structures/NMLClient';
import { MessageUtil } from './core/util/MessageUtil';

const Struct = Structures.extend('Message', Message => class AbrevioMessage extends Message {
  public util: MessageUtil = new MessageUtil(this);
});

class NMLMessage extends Struct { }

const client = new NMLClient({
  cmdDir: `${__dirname}/commands`,
  partials: ['GUILD_MEMBER', 'USER', 'MESSAGE', 'REACTION', 'CHANNEL']
});

export {
  NMLMessage,
  client
};

