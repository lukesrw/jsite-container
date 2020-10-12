/**
 * Node.js modules
 */
import { EventEmitter } from "events";
import { promises } from "fs";
import { join } from "path";

/**
 * Interfaces
 */
import { PromiseSettledResult } from "./interfaces/promise";
import * as Generic from "./interfaces/generic";
import { Options, OptionsInput } from "./interfaces/jsite";

/**
 * JSite modules
 */
import { getAbs } from "./lib/abs";
import { EmitPromises } from "./types/jsite";
import { forEachAsync } from "./lib/array";

/**
 * Constants
 */
const UNIQUE_CATEGORIES: {
    [category: string]: boolean;
} = {};
const DEFAULT_MAX_LISTENERS = 100;
const DEFAULT_OPTIONS: Options = {
    abs: getAbs(),
    modules: {},
    production: true
};

export class JSite extends EventEmitter {
    options: Options = DEFAULT_OPTIONS;
    custom: Generic.Object = {};
    modules: [string, string][] = [];

    constructor(options: OptionsInput = DEFAULT_OPTIONS) {
        super();

        this.setModules(["logger", "logger"], ["server", "server"], ["routes", "router"], ["modules", "modules"]);
        this.setOptions(options);
        this.setMaxListeners(DEFAULT_MAX_LISTENERS);
    }

    setOptions(options: OptionsInput) {
        this.options = Object.assign(DEFAULT_OPTIONS, options);
    }

    /**
     * Helper for setting modules and removing duplicates
     *
     * @param modules to load
     * @returns {this} for chaining
     */
    setModules(...modules: [string, string][]) {
        modules.forEach(module => {
            if (!Array.isArray(module)) {
                throw new Error(`Invalid Module provided: ${JSON.stringify(module)}`);
            }
        });

        this.modules = [...new Set(modules)];

        return this;
    }

    unsetModules(...modules: [string, string][]) {
        this.modules = this.modules.filter(set_module => {
            return modules.some(unset_module => {
                if (Array.isArray(unset_module)) return set_module !== unset_module;

                if (typeof unset_module === "string") return set_module[0] !== unset_module;

                return true;
            });
        });

        return this;
    }

    async sendEmit(event: string, data: any = {}): Promise<any> {
        let fingerprints: string[] = [];
        let promises_loop = true;
        let promises: EmitPromises = [];
        let results: PromiseSettledResult[];

        /**
         * Emit sends a message to all listeners of the "event", for them to run their actions
         * Listeners may return a promise in the "promises" array, for us to run/re-run
         */
        this.emit(event, promises);

        /**
         * While we've got promises to execute (and the last loop was successful),
         *
         * Every promise is executed asynchronously and provided with "data" and "fingerprints"
         * "data" is the main content of the emit, which will be passed back to the caller of this emit
         * "fingerprints" is for listeners to leave a trace that they were there (to make chains easier)
         *
         * If a promise rejects with an error message, we @todo
         * If a promise resolved with anything other than "false", we remove it from the loop and allow a re-loop
         *
         * If no promises in the loop were successful, the loop stops - preventing infinite looping
         */
        while (promises_loop && promises.length) {
            /**
             * Perhaps I could pass "this" as the final argument into the map
             * This would allow listeners to read/modify from the core directly
             * Need to establish security & stability impacts of this change
             *
             * Perhaps just passing an emit object with the promises, fingerprints, and self?
             *
             * @todo consider updating
             */
            results = await Promise.allSettled(promises.map(func => func(data, fingerprints)));

            promises_loop = false;
            promises = promises.filter((_1, promises_i) => {
                switch (results[promises_i].status) {
                    case "rejected":
                        if (results[promises_i].reason) {
                            this.sendEmit("logger:error", results[promises_i].reason);
                            throw new Error(results[promises_i].reason);
                        }
                        break;

                    case "fulfilled":
                        /**
                         * Listener resolved "false", meaning they weren't able to complete
                         * We keep the promise and re-run if we loop again
                         */
                        if (results[promises_i].value === false) return true;
                }

                promises_loop = true;

                return false;
            });
        }

        return data;
    }

    getOption(...property: string[]) {
        let value;
        for (let i = 0; i < property.length; i += 1) {
            if (Object.prototype.hasOwnProperty.call(this.options, property[i])) {
                value = this.options[property[i]];
            } else {
                value = undefined;
                break;
            }
        }

        return value;
    }

    async reload() {
        this.removeAllListeners();

        await forEachAsync(this.modules, async (_1, i) => {
            this.modules[i][0] = join(this.getOption("abs"), "public", "modules", this.modules[i][0], "index.js");

            try {
                await promises.stat(this.modules[i][0]);

                let { [this.modules[i][1]]: code } = require(this.modules[i][0]);
                let category = (code().category || "").toLowerCase();
                if (category && Object.prototype.hasOwnProperty.call(UNIQUE_CATEGORIES, category)) {
                    if (UNIQUE_CATEGORIES[category]) return;

                    UNIQUE_CATEGORIES[category] = true;
                }

                try {
                    code(this);
                } catch (error) {
                    this.sendEmit("logger:error", error);
                }
            } catch (error) {
                this.sendEmit("logger:error", error);
            }
        });

        this.sendEmit("jsite:reload");

        return this;
    }

    async start() {
        await this.reload();

        this.sendEmit("jsite:start");

        return this;
    }

    clearRequireCache() {
        for (const file in require.cache) {
            if (Object.prototype.hasOwnProperty.call(require.cache, file) && file.startsWith(this.getOption("abs"))) {
                delete require.cache[require.resolve(file)];
            }
        }
    }
}
