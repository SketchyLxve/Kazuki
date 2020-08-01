import ms from 'ms';
import { allFlags, allMentions, timeRegex } from '../util/constants';

export default function parseDate(content: string | string[], option: 'mute' | 'normal' = 'mute') {
  if (Array.isArray(content)) content = content[0];

  const format = {
    week: 'w',
    year: 'y',
    day: 'd',
    hour: 'h',
    minute: 'm',
    second: 's',
    get w() { return format.week; },
    get y() { return format.year; },
    get d() { return format.day; },
    get h() { return format.hour; },
    get m() { return format.minute; },
    get s() { return format.second; },
    get weeks() { return format.week; },
    get years() { return format.years; },
    get days() { return format.day; },
    get hours() { return format.hour; },
    get minutes() { return format.minute; },
    get seconds() { return format.second; }
  };

  let total = 0;

  const reason = content.split(' ').slice(1).join(' ')
    .replace(timeRegex.captureAll, '')
    .replace(allMentions, '')
    .replace(allFlags, '');

  const match = RegExp(timeRegex.captureNums).exec(content);

  match?.[0].split(' ').filter(e => e.length > 0)?.
    map(c => total += ms(c));

  if (!match?.length && option === 'mute') total = 60000 * 5;

  if (total >= 1209600000) total = 0;

  return {
    total,
    reason
  };
}
