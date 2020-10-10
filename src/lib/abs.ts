import { join } from "path";

export function getAbs(depth: number = 3): string {
    return join(
        (Error().stack || "")
            .split("\n")
            .map(line => {
                return line.substring(line.lastIndexOf(" ") + 2, line.lastIndexOf(":", line.lastIndexOf(":") - 1));
            })
            .filter(line => !line.startsWith("internal"))[depth],
        ".."
    );
}
