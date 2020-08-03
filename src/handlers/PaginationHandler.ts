import { MessageEmbed, User } from 'discord.js';
import { NMLMessage } from '../app';
import { CategoryData, COLORS } from '../util/constants';
export class PaginationHandler<T> {
  public amountOfPages: number;
  public currentPage = 1;
  public data: T[][] | T[];
  public embed: MessageEmbed;
  public itemHandler: (embed: MessageEmbed, data: T[][] | T[]) => MessageEmbed;
  public isListing: boolean;
  public itemsPerPage: number;
  public message: NMLMessage;
  public paginationEmojis: string[];
  public categories?: CategoryData<T>[];

  public constructor(
    message: NMLMessage,
    embed: MessageEmbed,
    itemsPerPage: number,
    categories?: CategoryData<T>[],
    itemHandler?: (embed: MessageEmbed, data: T[]) => MessageEmbed
  ) {
    this.categories = categories ?? [];

    this.data = this.categories.map(c => c.data);

    this.embed = embed ?? new MessageEmbed();

    this.message = message;

    this.itemHandler = itemHandler ?? (() => null);

    this.itemsPerPage = itemsPerPage ?? 5;

    this.paginationEmojis = [this.categories.length ? '⬆️' : '', '⬅️', '➡️', '❌'].filter(e => e.length);

    this.isListing = false;
  }

  public readonly full = {
    admin: 'Administration',
    mod: 'Moderation',
    misc: 'Miscellanous',
    eco: 'Economy',
    util: 'Utility',
    system: 'System',
    get economy() {
      return this.eco;
    }
  };

  public nextPage = async () => {
    if (this.currentPage === this.amountOfPages) this.currentPage = 1;
    else this.currentPage++;

    await this.showPage();
  };

  public previousPage = async () => {
    if (this.currentPage === 1) this.currentPage = this.amountOfPages;
    else this.currentPage--;

    await this.showPage();
  };

  public async showPage() {
    const start =
      this.currentPage === 1 ? 0 : (this.currentPage - 1) * this.itemsPerPage;

    const end =
      this.itemsPerPage * this.currentPage > this.data.length ? this.data.length : this.itemsPerPage * this.currentPage;

    const data = this.data.slice(start, end);

    this.embed.fields = [];

    this.embed = this.itemHandler(this.embed, data);

    await this.message.edit(null, { embed: this.embed });
  }

  public async showCategories() {
    this.embed = new MessageEmbed();

    this.isListing = false;


    await this.message.reactions.removeAll();

    for (const category of this.categories) { this.embed.addField(`${category.reaction} ${this.full[category.name]}`, category.description); }

    await this.message.edit(null, this.embed);

    for (const cat of this.categories) { await this.message.react(cat.reaction); }

    await this.message.react('❌');
  }

  public async start(author: User) {
    if (this.categories.length && !this.isListing) await this.showCategories();

    const collector = this.message.createReactionCollector(
      (r, u) =>
        u.id === author.id &&
        (this.categories.some(c => r.emoji.name === c.reaction || this.paginationEmojis.some(p => r.emoji.name === p))),
      { idle: 15000 }
    );

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('collect', async r => {
      if (r.emoji.name === '❌') {
        await this.message.delete();
        return collector.stop();
      }

      if (!this.isListing) {
        const found = this.categories.find(e => e.reaction === r.emoji.name);

        this.data = found.data;
      }

      let totalPages = Math.floor(this.data.length / this.itemsPerPage);

      if (this.data.length % this.itemsPerPage !== 0) totalPages++;

      this.amountOfPages = totalPages;

      await this.showPage();

      if (!this.isListing && this.categories.length) this.isListing = true;

      if (r.emoji.name === '⬆️') await this.showCategories();

      if (r.emoji.name === '⬅️' && this.currentPage !== 1) await this.previousPage();

      if (r.emoji.name === '➡️' && this.amountOfPages !== this.currentPage) await this.nextPage();

      if (r.emoji.name === '❌') {
        await this.message.delete();
        return collector.stop();
      }

      let temporary = this.paginationEmojis;

      if (this.amountOfPages === 1) temporary = this.paginationEmojis.filter(e => ['⬅️', '➡️'].every(r => e !== r));

      else if (this.currentPage === 1) temporary = this.paginationEmojis.filter(e => e !== '⬅️');

      else if (this.currentPage === this.amountOfPages) temporary = this.paginationEmojis.filter(e => e !== '➡️');

      if (this.isListing) {
        await this.message.reactions.removeAll();
        for (const emoji of temporary) {
          await this.message.react(emoji);
          if (!this.isListing) this.isListing = true;
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('end', async (_collected, reason) => {
      if (['time', 'idle'].some(r => reason === r)) {
        await this.message.reactions.removeAll();

        await this.message.edit(null, {
          embed: {
            color: COLORS.CANCEL,
            description: 'The idle timeout has been sufficed! React faster next time.'
          }
        });
      }
    });
  }
}
