import { JSite } from "../index";

let server = new JSite({
    custom: {
        database: {
            mysql: {
                charset: "UTF8MB4_UNICODE_CI",
                database: "container",
                dateStrings: true,
                multipleStatements: true,
                namedPlaceholders: true
            }
        }
    },
    modules: [
        ["modules", "modules"],
        ["database", "mysql"]
    ]
});

server.start();
