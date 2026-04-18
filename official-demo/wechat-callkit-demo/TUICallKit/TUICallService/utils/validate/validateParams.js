"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paramValidate = void 0;
const common_utils_1 = require("../common-utils");
const index_1 = require("../../const/index");
const PREFIX = index_1.NAME.PREFIX + "API";
function paramValidate(config) {
    return function (target, propertyName, descriptor) {
        let method = descriptor.value;
        descriptor.value = function (...args) {
            doValidate.call(this, config, args, propertyName);
            return method.apply(this, args);
        };
        return descriptor;
    };
}
exports.paramValidate = paramValidate;
function doValidate(config, args, name) {
    try {
        // 兼容 init 方法中： SDKAppID sdkAppID 两种写法的参数校验判断
        if (!args[0].SDKAppID) {
            config = (0, common_utils_1.modifyObjectKey)(config, "SDKAppID", "sdkAppID");
        }
        if ((0, common_utils_1.isArray)(config)) {
            for (let i = 0; i < config.length; i++) {
                check.call(this, Object.assign(Object.assign({}, config[i]), { value: args[i], name }));
            }
        }
        else {
            for (const key in config) {
                if (config.hasOwnProperty(key)) {
                    check.call(this, Object.assign(Object.assign({}, config[key]), { value: args[0][key], name,
                        key }));
                }
            }
        }
    }
    catch (error) {
        console.error(error);
        throw error;
    }
}
function check({ required, rules, range, value, allowEmpty, name, key }) {
    // 用户没传指定参数
    if ((0, common_utils_1.isUndefined)(value)) {
        // 检查必填参数, 若配置是必填则报错
        if (required) {
            throw new Error(`${PREFIX}<${name}>: ${key} is required.`);
        }
        else {
            return;
        }
    }
    // 判断参数类型是否正确
    const result = rules.some((item) => item === (0, common_utils_1.getType)(value));
    let type = '';
    if (!result) {
        for (let i = 0; i < rules.length; i++) {
            let str = rules[i];
            str = str.replace(str[0], str[0].toUpperCase());
            type += `${str}/`;
        }
        type = type.substring(0, type.length - 1);
        throw new Error(`${PREFIX}<${name}>: ${key} must be ${type}, current ${key} is ${typeof value}.`);
    }
    // 不允许传空值, 例如: '', '  '
    if (allowEmpty === false) {
        const isEmptyString = (0, common_utils_1.isString)(value) && value.trim() === '';
        if (isEmptyString) {
            throw new Error(`${PREFIX}<${name}>: ${key} is blank.`);
        }
    }
    // 判断是否符合限制条件
    if ((0, common_utils_1.isArray)(range)) {
        if (range && range.indexOf(value) === -1) {
            throw new Error(`${PREFIX}<${name}>: ${key} error, only be ${range}, current ${key} is ${value}.`);
        }
    }
    // 取值范围, 前闭后闭
    if ((0, common_utils_1.isString)(range) && range.indexOf('~') !== -1) {
        const valueList = range.split('~');
        if (value < +valueList[0] || value > +valueList[1] || ((0, common_utils_1.isNumber)(value) && Number.isNaN(value))) {
            throw new Error(`${PREFIX}<${name}>: ${key} error, only be ${range}, current ${key} is ${value}.`);
        }
    }
}
