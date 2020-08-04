import { JSite } from "../..";
import * as path from "path";
import { ModuleInfo } from "../../interfaces/module";

function setup(jsite: JSite): JSite {
    if (!Object.prototype.hasOwnProperty.call(jsite.custom, "database")) {
        jsite.custom.database = {};
    }

    return jsite;
}

export function mysql(jsite?: JSite): ModuleInfo {
    if (jsite) {
        setup(jsite).on("jsite:start", promises => {
            promises.push(async () => {
                const mysql = require("mysql2");

                jsite.custom.database.mysql = mysql.createPool({
                    database: "eds",
                    host: "localhost",
                    password: "",
                    user: "root"
                });
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
        setup(jsite).on("jsite:start", promises => {
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
