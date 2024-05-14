// Create newtypes as per:
// https://github.com/Microsoft/TypeScript/issues/4895#issuecomment-401067935

// Using namespace here simply to show that external files
// should NOT have access to OpaqueTagSymbol or OpaqueTag.
// Put this in its own module, without the namespace
namespace Tag {
  declare const OpaqueTagSymbol: unique symbol;
  declare class OpaqueTag<S extends symbol> {
    private [OpaqueTagSymbol]: S;
  }

  export type Opaque<T, S extends symbol> = T & OpaqueTag<S>;
}

export type NewType<T, S extends symbol> = Tag.Opaque<T, S>;
