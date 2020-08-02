import { JSite } from "..";

export interface ModuleInfo {
    author_name?: string;
    author_uri?: string;
    category?: string;
    description?: string;
    license_name?: string;
    license_uri?: string;
    name: string;
    namespace_name?: string;
    namespace_uri?: string;
    requires_jsite?: string;
    requires_nodejs?: string;
    uri?: string;
    version?: string;
}

export type Module = (jsite?: JSite) => ModuleInfo;
