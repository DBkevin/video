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
exports.avoidRepeatedCall = void 0;
const index_1 = require("../../const/index");
/**
 * 装饰器：阻止函数重复调用
 * @export
 * @param {Object} options 入参
 * @param {Function} options.fn 函数
 * @param {Object} options.context 上下文对象
 * @param {String} options.name 函数名
 * @returns {Function} 封装后的函数
 */
function avoidRepeatedCall() {
    return function (target, name, descriptor) {
        const oldFn = descriptor.value;
        const isCallingSet = new Set();
        descriptor.value = function (...args) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function* () {
                if (isCallingSet.has(this)) {
                    console.warn((`${index_1.NAME.PREFIX}previous ${name}() is ongoing, please avoid repeated calls`));
                    // throw new Error(`previous ${name}() is ongoing, please avoid repeated calls`);
                    (_b = (_a = this === null || this === void 0 ? void 0 : this.getTUICallEngineInstance()) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
                        name: 'TUICallKit.avoidRepeatedCall.fail',
                        data: { name },
                        error: `previous ${name}() is ongoing`,
                    });
                    return;
                }
                try {
                    isCallingSet.add(this);
                    const result = yield oldFn.apply(this, args);
                    isCallingSet.delete(this);
                    return result;
                }
                catch (error) {
                    isCallingSet.delete(this);
                    throw error;
                }
            });
        };
        descriptor.value.clearCallState = function (instance) {
            isCallingSet.delete(instance);
        };
        return descriptor;
    };
}
exports.avoidRepeatedCall = avoidRepeatedCall;
