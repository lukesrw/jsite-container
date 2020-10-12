/**
 * Node modules
 */
import { promises } from "fs";
import { join } from "path";

/**
 * Npm packages
 */
import { JSite } from "../../../../index";

/**
 * Interfaces
 */
import { ModuleInfo } from "../../../../interfaces/module";

async function write(directory: string, file: string, content: string | Error, heading: string) {
    try {
        await promises.mkdir(directory);
    } catch (_1) {}

    let trace = Error().stack;
    if (content instanceof Error) {
        trace = content.stack;
        content = content.message;
    }
    content = `## ${heading}:
\`\`\`json
${JSON.stringify(content, null, 4)}
\`\`\``;

    trace = (trace || "")
        .split("\n")
        .slice(2)
        .filter(line => line.trim() !== "at new Promise (<anonymous>)")
        .map((line, line_i) => (line_i === 0 ? line.replace(/^\s+at /iu, "") : line))
        .join("\n");

    if (trace) {
        trace = `## Trace:
\`\`\`
${trace}
\`\`\``;
    } else {
        trace = "";
    }

    await promises.appendFile(
        join(directory, file),
        `# ${new Date()}
${trace}
${content}

`
    );

    return true;
}

export function logger(jsite?: JSite): ModuleInfo {
    if (jsite) {
        jsite.on("logger:error", chain => {
            chain.push(async (error: any) => {
                await write(join(jsite.getOption("abs"), "logs"), "error.md", error, "Error");
            });
        });

        jsite.on("logger:warning", chain => {
            chain.push(async (error: any) => {
                await write(join(jsite.getOption("abs"), "logs"), "warning.md", error, "Error");
            });
        });
    }

    return {
        name: "Logger"
    };
}
