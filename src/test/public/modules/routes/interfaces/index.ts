export interface Rule {
    regex?: string | RegExp;
    flags?: string;
    file: string;
    matches: RegExpMatchArray[];
}
