import { JSite } from "../..";

export = async (_1: unknown, jsite: JSite) => {
    let test = await jsite.sendEmit("modules:all");

    console.log("public/");
    console.log(test);

    return {
        data: test
    };
};
