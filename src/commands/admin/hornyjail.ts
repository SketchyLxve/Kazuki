import { GuildMember } from "discord.js";
import { getRepository } from "typeorm";
import MuteAction from "../../actions/Mute";
import { NMLMessage } from "../../app";
import { BaseCommand } from "../../core/structures/BaseCommand";
import { NMLClient } from "../../core/structures/NMLClient";
import { HornyJailMember } from "../../models/administration/HornyJailMembers";
import { COLORS } from "../../util/constants";
import ms from 'ms';
import parseDate from "../../parsers/DateParser";

export default class HornyjailCommand extends BaseCommand {
    private repo = getRepository(HornyJailMember);

    protected constructor() {
        super({
            name: 'hornyjail',
            aliases: ['horny jail'],
            target: false,
            prefixes: ['?'],
            description: 'Puts all the owners of `Horny Housewives` into horny jail.',
            help: 'hornyjail [--time=N?]',
            reaction: '⚒️',
            category: 'admin',
            configurable: true
        });
    }

    public async run(client: NMLClient, message: NMLMessage) {
        if (message.content.match(/conf(ig)?/g)?.length) return this.config(client, message);

        const members = await this.repo.find({ guildID: message.guild.id });
        let t;

        if (message.content.match(/--time=/g)?.length)
            t = parseDate(message.content);

        if (!members.length)
            return message.util!.send({
                embed: {
                    color: COLORS.FAIL,
                    description: 'No members to mute. Please add members.'
                }
            });

        for (const member of members)
            await new MuteAction(client, {
                message,
                reason: 'Horny Jail',
                target: await message.guild.members.fetch(member.id),
                action: 'mute',
                duration: t?.total ? t.total : 180000,
                punishment: 'MUTE'
            }).commit();

    }

    public async config(client: NMLClient, message: NMLMessage) {
        const [
            add,
            remove,
            name
        ] = client.parsePatterns(
            message.content,
            [
                /add|\+|insert/g,
                /remove|rm|-|del|delete/g,
                /(?<=conf (\w+|-|\+) ((<@!?)?\d{18}>? ?) ?)\w+/g
            ]
        );

        if (!add && !remove)
            return message.util!.send('Please provide a valid argument. \n\nValid arguments are: `add`, `+`, `insert`, `remove`, `rm`, `-`, `del`, `delete`');

        if (add && !remove) {
            const member = await client.extract(client, message, {}) as GuildMember;
            const entry = await this.repo.findOne({
                where: [
                    { id: member?.id, guildID: message.guild.id },
                    { name, guildID: message.guild.id }
                ],
            });

            if (entry)
                return message.util!.send({
                    embed: {
                        color: COLORS.FAIL,
                        description: `Entry already exists.`
                    }
                });

            try {
                await this.repo.save({
                    name: name?.toLowerCase(),
                    id: member.id,
                    guildID: message.guild.id
                });

                return message.channel.send({
                    embed: {
                        color: COLORS.SUCCESS,
                        description: `Successfully added ${name} (${member}) to the HornyJail database.`
                    }
                });
            } catch (e) {
                console.error(e);

                return message.channel.send({
                    embed: {
                        color: COLORS.FAIL,
                        description: 'An error occurred during processing.'
                    }
                });
            }
        }

        if (remove && !add) {
            const member = await client.extract(client, message, {}) as GuildMember;
            const entry = await this.repo.findOne({
                where: [
                    { name: name?.toLowerCase(), guildID: message.guild.id },
                    { id: member?.id, guildID: message.guild.id }
                ]
            });

            if (!entry)
                return message.util!.send(`Entry under the name \`${name || member.displayName}\` does not exist.`);

            try {
                await this.repo.delete(entry);

                return message.channel.send({
                    embed: {
                        color: COLORS.SUCCESS,
                        description: `Successfully deleted entry ${entry.name} (${entry.id})`
                    }
                });
            } catch (e) {
                console.error(e);

                return message.channel.send({
                    embed: {
                        color: COLORS.FAIL,
                        description: 'An error occurred during processing.'
                    }
                });
            }
        }
    }
}