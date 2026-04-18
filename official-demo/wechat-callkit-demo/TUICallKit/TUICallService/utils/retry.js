"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_utils_1 = require("./common-utils");
const RETRY_STATE_NOT_START = 0;
const RETRY_STATE_STARTED = 1;
const RETRY_STATE_STOPPED = 2;
/**
 * 给异步函数封装重试逻辑
 * @param {Object} options 重试逻辑入参
 * @param {Object} options.retryFunction 需要封装的异步函数
 * @param {Object} options.settings 重试属性
 * @param {Number} [options.settings.retries = 5] 重试次数
 * @param {Number} [options.settings.timeout = 1000] 重试间隔
 * @param {onErrorCallback} options.onError 重试错误回调
 * @param {onRetryingCallback} [options.onRetrying] 重试后的回调
 * @param {Object} options.context 上下文，可选
 * @returns {Function} 封装后的函数
 * @example
 * const getUserMedia = promiseRetry({
 *   retryFunction: getUserMedia_,
 *   settings: { retries: 5, timeout: 2000 },
 *   onError: (error, retry, reject) => {
 *     if (error.name === 'NotReadableError') {
 *       retry();
 *     } else {
 *       reject(error);
 *     }
 *   },
 *   onRetrying: retryCount => {
 *     console.warn(`getUserMedia NotReadableError observed, retrying [${retryCount}/5]`);
 *   }
 * });
 */
function promiseRetry({ retryFunction, settings, onError, onRetrying, onRetryFailed, context }) {
    return function (...args) {
        const retries = settings.retries || 5;
        let retryCount = 0;
        let timer = -1;
        let retryState = RETRY_STATE_NOT_START;
        const run = (resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const ctx = context || this;
            try {
                const result = yield retryFunction.apply(ctx, args);
                // 执行成功，正常返回
                retryCount = 0;
                resolve(result);
            }
            catch (error) {
                // 用于停止重试
                const stopRetry = () => {
                    clearTimeout(timer);
                    retryCount = 0;
                    retryState = RETRY_STATE_STOPPED;
                    reject(error);
                };
                const retry = () => {
                    if (retryState !== RETRY_STATE_STOPPED && retryCount < retries) {
                        retryCount++;
                        retryState = RETRY_STATE_STARTED;
                        if ((0, common_utils_1.isFunction)(onRetrying)) {
                            onRetrying.call(ctx, retryCount, stopRetry);
                        }
                        timer = setTimeout(() => {
                            timer = -1;
                            run(resolve, reject);
                        }, (0, common_utils_1.isUndefined)(settings.timeout) ? 1000 : settings.timeout);
                    }
                    else {
                        stopRetry();
                        if ((0, common_utils_1.isFunction)(onRetryFailed)) {
                            onRetryFailed.call(ctx, error);
                        }
                    }
                };
                if ((0, common_utils_1.isFunction)(onError)) {
                    onError.call(ctx, error, retry, reject, args);
                }
                else {
                    retry();
                }
            }
        });
        return new Promise(run);
    };
}
exports.default = promiseRetry;
