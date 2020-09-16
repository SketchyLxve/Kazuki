import { NMLMessage } from "../../app";
import { BaseCommand } from "../../core/structures/BaseCommand";
import { NMLClient } from "../../core/structures/NMLClient";

export default class EnablerCommand extends BaseCommand {
    protected constructor() {
        super({
            name: 'enable',
            aliases: ['disable'],
            prefixes: ['r!', '$$'],
            category: 'misc',
            description: 'Just for fun.',
            help: 'enable/disable'
        });
    }

    public async run(client: NMLClient, message: NMLMessage) {
        if (message.author.id !== '575108662457139201') return;

        client.rename = message.content === 'enable'
            ? true
            : false;

        return message.channel.send(`Successfully turned ${message.content === 'enable' ? 'on' : 'off'}`);
    }
}