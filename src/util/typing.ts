export type Nominal<K extends string> = {
  __brand: {
    K: boolean;
  };
};

export type NominalString<K extends string> = string & Nominal<K>;
