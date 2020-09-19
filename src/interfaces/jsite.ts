import * as Generic from "../interfaces/generic";

export interface Options {
    [name: string]: any;
    abs: string;
    modules: {
        [module: string]: Generic.Object;
    };
    production: boolean;
}
