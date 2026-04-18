"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("../utils/env");
class TUIGlobal {
    constructor() {
        this.global = env_1.APP_NAMESPACE;
        this.isPC = false;
        this.isH5 = false;
        this.isWeChat = false;
        this.isApp = false;
        this.isUniPlatform = false;
        this.isOfficial = false;
        this.isWIN = false;
        this.isMAC = false;
        this.isWxHarmony = false;
        this.initEnv();
    }
    /**
     * 获取 TUIGlobal 实例
     * @returns {TUIGlobal}
    */
    static getInstance() {
        if (!TUIGlobal.instance) {
            TUIGlobal.instance = new TUIGlobal();
        }
        return TUIGlobal.instance;
    }
    initEnv() {
        this.isPC = env_1.IS_PC;
        this.isH5 = env_1.IS_H5;
        this.isWeChat = env_1.IN_WX_MINI_APP;
        this.isApp = env_1.IN_UNI_NATIVE_APP && !env_1.IN_WX_MINI_APP; // uniApp 打包小程序时 IN_UNI_NATIVE_APP 为 true，所以此处需要增加条件
        this.isUniPlatform = env_1.IN_UNI_APP;
        this.isWIN = env_1.IS_WIN;
        this.isMAC = env_1.IS_MAC;
        this.isWxHarmony = env_1.IS_WX_HARMONY;
    }
    initOfficial(SDKAppID) {
        this.isOfficial = (SDKAppID === 1400187352 || SDKAppID === 1400188366);
    }
}
exports.default = TUIGlobal;
