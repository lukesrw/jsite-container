/**
 * Node.js modules
 */
import { EventEmitter } from "events";

/**
 * Interfaces
 */
import { PromiseSettledResult } from "./interfaces/promise";
import * as Generic from "./interfaces/generic";
import { Module } from "./interfaces/module";
import { Options } from "./interfaces/jsite";

/**
 * JSite modules
 */
import { server } from "./modules/server/index";
import { router, index } from "./modules/routes/index";
import { mysql } from "./modules/database/index";
import { logger } from "./modules/logger/index";
import { getAbs } from "./lib/abs";
import { EmitPromises } from "./types/jsite";

/**
 * Constants
 */
const UNIQUE_CATEGORIES: string[] = [];
const DEFAULT_MAX_LISTENERS = 100;
const DEFAULT_OPTIONS: Options = {
    abs: getAbs(),
    production: true
};

export class JSite extends EventEmitter {
    options: Options = DEFAULT_OPTIONS;
    custom: Generic.Object = {};
    modules: Module[] = [];

    constructor(options: Options = DEFAULT_OPTIONS) {
        super();

        this.use(router, server, mysql, logger, index);
        this.setOptions(options);
        this.setMaxListeners(DEFAULT_MAX_LISTENERS);
    }

    setOptions(options: Options) {
        this.options = Object.assign(DEFAULT_OPTIONS, options);
    }

    /**
     * Helper for setting modules and removing duplicates
     *
     * @param modules to load
     * @returns {this} for chaining
     */
    use(...modules: Module[]) {
        this.modules = [...new Set(modules)];

        return this;
    }

    unuse(...modules: Module[]) {
        modules.forEach(module => {
            if (this.modules.includes(module)) {
                this.modules.splice(this.modules.indexOf(module), 1);
            }
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

    reloadModule(module: Module) {
        try {
            module(this);
        } catch (error) {
            this.sendEmit("logger:error", error);
        }
    }

    reload() {
        this.removeAllListeners();

        let modules: {
            [category: string]: Module;
        } = {};

        /**
         * last module gets priority, could be modified to be first
         *
         * @todo review after implementing data-driven modules
         */
        this.modules.forEach(module => {
            let category = (module().category || "").toLowerCase();
            if (category && UNIQUE_CATEGORIES.includes(category)) {
                modules[category] = module;
            } else {
                this.reloadModule(module);
            }
        });
        Object.values(modules).forEach(module => this.reloadModule(module));

        this.sendEmit("jsite:reload");

        return this;
    }

    start() {
        this.reload();
        this.sendEmit("jsite:start");

        return this;
    }

    clearRequireCache() {
        for (const file in require.cache) {
            if (Object.prototype.hasOwnProperty.call(require.cache, file) && file.startsWith(this.options.abs)) {
                delete require.cache[require.resolve(file)];
            }
        }
    }
}
