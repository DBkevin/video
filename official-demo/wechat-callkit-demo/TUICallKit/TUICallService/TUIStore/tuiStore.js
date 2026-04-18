"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../const/index");
const callStore_1 = __importDefault(require("./callStore"));
const common_utils_1 = require("../utils/common-utils");
class TUIStore {
    constructor() {
        this.timerId = -1;
        this.storeMap = {
            [index_1.StoreName.CALL]: new callStore_1.default(),
        };
        // todo 此处后续优化结构后调整
        this.task = {}; // 保存监听回调列表
    }
    /**
     * 获取 TUIStore 实例
     * @returns {TUIStore}
    */
    static getInstance() {
        if (!TUIStore.instance) {
            TUIStore.instance = new TUIStore();
        }
        return TUIStore.instance;
    }
    /**
     * UI 组件注册监听回调
     * @param {StoreName} storeName store 名称
     * @param {IOptions} options 监听信息
     * @param {Object} params 扩展参数
     * @param {String} params.notifyRangeWhenWatch 注册时监听时的通知范围, 'all' - 通知所有注册该 key 的监听; 'myself' - 通知本次注册该 key 的监听; 默认不通知
    */
    watch(storeName, options, params) {
        if (!this.task[storeName]) {
            this.task[storeName] = {};
        }
        const watcher = this.task[storeName];
        Object.keys(options).forEach((key) => {
            const callback = options[key];
            if (!watcher[key]) {
                watcher[key] = new Map();
            }
            watcher[key].set(callback, 1);
            const { notifyRangeWhenWatch } = params || {};
            // 注册监听后, 通知所有注册该 key 的监听，使用 'all' 时要特别注意是否对其他地方的监听产生影响
            if (notifyRangeWhenWatch === index_1.NAME.ALL) {
                this.notify(storeName, key);
            }
            // 注册监听后, 仅通知自己本次监听该 key 的数据
            if (notifyRangeWhenWatch === index_1.NAME.MYSELF) {
                const data = this.getData(storeName, key);
                callback.call(this, data);
            }
        });
    }
    /**
     * UI 取消组件监听回调
     * @param {StoreName} storeName store 名称
     * @param {IOptions} options 监听信息,包含需要取消的回掉等
     */
    unwatch(storeName, options) {
        // todo 该接口暂未支持，unwatch掉同一类，如仅传入store注销掉该store下的所有callback，同样options仅传入key注销掉该key下的所有callback
        // options的callback function为必填参数，后续修改
        if (!this.task[storeName]) {
            return;
        }
        ;
        // if (isString(options)) {
        //   // 移除所有的监听
        //   if (options === '*') {
        //     const watcher = this.task[storeName];
        //     Object.keys(watcher).forEach(key => {
        //       watcher[key].clear();
        //     });
        //   } else {
        //     console.warn(`${NAME.PREFIX}unwatch warning: options is ${options}`);
        //   }
        //   return;
        // }
        const watcher = this.task[storeName];
        Object.keys(options).forEach((key) => {
            watcher[key].delete(options[key]);
        });
    }
    /**
     * 通用 store 数据更新，messageList 的变更需要单独处理
     * @param {StoreName} storeName store 名称
     * @param {string} key 变更的 key
     * @param {unknown} data 变更的数据
    */
    update(storeName, key, data) {
        var _a;
        // 基本数据类型时, 如果相等, 就不进行更新, 减少不必要的 notify
        if ((0, common_utils_1.isString)(data) || (0, common_utils_1.isNumber)(data) || (0, common_utils_1.isBoolean)(data)) {
            const currentData = this.storeMap[storeName]['store'][key]; // eslint-disable-line
            if (currentData === data)
                return;
        }
        (_a = this.storeMap[storeName]) === null || _a === void 0 ? void 0 : _a.update(key, data);
        this.notify(storeName, key);
    }
    /**
     * 获取 Store 的上一个状态值
     * @param {StoreName} storeName store 名称
     * @param {string} key 待获取的 key
     * @returns {Any}
    */
    getPrevData(storeName, key) {
        var _a;
        return (_a = this.storeMap[storeName]) === null || _a === void 0 ? void 0 : _a.getPrevData(key);
    }
    /**
     * 获取 Store 数据
     * @param {StoreName} storeName store 名称
     * @param {string} key 待获取的 key
     * @returns {Any}
    */
    getData(storeName, key) {
        var _a;
        return (_a = this.storeMap[storeName]) === null || _a === void 0 ? void 0 : _a.getData(key);
    }
    /**
     * UI 组件注册监听回调
     * @param {StoreName} storeName store 名称
     * @param {string} key 变更的 key
    */
    notify(storeName, key) {
        if (!this.task[storeName]) {
            return;
        }
        const watcher = this.task[storeName];
        if (watcher[key]) {
            const callbackMap = watcher[key];
            const data = this.getData(storeName, key);
            for (const [callback] of callbackMap.entries()) {
                callback.call(this, data);
            }
        }
    }
    reset(storeName, keyList = [], isNotificationNeeded = false) {
        if (storeName in this.storeMap) {
            const store = this.storeMap[storeName];
            // reset all
            if (keyList.length === 0) {
                keyList = Object.keys(store === null || store === void 0 ? void 0 : store.store);
            }
            store.reset(keyList);
            if (isNotificationNeeded) {
                keyList.forEach((key) => {
                    this.notify(storeName, key);
                });
            }
        }
    }
    // 批量修改多个 key-value
    updateStore(params, name) {
        const storeName = name ? name : index_1.StoreName.CALL;
        Object.keys(params).forEach((key) => {
            this.update(storeName, key, params[key]);
        });
    }
}
exports.default = TUIStore;
