import { GuildMember, RoleResolvable, User } from 'discord.js';
import { NMLMessage } from '../../app';
import { BaseCommandData, CommandCategory, PermissionsData } from '../../util/constants';
import { NMLClient } from './NMLClient';

export abstract class BaseCommand {
  public adminOnly?: boolean;
  public aliases?: string[];
  public additionalAliasPrefixes?: string[];
  public additionalArguments?: string[];
  public category?: CommandCategory;
  public configurable?: boolean;
  public description?: string;
  public editable?: boolean;
  public enabled?: boolean;
  public help?: string;
  public name?: string;
  public ownerOnly?: boolean;
  public permissions?: PermissionsData;
  public prefixes?: string[];
  public reaction?: string;
  public roles?: RoleResolvable[];
  public target?: boolean;

  public constructor(data: BaseCommandData) {
    this.adminOnly = data.adminOnly;

    this.aliases = data.aliases ?? [this.name];

    this.additionalAliasPrefixes = data.additionalAliasPrefixes ?? [];

    this.additionalArguments = data.additionalArguments ?? [];

    this.category = data.category;

    this.configurable = data.configurable;

    this.description = data.description ?? '';

    this.editable = data.editable ?? true;

    this.enabled = data.enabled ?? true;

    this.help = data.help ?? '';

    this.name = data.name;

    this.ownerOnly = data.ownerOnly;

    if (data.permissions) {
      this.permissions = {
        user: data.permissions.user ?? [],
        client: data.permissions.client ?? []
      };
    }

    this.prefixes = [...data.prefixes?.filter((e, i) => data.prefixes.indexOf(e) === i) ?? [], 'nml!', 'nml ', 'nml'];

    this.reaction = data.reaction ?? '';

    this.roles = data.roles;

    this.target = data.target;
  }

  public abstract run(client: NMLClient, message: NMLMessage, data: { target?: GuildMember | User }): Promise<any> | any;
}
