export async function forEachAsync<InputType>(
    array: InputType[],
    forEach: (item: InputType, index: number, array: InputType[]) => Promise<void>
) {
    for (let index = 0; index < array.length; index += 1) {
        await forEach(array[index], index, array);
    }
}
