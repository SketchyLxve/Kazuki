import { client } from '../app';
import { NMLClient } from '../core/structures/NMLClient';
import { USER_ACTION_COLORS } from '../util/constants';
import { UserActionData, UserActionType } from '../util/UserActionData';

export default class UserAction {
  protected action: UserActionType;
  protected client: NMLClient = client;
  protected data: UserActionData;

  public constructor(
    data: UserActionData & { action: UserActionType }
  ) {
    this.data = data;
    this.action = data.action;
  }

  protected get option(): 'CREATE' | 'UPDATE' | 'DELETE' | null {
    const action = this.action.toLowerCase();
    if (['create', 'add'].some(a => action.includes(a))) return 'CREATE';
    else if (['delete', 'remove'].some(d => action.includes(d))) return 'DELETE';
    else if (action.includes('update')) return 'UPDATE';
    return null;
  }

  protected get color() {
    return USER_ACTION_COLORS[this.option] ?? '0x2b2b2b';
  }
}
