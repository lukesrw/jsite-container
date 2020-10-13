import * as Generic from "../interfaces/generic";

export interface Options {
    abs?: string;
    custom?: { [module: string]: Generic.Object };
    production?: boolean;
    modules?: [string, string][];
}
