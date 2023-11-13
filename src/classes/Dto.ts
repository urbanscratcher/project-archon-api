export class Dto {
}

export class ListDto<T>{
  total: number;
  offset?: number | undefined;
  limit?: number | undefined;
  data: Array<T>;

  constructor(data: Array<T>, total: number, offset?: number, limit?: number) {
    this.total = total;
    this.offset = offset === undefined || offset === null ? undefined : offset;
    this.limit = limit === undefined || limit === null ? undefined : limit;
    this.data = data;
  }
}