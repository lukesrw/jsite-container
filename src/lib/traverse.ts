import * as Generic from "../interfaces/generic";

export function traverse<ReturnType>(
    start: Generic.Object,
    properties: string | string[],
    fallback: ReturnType
): ReturnType {
    if (typeof start === "object" && !Array.isArray(start)) {
        let value: any = start;

        if (!Array.isArray(properties)) properties = [properties];

        if (
            properties.every((property: keyof typeof value) => {
                if (Object.prototype.hasOwnProperty.call(value, property)) {
                    value = value[property];

                    return true;
                }

                return false;
            })
        ) {
            return value;
        }
    }

    return fallback;
}
