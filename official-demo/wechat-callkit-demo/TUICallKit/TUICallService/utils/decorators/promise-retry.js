"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const retry_1 = __importDefault(require("../retry"));
;
/**
 * 装饰器函数：给异步函数增加重试
 * @param {Object} settings 入参
 * @returns {Function}
 * @example
 * class LocalStream {
 *   @promiseRetryDecorator({
 *     retries: 10,
 *     timeout: 3000,
 *     onRetryFailed: function(error) {
 *     }
 *   })
 *   async recoverCapture(options) {}
 * }
 */
function promiseRetryDecorator(settings) {
    return function (target, name, descriptor) {
        const { retries = 5, timeout = 2000, onError, onRetrying, onRetryFailed } = settings;
        const oldFn = (0, retry_1.default)({
            retryFunction: descriptor.value,
            settings: { retries, timeout },
            onError,
            onRetrying,
            onRetryFailed,
            context: null,
        });
        descriptor.value = function (...args) {
            return oldFn.apply(this, args);
        };
        return descriptor;
    };
}
exports.default = promiseRetryDecorator;
