"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBrowserCloseDetection = exports.interpolate = exports.modifyObjectKey = exports.getType = exports.noop = exports.getLanguage = exports.isFunction = exports.performanceNow = exports.handleNoDevicePermissionError = exports.handleRepeatedCallError = exports.retryPromise = exports.JSONToObject = exports.isJSON = exports.formatTimeInverse = exports.formatTime = exports.isNumber = exports.isBoolean = exports.isString = exports.isUrl = exports.isPrivateKey = exports.isArray = exports.isPlainObject = exports.isUndefined = void 0;
const index_1 = require("../const/index");
const tuiGlobal_1 = __importDefault(require("../TUIGlobal/tuiGlobal"));
const isUndefined = function (input) {
    return typeof input === index_1.NAME.UNDEFINED;
};
exports.isUndefined = isUndefined;
const isPlainObject = function (input) {
    // 注意不能使用以下方式判断，因为IE9/IE10下，对象的__proto__是 undefined
    // return isObject(input) && input.__proto__ === Object.prototype;
    if (typeof input !== index_1.NAME.OBJECT || input === null) {
        return false;
    }
    const proto = Object.getPrototypeOf(input);
    if (proto === null) { // edge case Object.create(null)
        return true;
    }
    let baseProto = proto;
    while (Object.getPrototypeOf(baseProto) !== null) {
        baseProto = Object.getPrototypeOf(baseProto);
    }
    // 原型链第一个和最后一个比较
    return proto === baseProto;
};
exports.isPlainObject = isPlainObject;
const isArray = function (input) {
    if (typeof Array.isArray === index_1.NAME.FUNCTION) {
        return Array.isArray(input);
    }
    return Object.prototype.toString.call(input).match(/^\[object (.*)\]$/)[1].toLowerCase() === index_1.NAME.ARRAY;
};
exports.isArray = isArray;
const isPrivateKey = function (key) {
    return key.startsWith('_');
};
exports.isPrivateKey = isPrivateKey;
const isUrl = function (url) {
    return /^(https?:\/\/(([a-zA-Z0-9]+-?)+[a-zA-Z0-9]+\.)+[a-zA-Z]+)(:\d+)?(\/.*)?(\?.*)?(#.*)?$/.test(url);
};
exports.isUrl = isUrl;
/**
 * 检测input类型是否为string
 * @param {*} input 任意类型的输入
 * @returns {Boolean} true->string / false->not a string
 */
const isString = function (input) {
    return typeof input === index_1.NAME.STRING;
};
exports.isString = isString;
const isBoolean = function (input) {
    return typeof input === index_1.NAME.BOOLEAN;
};
exports.isBoolean = isBoolean;
const isNumber = function (input) {
    return (
    // eslint-disable-next-line
    input !== null &&
        ((typeof input === index_1.NAME.NUMBER && !isNaN(input - 0)) || (typeof input === index_1.NAME.OBJECT && input.constructor === Number)));
};
exports.isNumber = isNumber;
function formatTime(secondTime) {
    const hours = Math.floor(secondTime / 3600);
    const minutes = Math.floor((secondTime % 3600) / 60);
    const seconds = Math.floor(secondTime % 60);
    let callDurationStr = hours > 9 ? `${hours}` : `0${hours}`;
    callDurationStr += minutes > 9 ? `:${minutes}` : `:0${minutes}`;
    callDurationStr += seconds > 9 ? `:${seconds}` : `:0${seconds}`;
    return callDurationStr;
}
exports.formatTime = formatTime;
function formatTimeInverse(stringTime) {
    const list = stringTime.split(':');
    return parseInt(list[0]) * 3600 + parseInt(list[1]) * 60 + parseInt(list[2]); // eslint-disable-line
}
exports.formatTimeInverse = formatTimeInverse;
// Determine if it is a JSON string
function isJSON(str) {
    if (typeof str === index_1.NAME.STRING) {
        try {
            const data = JSON.parse(str);
            if (data) {
                return true;
            }
            return false;
        }
        catch (error) {
            console.debug(error);
            return false;
        }
    }
    return false;
}
exports.isJSON = isJSON;
// Determine if it is a JSON string
const JSONToObject = function (str) {
    if (!str || !isJSON(str)) {
        return str;
    }
    return JSON.parse(str);
};
exports.JSONToObject = JSONToObject;
/**
 * 重试函数, catch 时，重试
 * @param {Promise} promise 需重试的函数
 * @param {number} num 需要重试的次数
 * @param {number} time 间隔时间（s）
 * @returns {Promise<any>} im 接口的 response 原样返回
 */
const retryPromise = (promise, num = 6, time = 0.5) => {
    let n = num;
    const func = () => promise;
    return func()
        .catch((error) => {
        if (n === 0) {
            throw error;
        }
        const timer = setTimeout(() => {
            func();
            clearTimeout(timer);
            n = n - 1;
        }, time * 1000);
    });
};
exports.retryPromise = retryPromise;
// /**
//  * 节流函数（目前 TUICallKit 增加防重调用装饰器，该方法可删除）
//  * @param {Function} func 传入的函数
//  * @param {wait} time 间隔时间（ms）
//  */
// export const throttle = (func: Function, wait: number) => {
//   let previousTime = 0;
//   return function () {
//     const now = Date.now();
//     const args = [...arguments];
//     if (now - previousTime > wait) {
//       func.apply(this, args);
//       previousTime = now;
//     }
//   };
// }
/**
 * web call engine 重复调用时的错误, 这种错误在 TUICallKit 应该忽略
 * @param {any} error 错误信息
 * @returns {Boolean}
 */
function handleRepeatedCallError(error) {
    var _a;
    if (((_a = error === null || error === void 0 ? void 0 : error.message) === null || _a === void 0 ? void 0 : _a.indexOf('is ongoing, please avoid repeated calls')) !== -1) {
        return true;
    }
    return false;
}
exports.handleRepeatedCallError = handleRepeatedCallError;
/**
 * 设备无权限时的错误处理
 * @param {any} error 错误信息
 * @returns {Boolean}
 */
function handleNoDevicePermissionError(error) {
    const { message } = error;
    if ((message === null || message === void 0 ? void 0 : message.indexOf('NotAllowedError: Permission denied')) !== -1) {
        return true;
    }
    return false;
}
exports.handleNoDevicePermissionError = handleNoDevicePermissionError;
/*
 * 获取向下取整的 performance.now() 值
 * 在不支持 performance.now 的浏览器中，使用 Date.now(). 例如 ie 9，ie 10，避免加载 sdk 时报错
 * @export
 * @return {Number}
 */
function performanceNow() {
    // if (!performance || !performance.now) {
    //   return Date.now();
    // }
    // return Math.floor(performance.now()); // uni-app 打包小程序没有 performance, 报错
    return Date.now();
}
exports.performanceNow = performanceNow;
/**
 * 检测input类型是否为function
 * @param {*} input 任意类型的输入
 * @returns {Boolean} true->input is a function
 */
const isFunction = function (input) {
    return typeof input === index_1.NAME.FUNCTION;
};
exports.isFunction = isFunction;
/*
 * 获取浏览器语言
 * @export
 * @return {zh-cn | en}
 */
const getLanguage = () => {
    if (tuiGlobal_1.default.getInstance().isWeChat) {
        return 'zh-cn';
    }
    // @ts-ignore
    const lang = ((navigator === null || navigator === void 0 ? void 0 : navigator.language) || (navigator === null || navigator === void 0 ? void 0 : navigator.userLanguage) || '').substr(0, 2);
    let language = 'en';
    switch (lang) {
        case 'zh':
            language = 'zh-cn';
            break;
        case 'ja':
            language = 'ja_JP';
            break;
        default:
            language = 'en';
    }
    return language;
};
exports.getLanguage = getLanguage;
function noop(e) { }
exports.noop = noop;
/**
 * Get the object type string
 * @param {*} input 任意类型的输入
 * @returns {String} the object type string
 */
const getType = function (input) {
    return Object.prototype.toString
        .call(input)
        .match(/^\[object (.*)\]$/)[1]
        .toLowerCase();
};
exports.getType = getType;
// 修改对象键名
function modifyObjectKey(obj, oldKey, newKey) {
    if (!obj.hasOwnProperty(oldKey)) {
        return obj;
    }
    const newObj = {};
    Object.keys(obj).forEach(key => {
        if (key === oldKey) {
            newObj[newKey] = obj[key];
        }
        else {
            newObj[key] = obj[key];
        }
    });
    return newObj;
}
exports.modifyObjectKey = modifyObjectKey;
/**
 * interpolate function
 * @param {string} str - 'hello {{name}}'
 * @param {object} data - { name: 'sam' }
 * @returns {string} 'hello sam'
 *
*/
function interpolate(str, data) {
    return str.replace(/{{\s*(\w+)(\s*,\s*[^}]+)?\s*}}/g, (match, p1) => {
        const key = p1.trim();
        return data[key] !== undefined ? String(data[key]) : match;
    });
}
exports.interpolate = interpolate;
// Execute the callback when detecting browser refresh or close, but skip processing for page navigation
function initBrowserCloseDetection(callback) {
    if (window === null || window === void 0 ? void 0 : window.addEventListener) {
        // Trigger condition: close tab、refresh、navigate
        window.addEventListener('beforeunload', (event) => {
            const navigationEntries = (performance === null || performance === void 0 ? void 0 : performance.getEntriesByType('navigation')) || [];
            const navigationEntry = navigationEntries[0];
            // @ts-ignore
            if (navigationEntry && navigationEntry.type === 'navigate') {
                return;
            }
            callback(event);
        });
    }
}
exports.initBrowserCloseDetection = initBrowserCloseDetection;
