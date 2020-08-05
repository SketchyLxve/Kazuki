import {
  Guild,
  GuildChannel,
  GuildMember,

  PermissionResolvable,
  Role,
  RoleResolvable,
  Snowflake,
  TextChannel, User
} from 'discord.js';
import { NMLMessage } from '../app';
import { SystemChannel } from '../structures/SystemChannel';

export interface ActionData {
  action: ActionType;
  message: NMLMessage;
  target: GuildMember | User;
  punishment: Punishment | null;
  duration?: number;
  reason?: string;
  role?: Role;
}

export interface ActionHandlerData {
  executor: User;
  target: User;
  type: ActionType;
  data: ActionHandlerTypeData | ActionDemoteData;
  case: number;
  reason: string;
}

export interface ActionHandlerTypeData {
  type: PUNISHMENT | Punishment;
  duration?: number;
}

export interface BaseCommandData {
  adminOnly?: boolean;
  aliases?: string[];
  additionalAliasPrefixes?: string[];
  additionalArguments?: string[];
  category: CommandCategory;
  configurable?: boolean;
  description: string;
  editable?: boolean;
  enabled?: boolean;
  help: string;
  name?: string;
  ownerOnly?: boolean;
  permissions?: PermissionsData;
  prefixes?: string[];
  reaction?: BaseCommandReaction;
  roles?: RoleResolvable[];
  target?: boolean;
}

export interface CategoryData<T> {
  description: string;
  reaction: string;
  name: string;
  data: T[];
}

export interface CommandExample {
  prefix: string;
  keyword: string;
  arg: string;
}

export interface NMLClientOptions {
  cmdDir?: string;
  prefixes?: string[];
}

export interface PermissionsData {
  user?: PermissionResolvable[];
  client?: PermissionResolvable[];
}

export interface PromoteRolesData {
  category: string;
  level: string | number;
  roles: Snowflake[];
  stripExistent?: boolean;
}

export interface SnowflakeEntry {
  snowflake: Snowflake;
  type: 'User' | 'Role' | 'Guild' | 'GuildChannel' | null;
  data: Role | User | Guild | GuildChannel | null;
  isError: boolean;
}

export interface SnowflakeErr {
  snowflake: Snowflake;
  desc: string;
  isError: boolean;
}

export interface SystemChannelDeleteError {
  error: Error;
  isError: boolean;
  type: 'Missing Data' | 'Partial Data';
}

export interface SystemChannelDeleteSuccess {
  isError: boolean;
  data: SystemChannel;
}

export interface SystemChannelOptions {
  category: string;
  id: Snowflake;
  name: string;
  data?: TextChannel;
}

export enum ACTION_COLORS {
  BAN = 16776960,
  BLACKLIST = 9498256,
  KICK = 16753920,
  MUTE = 8900331,
  UNBAN = 3329330,
  UNMUTE = 3329330,
  PARTIAL_DEMOTE = 10192652,
  FULL_DEMOTE = 1447453,
  SOFTBAN = ACTION_COLORS.BAN,
  TEMPBAN = ACTION_COLORS.BAN
}

export enum ACTION_TYPE {
  BAN = 'ban',
  BLACKLIST = 'blacklist',
  KICK = 'kick',
  MUTE = 'mute',
  UNBAN = 'unban',
  UNMUTE = 'unmute',
  PROMOTE = 'promote',
  PARTIAL_DEMOTE = 'partial demote',
  FULL_DEMOTE = 'full demote'
}

export enum COLORS {
  CANCEL = 5592405,
  FAIL = 16724787,
  PROCESSING = 16753920,
  TRIGGER = 16776960,
  SUCCESS = 43878
}

export enum PUNISHMENT {
  NORMAL = 'NORMAL',
  SOFT = 'SOFT',
  TEMP = 'TEMP',
  MUTE = 'MUTE',
  HARD = 'HARD',
  KICK = 'KICK',
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
}

export type ActionType = 'ban' | 'blacklist' | 'tempban' | 'softban' | 'kick' | 'mute' | 'unmute' | 'unban' | 'promote' | 'partial demote' | 'full demote' | 'fd' | 'pd';

export type ActionDemoteData = Omit<ActionHandlerTypeData & { demoteCategory: string }, 'duration'>;

export type BaseCommandReaction = '⚒️' | '🛡️' | '💵' | '❓' | '💻' | '🚙';

export type CommandCategory = 'admin' | 'mod' | 'misc' | 'economy' | 'system' | 'util';

export type KickData = Omit<ActionData, 'duration'>;

export type Punishment = 'NORMAL' | 'SOFT' | 'TEMP' | 'KICK' | 'HARD' | 'MUTE' | 'FULL' | 'PARTIAL';

export const timeRegex = {
  captureNums: /(?:(?<=-{1,2}(time|t)=")|)((\d{1,2}(h|d|w|y|m|s)|\d{1,2} (days?|hours?|minutes?|years?|weeks?|seconds?)) ?(\d{1,2}(h|d|w|y|m|s)|\d{1,2} (days?|hours?|minutes?|years?|weeks?|seconds?))?)+(?=")?/g,
  captureAll: /(?:-{1,2}(time|t)="|)((\d{1,2}(h|d|w|y|m|s)|\d{1,2} (days?|hours?|minutes?|years?|weeks?|seconds?)) ?(\d{1,2}(h|d|w|y|m|s)|\d{1,2} (days?|hours?|minutes?|years?|weeks?|seconds?))?)+(?:"|)/g
};

export const allFlags = /-{1,2}\w+=?(".*"|[a-zA-Z0-9]+)/g;

export const allMentions = /(<(@!?)(@&)?(#)?)?\d{17,18}>?\s?/g;

export const configOption = {
  remove: /-|rm|remove|disable/,
  add: /\+-?|insert|add|update/
};

export const linkRegex = /((?<=-{1,2}(l(ink)?)='))?https?:\/\/.*[^ \n]+(?='|\s{1}|)/g;

export const rgx = /(-{1,2}(lvl|level)=?)\d{1,2}|^\d{1,2}/g;

export const cmds = /(?<=\[)(\w+( ?)\w+)+(?=\])|(?<=\[)(\w+(; ?)\w+)+(?=\])|(?<=\[)(\w+(, ?)?\w+)+(?=\])/g;

export const targetRegex = /(?<=-{1,2}(id|target|member|m|t)=("|“))\d{17,18}(?="|”)|(?<=-{1,2}(id|target|member|m|t)=)\d{17,18}|(?<=-{1,2}(id|target|member|m|t)=("|“)<@!?)\d{17,18}(?=>("|”))|(?<=blacklist )\d{17,18}|(?<=blacklist <@!?)\d{17,18}(?=>)|(?<=(delete|del|remove|rm) )\d{17,18}|(?<=(delete|del|remove|rm) <@!?)\d{17,18}(?=>)/g;

export const delRegex = /remove|rm|del|delete/;
