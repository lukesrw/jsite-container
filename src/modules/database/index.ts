import { JSite } from "../..";
import * as path from "path";
import { ModuleInfo } from "../../interfaces/module";
import * as Generic from "../../interfaces/generic";

interface QueryInterface extends Generic.Object {
    callback: Function;
}

function setup(jsite: JSite): JSite {
    if (!Object.prototype.hasOwnProperty.call(jsite.custom, "database")) {
        jsite.custom.database = {};
        jsite.on("database:select", promises => {
            promises.push(async (options: QueryInterface) => {
                let callback = options.callback;
                delete options.callback;

                Object.keys(jsite.custom.database).forEach(driver => {
                    switch (driver) {
                        case "mysql":
                            return jsite.custom.database[driver].query(options, callback);
                    }
                });

                return options;
            });
        });
    }

    return jsite;
}

export function mysql(jsite?: JSite): ModuleInfo {
    if (jsite) {
        setup(jsite).on("jsite:reload", promises => {
            promises.push(async () => {
                const mysql = require("mysql2");

                jsite.custom.database.mysql = mysql.createPool(
                    Object.assign(
                        {
                            host: "localhost",
                            password: "",
                            user: "root"
                        },
                        jsite.options.modules.database.mysql
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
