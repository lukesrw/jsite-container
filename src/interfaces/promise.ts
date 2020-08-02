/**
 * An interface of this name exists in the promises vanilla
 * ...I should be able to import that one and not define my own
 *
 * @todo reduce code duplication
 */
export interface PromiseSettledResult {
    status: string;
    reason?: any;
    value?: any;
}
