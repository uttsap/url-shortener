type NullablePropertyKeys<T> = {
    [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];
type NonNullablePropertyKeys<T> = {
    [K in keyof T]: null extends T[K] ? never : K;
}[keyof T];
export type ModelCreateParams<Model, ExcludeProps extends keyof Model = never> = Pick<Model, NonNullablePropertyKeys<Omit<Model, ExcludeProps>>> & Partial<Pick<Model, NullablePropertyKeys<Model> | ExcludeProps>>;
export type ModelConstructor<T> = new (pojo: ModelCreateParams<T>) => T;
export {};
