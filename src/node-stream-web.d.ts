export {};

declare module 'node:stream/web' {
  interface UnderlyingDefaultSource<R = any> {
    cancel?: (reason?: any) => void | PromiseLike<void>;
    pull?: (controller: ReadableStreamDefaultController<R>) => void | PromiseLike<void>;
    start?: (controller: ReadableStreamDefaultController<R>) => any;
    type?: undefined;
  }
}
