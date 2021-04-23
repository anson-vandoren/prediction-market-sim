export class Account {
  entries: Map<number, number>;
  lpEntries: Map<number, number>;

  constructor() {
    this.entries = new Map<number, number>();
    this.lpEntries = new Map<number, number>();
  }
}
