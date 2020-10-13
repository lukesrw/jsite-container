import { JSite } from "../../../../index";

import * as path from "path";
import { ModuleInfo } from "../../../../interfaces/module";
import * as Generic from "../../../../interfaces/generic";
import { EmitPromises } from "../../../../types/jsite";

interface QueryInterface {
    sql: string;
    param?: Generic.Object | any[];
    callback?: Function;
    complete?: Function;
    results?: any[];
}

const METHODS = ["run", "get", "all", "each", "exec"];

function select(jsite: JSite, method: string) {
    return (promises: EmitPromises) => {
        promises.push(async (options: QueryInterface) => {
            let callback = options.callback;
            let complete = options.complete;
            delete options.callback;
            delete options.complete;

            for (let driver in jsite.custom.database) {
                if (typeof driver === "string") {
                    switch (driver) {
                        case "mysql":
                            if (!Array.isArray(options.param) && typeof options.param === "object") {
                                for (let param in options.param) {
                                    if (param.startsWith(":")) {
                                        options.param[param.substr(1)] = options.param[param];
                                        delete options.param[param];
                                    }
                                }
                            }

                            switch (method) {
                                case "run":
                                    await jsite.custom.database.mysql.query(options);
                                    break;

                                case "get":
                                    options.results = await jsite.custom.database.mysql.query(options);
                                    options.results = (options.results || [])[0];
                                    break;

                                case "all":
                                    options.results = await jsite.custom.database.mysql.query(options);

                                    if (options.results) options.results = options.results[0];
                                    break;

                                case "each":
                                    return jsite.custom.database.mysql.query(
                                        options,
                                        (error: string | null, rows: any[][]) => {
                                            if (!error && callback) {
                                                rows.forEach(row => {
                                                    if (callback) return callback(row);
                                                });
                                            }

                                            if (complete) return complete(error, rows);
                                        }
                                    );

                                case "exec":
                                    await jsite.custom.database.mysql.query(options);
                                    break;

                                default:
                                    throw new Error(`Unsupported MySQL method: ${method}`);
                            }

                            return options;

                        case "sqlite":
                            if (!Array.isArray(options.param) && typeof options.param === "object") {
                                for (let param in options.param) {
                                    if (!param.startsWith(":")) {
                                        options.param[`:${param}`] = options.param[param];
                                        delete options.param[param];
                                    }
                                }
                            }

                            switch (method) {
                                case "each":
                                    return jsite.custom.database.sqlite.each(
                                        options.sql,
                                        options.param,
                                        callback,
                                        complete
                                    );

                                case "exec":
                                    return jsite.custom.database.sqlite.exec(options.sql, callback);

                                default:
                                    if (METHODS.includes(method)) {
                                        return jsite.custom.database.sqlite[method](
                                            options.sql,
                                            options.param,
                                            callback
                                        );
                                    }

                                    throw new Error(`Unsupported SQLite method: ${method}`);
                            }

                        default:
                            throw new Error(`Unsupported Database driver: ${driver}`);
                    }
                }
            }

            return true;
        });
    };
}

function setup(jsite: JSite): JSite {
    if (!Object.prototype.hasOwnProperty.call(jsite.custom, "database")) {
        jsite.custom.database = {};

        METHODS.forEach(method => jsite.on(`database:${method}`, select(jsite, method)));
    }

    return jsite;
}

export function mysql(jsite?: JSite): ModuleInfo {
    if (jsite) {
        setup(jsite).on("jsite:reload", promises => {
            promises.push(async () => {
                const mysql = require("mysql2/promise");

                jsite.custom.database.mysql = mysql.createPool(
                    Object.assign(
                        {
                            host: "localhost",
                            password: "",
                            user: "root"
                        },
                        jsite.getOption(["custom", "database", "mysql"], {})
                    )
                );
            });
        });
    }

    return {
        category: "Database",
        name: "JSite MySQL"
    };
}

export function sqlite(jsite?: JSite): ModuleInfo {
    if (jsite) {
        setup(jsite).on("jsite:reload", promises => {
            promises.push(async () => {
                const sqlite = require("sqlite3").verbose();

                jsite.custom.database.sqlite = new sqlite.Database(path.join(__dirname, "sqlite.db"));
            });
        });
    }

    return {
        category: "Database",
        name: "JSite SQLite"
    };
}
