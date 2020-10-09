import { JSite } from "../../../../index";
import { ModuleInfo } from "../../../../interfaces/module";

interface ModuleRecordInterface {
    module_stub: string;
    module_function: string;
}

export function modules(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("jsite:start", promises => {
            promises.push(async () => {
                await jsite.sendEmit("database:all", {
                    callback: (error: string | null, modules: ModuleRecordInterface[]) => {
                        let set_modules = jsite.modules;

                        if (error) throw new Error(error);

                        (modules || []).forEach(module => {
                            set_modules.push([module.module_stub, module.module_function]);
                        });

                        jsite.setModules(...set_modules);
                        jsite.reload();
                    },
                    sql: "SELECT module_stub, module_function FROM modules WHERE module_is_active = 1"
                });
            });
        });
    }

    return {
        name: "Test"
    };
}
