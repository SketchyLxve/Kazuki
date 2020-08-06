import { Collection, PermissionOverwrites, User } from 'discord.js';

export interface ChannelData {
  id: string;
  name: string;
  guildID: string;
  guildName: string;
  permissions: Collection<string, PermissionOverwrites>;
}

export interface BanData {
  guildID: string;
  guildName: string;
  userID: string;
  userTag: string;
  executedBy?: User;
}

export type UserActionData =
  | ChannelData
  | BanData;

export type UserActionType =
  | 'Channel Delete'
  | 'Channel Create'
  | 'Channel Update'
  | 'Ban Add'
  | 'Ban Remove'
  | 'Emoji Create'
  | 'Emoji Remove'
  | 'Guild Update'
  | 'Invite Create'
  | 'Invite Delete'
  | 'Message Delete'
  | 'Message Update'
  | 'Role Create'
  | 'Role Delete'
  | 'Role Update'
  | 'VC Update';
