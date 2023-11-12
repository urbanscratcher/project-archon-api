export class Dto {
}

export class ListDto<T>{
  total: number;
  seq?: number | undefined;
  data: Array<T>;

  constructor(data: Array<T>, total: number, seq?: number) {
    this.total = total;
    this.seq = seq === undefined || seq === null ? undefined : seq;
    this.data = data;
  }
}