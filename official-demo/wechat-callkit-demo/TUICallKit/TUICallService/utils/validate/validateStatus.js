"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusValidate = void 0;
const index_1 = require("../../const/index");
const index_2 = require("../../locales/index");
function statusValidate(config) {
    return function (target, propertyName, descriptor) {
        let method = descriptor.value;
        descriptor.value = function (...args) {
            doValidate.call(this, config, args, propertyName);
            return method.apply(this, args);
        };
        return descriptor;
    };
}
exports.statusValidate = statusValidate;
function doValidate(config) {
    if ((config === null || config === void 0 ? void 0 : config.engineInstance) && !this._tuiCallEngine) {
        const error = `${index_1.NAME.PREFIX} ${(0, index_2.t)('TUICallKit init is not complete')}`;
        console.error(error);
        throw error;
    }
}
