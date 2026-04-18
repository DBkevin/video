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
exports.handleNoPusherCapabilityError = exports.handlePackageError = exports.beforeCall = exports.initAndCheckRunEnv = exports.checkRunPlatform = exports.initialUI = void 0;
const index_1 = require("../const/index");
function initialUI() {
    // 收起键盘
    // @ts-ignore
    wx.hideKeyboard && wx.hideKeyboard({
        complete: () => { },
    });
}
exports.initialUI = initialUI;
;
// 检测运行时环境, 当是微信开发者工具时, 提示用户需要手机调试
function checkRunPlatform() {
    // @ts-ignore
    const systemInfo = wx.getSystemInfoSync();
    if (systemInfo.platform === 'devtools') {
        // 当前运行在微信开发者工具里
        // @ts-ignore
        wx.showModal({
            icon: 'none',
            title: '运行环境提醒',
            content: '微信开发者工具不支持原生推拉流组件(即 <live-pusher> 和 <live-player> 标签)，请使用真机调试或者扫码预览。',
            showCancel: false,
        });
    }
}
exports.checkRunPlatform = checkRunPlatform;
;
function initAndCheckRunEnv() {
    initialUI(); // miniProgram 收起键盘, 隐藏 tabBar
    checkRunPlatform(); // miniProgram 检测运行时环境
}
exports.initAndCheckRunEnv = initAndCheckRunEnv;
function beforeCall(type, that) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            initAndCheckRunEnv();
            // 检查设备权限
            const deviceMap = {
                microphone: true,
                camera: type === index_1.CallMediaType.VIDEO,
            };
            const hasDevicePermission = yield that._tuiCallEngine.deviceCheck(deviceMap); // miniProgram 检查设备权限
            return hasDevicePermission ? index_1.CallStatus.CALLING : index_1.CallStatus.IDLE;
        }
        catch (error) {
            console.debug(error);
            return index_1.CallStatus.IDLE;
        }
    });
}
exports.beforeCall = beforeCall;
// 套餐问题提示, 小程序最低需要群组通话版, 1v1 通话版本使用 TRTC 就会报错
function handlePackageError(error) {
    if ((error === null || error === void 0 ? void 0 : error.code) === -1002) {
        // @ts-ignore
        wx.showModal({
            icon: 'none',
            title: 'error',
            content: (error === null || error === void 0 ? void 0 : error.message) || '',
            showCancel: false,
        });
    }
}
exports.handlePackageError = handlePackageError;
function handleNoPusherCapabilityError() {
    // @ts-ignore
    wx.showModal({
        icon: 'none',
        title: '权限提示',
        content: '当前小程序 appid 不具备 <live-pusher> 和 <live-player> 的使用权限，您将无法正常使用实时通话能力，请使用企业小程序账号申请权限后再进行开发体验',
        showCancel: false,
    });
}
exports.handleNoPusherCapabilityError = handleNoPusherCapabilityError;
