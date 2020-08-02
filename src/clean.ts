/**
 * Node.js modules
 */
import { promises } from "fs";
import { join } from "path";

/**
 * Custom lib
 */
import { forEachAsync } from "./lib/array";

function isCompiledFile(file: string, files: string[]): boolean {
    let file_no_suffix = file.substring(0, file.lastIndexOf("."));

    // compiled files
    if (file.endsWith(".d.ts") || file.endsWith(".d.ts.map") || file.endsWith(".js.map")) {
        return true;
    }

    // js file with compiled files
    if (
        file.endsWith(".js") &&
        files.includes(`${file}.map`) &&
        files.includes(`${file_no_suffix}.d.ts`) &&
        files.includes(`${file_no_suffix}.d.ts.map`)
    ) {
        return true;
    }

    return false;
}

/**
 * @param {Array} source path
 * @returns {void}
 */
async function clean(source: string[] = []) {
    let clean_items = await promises.readdir(join(...source));

    forEachAsync(clean_items, async clean_item => {
        let clean_item_path = join(...source.concat(clean_item));
        let clean_item_stats = await promises.stat(clean_item_path);

        if (clean_item_stats.isDirectory()) {
            return await clean(source.concat(clean_item));
        }

        if (clean_item_stats.isFile() && isCompiledFile(clean_item, clean_items)) {
            return await promises.unlink(clean_item_path);
        }
    });
}

clean([__dirname]);
