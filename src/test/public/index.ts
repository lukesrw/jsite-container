import { JSite } from "../..";

export = async (_1: unknown, jsite: JSite) => {
    let test = await jsite.sendEmit("modules:all");

    return {
        data: test
    };
};
