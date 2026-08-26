export class LoadIntentions {
  static readonly type = '[Intentions] Load Intentions';
  constructor(public forceRefresh: boolean = false) {}
}

export class LoadIntentionProducts {
  static readonly type = '[Intentions] Load Intention Products';
  constructor(
    public intentionId: string,
    public skip?: number,
    public take?: number,
    public forceRefresh: boolean = false,
  ) {}
}

export class ClearIntentionsCache {
  static readonly type = '[Intentions] Clear Intentions Cache';
}

