import { JSite } from "../../../../index";
import * as Generic from "../../../../interfaces/generic";
import { ModuleInfo } from "../../../../interfaces/module";

export function modules(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("modules:all", promises => {
            promises.push(async (data: Generic.Object) => {
                data = Object.assign(
                    data,
                    await jsite.sendEmit("database:all", {
                        sql: "SELECT * FROM modules WHERE module_is_active = 1"
                    })
                );
                data.results = data.results || [];
            });
        });

        jsite.on("modules:reload", promises => {
            promises.push(async () => {
                let modules = await jsite.sendEmit("modules:all");

                jsite.setModules(
                    ...jsite.getOption("modules", []).concat(
                        modules.results.map((module: Generic.Object) => {
                            return [module.module_stub, module.module_function];
                        })
                    )
                );

                return jsite.reload();
            });
        });

        jsite.on("jsite:start", promises => {
            promises.push(async () => await jsite.sendEmit("modules:reload"));
        });
    }

    return {
        name: "Test"
    };
}
