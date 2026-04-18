"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_utils_1 = require("./common-utils");
const isEmpty = function (input) {
    // Null and Undefined...
    if (input === null || typeof (input) === 'undefined')
        return true;
    // Booleans...
    if (typeof input === 'boolean')
        return false;
    // Numbers...
    if (typeof input === 'number')
        return input === 0;
    // Strings...
    if (typeof input === 'string')
        return input.length === 0;
    // Functions...
    if (typeof input === 'function')
        return input.length === 0;
    // Arrays...
    if (Array.isArray(input))
        return input.length === 0;
    // Errors...
    if (input instanceof Error)
        return input.message === '';
    // plain object
    if ((0, common_utils_1.isPlainObject)(input)) {
        // eslint-disable-next-line
        for (const key in input) {
            if (Object.prototype.hasOwnProperty.call(input, key)) {
                return false;
            }
        }
        return true;
    }
    return false;
};
exports.default = isEmpty;
