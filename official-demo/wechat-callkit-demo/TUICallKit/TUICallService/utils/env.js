"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IS_WX_HARMONY = exports.IS_MAC = exports.IS_WIN = exports.IS_PC = exports.IS_H5 = exports.APP_NAMESPACE = exports.IN_BROWSER = exports.IN_UNI_APP = exports.IN_MINI_APP = exports.IN_UNI_NATIVE_APP = exports.IN_WX_MINI_APP = void 0;
// 在 uniApp 框架下，打包 H5、ios app、android app 时存在 wx/qq/tt/swan/my 等变量会导致引入 web sdk 环境判断失效
// 小程序 getSystemInfoSync 返回的 fontSizeSetting 在 H5 和 app 中为 undefined，所以通过 fontSizeSetting 增强小程序环境判断
// wx 小程序
exports.IN_WX_MINI_APP = (typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function' && Boolean(wx.getSystemInfoSync().fontSizeSetting));
// 用 uni-app 打包 native app，此时运行于 js core，无 window 等对象，此时调用 api 都得 uni.xxx，由于风格跟小程序类似，就归为 IN_MINI_APP 的一种
exports.IN_UNI_NATIVE_APP = (typeof uni !== 'undefined' && typeof uni === 'undefined');
exports.IN_MINI_APP = exports.IN_WX_MINI_APP || exports.IN_UNI_NATIVE_APP;
exports.IN_UNI_APP = (typeof uni !== 'undefined');
// 在 uniApp 框架下，由于客户打包 ios app、android app 时 window 不一定存在，所以通过 !IN_MINI_APP 进行判断
// 非 uniApp 框架下，仍然通过 window 结合 IN_MINI_APP 进行判断，可兼容 Taro3.0+ 暴露 window 对象引起的 IN_BROWSER 判断失效问题
exports.IN_BROWSER = (function () {
    if (typeof uni !== 'undefined') {
        return !exports.IN_MINI_APP;
    }
    return (typeof window !== 'undefined') && !exports.IN_MINI_APP;
}());
// 命名空间
exports.APP_NAMESPACE = (function () {
    if (exports.IN_WX_MINI_APP) {
        return wx;
    }
    if (exports.IN_UNI_APP) {
        return uni;
    }
    return window;
}());
// eslint-disable-next-line no-mixed-operators
const USER_AGENT = exports.IN_BROWSER && window && window.navigator && window.navigator.userAgent || '';
const IS_ANDROID = /Android/i.test(USER_AGENT);
const IS_WIN_PHONE = /(?:Windows Phone)/.test(USER_AGENT);
const IS_SYMBIAN = /(?:SymbianOS)/.test(USER_AGENT);
const IS_IOS = /iPad/i.test(USER_AGENT) || /iPhone/i.test(USER_AGENT) || /iPod/i.test(USER_AGENT);
exports.IS_H5 = IS_ANDROID || IS_WIN_PHONE || IS_SYMBIAN || IS_IOS;
exports.IS_PC = exports.IN_BROWSER && !exports.IS_H5;
exports.IS_WIN = exports.IS_PC && USER_AGENT.includes('Windows NT');
exports.IS_MAC = exports.IS_PC && USER_AGENT.includes('Mac');
let IS_WX_HARMONY = false;
exports.IS_WX_HARMONY = IS_WX_HARMONY;
if (exports.IN_WX_MINI_APP) {
    exports.IS_WX_HARMONY = IS_WX_HARMONY = (((_a = wx.getSystemInfoSync()) === null || _a === void 0 ? void 0 : _a.system) || '').includes('Harmony');
}
