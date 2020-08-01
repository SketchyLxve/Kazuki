import {
  Client,
  ClientOptions,
  Collection,
  GuildMember,
  Message, MessageEmbed, Snowflake, User
} from 'discord.js';
import * as fs from 'fs';
import { createConnection, getConnectionOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { NMLMessage } from '../../app';
import { EconomyHandler } from '../../handlers/EconomyHandler';
import { Blacklist } from '../../models/configuration/Blacklists';
import { Activity } from '../../models/economy/TextActivity';
import { VCActivity } from '../../models/economy/VCActivity';
import { Guild } from '../../models/general/Guild';
import { MuteTaskModel } from '../../models/tasks/MuteTasks';
import { UnbanTaskModel } from '../../models/tasks/UnbanTasks';
import { parseSnowflake } from '../../parsers/SnowflakeParser';
import { MuteTask as MuteTaskInstance } from '../../tasks/Mute';
import { UnbanTask as UnbanTaskInstance } from '../../tasks/Unban';
import { COLORS, NMLClientOptions } from '../../util/constants';
import { BaseCommand } from './BaseCommand';
// import { SystemChannelManager } from '../../managers/SystemChannelManager';

export class NMLClient extends Client {
  public commands: Collection<string, BaseCommand>;
  public options: ClientOptions;
  public prefixes: string[];
  public tasks: Collection<string, MuteTaskInstance | UnbanTaskInstance>;
  public cmdDir?: string;
  protected embed: MessageEmbed = new MessageEmbed();

  public constructor(options: ClientOptions & NMLClientOptions) {
    super(options);

    this.cmdDir = options.cmdDir;

    this.prefixes = options.prefixes ?? [];

    this.commands = new Collection();

    this.tasks = new Collection();

    this.channels.system = new Collection();

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.init();
  }

  public parsePatterns(content: string, patterns: RegExp[], ensureGlobal = false) {
    const matched = [];
    patterns = patterns.map(p => {
      if (!p.global && ensureGlobal) return new RegExp(`${p.source}`, `g${p.flags ?? ''}`);

      return p;
    });

    for (const pattern of patterns.flat()) {
      const match = content.match(pattern);
      matched.push(
        match?.length > 0
          ? match[0]
          : null
      );
    }

    return matched;
  }

  public startsWithPrefix(prefixes: string[] | string, message: Message) {
    if (typeof prefixes === 'string') prefixes = [prefixes];

    return prefixes.some(prefix =>
      message.content
        .toLowerCase()
        .split(' ')[0]
        .startsWith(prefix.toLowerCase()));
  }

  public async init() {
    await this.loadRecursively(this.cmdDir)
      .then(() => this.setup());
  }

  public async loadRecursively(dir: string) {
    const cmdDir = fs.readdirSync(dir);

    for (const res of cmdDir) {
      const stat = fs.statSync(`${dir}/${res}`);

      if (stat.isDirectory()) {
        await this.loadRecursively(`${dir}/${res}`);
        continue;
      }

      const command = new ((req => req.default || req[Object.keys(req)[0]])(
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require(`${dir}/${res}`)
      ))() as BaseCommand;

      if (!command.name) Object.assign(command, { name: res.split('.')[0] });

      command.aliases.push(command.name);

      !this.commands.has(command.name) && this.commands.set(command.name, command);

      console.log(`[COMMAND]: Successfully loaded ${res}`);
    }
  }

  public async setup() {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.login(process.env.TOKEN);

    const connection = await createConnection({
      ...(await getConnectionOptions(process.env.NODE_ENV)),
      name: 'default',
      namingStrategy: new SnakeNamingStrategy()
    });

    if (connection) console.log(`[TYPEORM]: Established a successful connection to the database.`);

    return this.once('ready', async () => {
      console.log(`[DISCORD]: Established a successful WS connection to Discord's gateway.`);

      // All the repositories (tables); quite messy.
      const guildRepository = connection.getRepository(Guild);
      const activityRepository = connection.getRepository(Activity);
      const vcRepository = connection.getRepository(VCActivity);
      const mtRepository = connection.getRepository(MuteTaskModel);
      const btRepository = connection.getRepository(UnbanTaskModel);

      // Loop over all guilds.
      for (const [id, guild] of this.guilds.cache) {
        // Insert new guild instance if none is found.
        if (!(await guildRepository.findOne({ guildID: id }))) {
          await guildRepository.save({
            guildID: id,
            ownerID: guild.ownerID,
            memberCount: guild.memberCount,
            prefixes: ['nml!', 'nml', 'nml ']
          } as Guild);
        }

        // Loop over all members in the guild
        for (const [_id] of (await guild.members.fetch())) {
          // Insert new text activity instance if none is found.
          if (!(await activityRepository.findOne({ guildID: id, memberID: _id }))) {
            await activityRepository.save({
              guildID: id,
              memberID: _id,
              activityLevel: 0,
              currentMessages: 1,
              allMessages: 1
            } as Activity);
          }

          // Insert new VC activity instance if none is found.
          if (!(await vcRepository.findOne({ guildID: id, memberID: _id }))) {
            await vcRepository.save({
              guildID: id,
              memberID: _id,
              activityLevel: 0,
              currentHours: 0,
              allHours: 0
            } as VCActivity);
          }
        }
      }

      // Instantiate economy handler for future usage.
      (await new EconomyHandler(this)
        .handleTextActivity())
        .handleVoiceActivity();

      // Loop over the mute & unban tasks repository and instantiate the handlers with the new data if available.

      for (const task of (await mtRepository.find())) {
        const taskInstance = new MuteTaskInstance(this, task);

        await taskInstance.execute(task.id);

        this.tasks.set(task.id.toString(), taskInstance);
      }

      for (const unban of (await btRepository.find())) {
        const unbanInstance = new UnbanTaskInstance(this, unban);

        await unbanInstance.execute(unban.id);

        this.tasks.set(unban.id.toString(), unbanInstance);
      }

      this.on('message', async (message: NMLMessage) => {
        if (message.author.bot) return;

        if (
          !message.content.split(' ')[0].match(/https?:\/\/.*[^ \n]+(?= )|([A-Za-z]+)?(?:!|\?|\$|@|#|=|-|;|>|:|<|,|\.|%|\^|&|\*|\+|_)+|nml ?[a-zA-Z]?/g) &&
          message.guild
        ) return this.emit('normalMessage', message);

        await this.handle(message);
      });

      this.on('messageUpdate', async (o: NMLMessage, n: NMLMessage) => {
        if (n.partial) await n.fetch();
        if (!o.partial && o.content === n.content) return;

        await this.handle(n);
      });
    });
  }

  public async handle(message: NMLMessage) {
    const find = await this.findCommand(message) as { command: BaseCommand; prefixLess: NMLMessage } | null;
    const { command = null, prefixLess } = find || {};

    const blacklists = Blacklist;
    const blacklist = await blacklists.findOne({ memberID: message.author.id });

    if (!command) return;

    if (
      blacklist && (blacklist.global ||
        blacklist.guildID && blacklist.guildID === message.guild.id)
    ) {
      if (blacklist.commands.length && blacklist.commands.some(c => command.aliases.includes(c.toLowerCase()))) return;
      else if (blacklist.restricted) return;
    }

    let target;
    const isConfig = message.content.toLowerCase().includes('config') && command.configurable;
    if (command.target) target = await this.extract(this, message, { configurable: isConfig, onlySnowflake: false });
    const isntOwner = message.author.id !== message.guild.ownerID;

    try {
      if (
        command.permissions?.user && !command.permissions?.user?.some?.(permission => message.member.permissions.has(permission)) && isntOwner ||
        command.adminOnly && !message.member.permissions.has('ADMINISTRATOR') && isntOwner ||
        command.ownerOnly && isntOwner
      ) {
        this.embed
          .setColor(COLORS.FAIL)
          .setDescription('Insufficient permission.');
      }

      if (
        message.author.bot ||
        !message.guild ||
        !command.enabled ||
        command?.target && !target && !isConfig ||
        command.permissions?.client.length && !command.permissions?.client?.some(permission => message.guild.me.permissions.has(permission)) && isntOwner ||
        command.permissions?.user.length && !command.permissions?.user?.some(p => message.member.permissions.has(p)) && isntOwner ||
        command.adminOnly && !message.member.permissions.has('ADMINISTRATOR') ||
        command.ownerOnly && isntOwner ||
        command.roles?.length && !command.roles.some((role: Snowflake) => message.member.roles.cache.has(role)) ||
        !command.editable && message.editedTimestamp
      ) {
        return this.embed.description ? message.channel.send({ embed: this.embed }) : null;
      }

      await command.run(this, prefixLess, target ? { target } : {});
    } catch (e) { console.log(e); }
  }

  public findCommand(message: NMLMessage) {
    const sorted = this.commands.sort((b, a) => a.additionalArguments.length - b.additionalArguments.length);

    let foundCommand;

    const first = this.iterate(message, foundCommand, sorted);

    if (first) foundCommand = first;
    else foundCommand = this.iterate(message, foundCommand, sorted);

    if (
      !foundCommand ||
      foundCommand.prefixes?.length && !foundCommand.prefixes?.some(prefix => message.content.toLowerCase().split(' ')[0].startsWith(prefix.toLowerCase()))
    ) return null;

    return foundCommand;
  }

  public iterate(message: NMLMessage, found, commands: Collection<string, BaseCommand>) {
    if (message.author.bot) return;
    for (const [, command] of commands) {
      if (found) break;

      const prefix = command.prefixes.find(p => message.content.startsWith(p));
      const prefixLess = Object.assign(Object.create(Object.getPrototypeOf(message)), message) as NMLMessage;

      prefixLess.content = prefixLess.content.replace(prefix, '');

      if (
        (command.additionalAliasPrefixes.length
          ? command.additionalAliasPrefixes.some(
            alias => prefixLess.content.split(' ')[0]?.replace(/ +/, '') === alias.toLowerCase()
          )
          : true) &&
        (command.additionalArguments.length
          ? command.additionalArguments.some(
            arg => prefixLess.content.split(' ').slice(1)[command.additionalAliasPrefixes?.length ? 1 : 0]?.replace(/ +/, '') === arg.toLowerCase()
          )
          : true) &&
        command.aliases.some(
          alias =>
            prefixLess.content.toLowerCase().split(' ')[command.additionalAliasPrefixes?.length ? 1 : 0].replace(/ +/, '') === alias.toLowerCase()
        )
      ) {
        found = command;
        return {
          command: found,
          prefixLess
        };
      }
      continue;
    }
  }

  public async extract(
    client: NMLClient,
    message: NMLMessage,
    { configurable = false, asUser = false, onlySnowflake }: { configurable?: boolean; asUser?: boolean; onlySnowflake?: boolean }
  ): Promise<GuildMember | User | string | null> {
    if (configurable && RegExp(/conf(ig)?/g).exec(message.content)) return;

    const [snowflake] = await parseSnowflake(client, message.content, { checkType: false, getData: false });

    if (snowflake.isError) {
      this.embed
        .setColor(COLORS.FAIL)
        .setDescription('Missing `{member}` argument');

      return null;
    }

    if (onlySnowflake) return snowflake.snowflake;

    try {
      const target = await (!asUser ? message.guild.members.fetch(snowflake.snowflake) : this.users.fetch(snowflake.snowflake));

      return target;
    } catch {
      return null;
    }
  }

  public validate(content: string): string {
    const replacement = {
      '$': '\\$',
      '^': '\\^',
      '?': '\\?',
      '.': '\\.',
      '*': '\\*',
      '+': '\\+'
    };

    return content
      .split('')
      .map(e => replacement[e] ? replacement[e] : e)
      .join('');
  }
}
