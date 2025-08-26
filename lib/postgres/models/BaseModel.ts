/**
 * Returns keys of all nullable properties of a class / interface.
 */
type NullablePropertyKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];

/**
 * Returns keys of all non-nullable properties of a class / interface.
 */
type NonNullablePropertyKeys<T> = {
  [K in keyof T]: null extends T[K] ? never : K;
}[keyof T];

/**
 * Returns the parameters that are required to create a new instance of a model.
 *
 * @param Model The model class to create a new instance of.
 * @param ExcludeProps The non-nullable properties that should still be
 *  optional regardless (e.g. uri)
 */
export type ModelCreateParams<Model, ExcludeProps extends keyof Model = never> = Pick<
  Model,
  NonNullablePropertyKeys<Omit<Model, ExcludeProps>>
> &
  Partial<Pick<Model, NullablePropertyKeys<Model> | ExcludeProps>>;

/**
 * Type to define a constructor that would return an instance of a model.
 */
export type ModelConstructor<T> = new (pojo: ModelCreateParams<T>) => T;
