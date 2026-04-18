"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
exports.CallManager = void 0;
const index_1 = require("../../index");
const index_2 = require("../const/index");
const index_3 = require("../utils/validate/index");
const env_1 = require("../utils/env");
/**
 * @param {Number} sdkAppID      用户的sdkAppID           必传
 * @param {String} userID        用户的userID             必传
 * @param {String} userSig       用户的userSig            必传
 * @param {String} globalCallPagePath  跳转的路径          必传
 * @param {ChatSDK} tim           tim实例                 非必传
 */
const PREFIX = 'callManager';
class CallManager {
    constructor() {
        this._globalCallPagePath = '';
        this._handleCallStatusChange = (value) => __awaiter(this, void 0, void 0, function* () {
            switch (value) {
                case index_2.CallStatus.CALLING:
                case index_2.CallStatus.CONNECTED:
                    this._handleCallStatusToCalling();
                    break;
                case index_2.CallStatus.IDLE:
                    this._handleCallStatusToIdle();
                    break;
            }
        });
    }
    init(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sdkAppID, userID, userSig, globalCallPagePath, tim } = params;
            if (!globalCallPagePath) {
                console.error(`${PREFIX} globalCallPagePath Can not be empty!`);
                return;
            }
            ;
            this._globalCallPagePath = globalCallPagePath;
            try {
                yield index_1.TUICallKitAPI.init({
                    sdkAppID,
                    userID,
                    userSig,
                    tim,
                });
                this._watchTUIStore();
                // uniApp 小程序全局监听下，关闭悬浮窗
                if (!env_1.IN_WX_MINI_APP) {
                    index_1.TUICallKitAPI.enableFloatWindow(false);
                }
                ;
                console.log(`${PREFIX} init Ready!`);
            }
            catch (error) {
                console.error(`${PREFIX} init fail!`, error);
                throw error;
            }
        });
    }
    // =========================【监听 TUIStore 中的状态】=========================
    _watchTUIStore() {
        index_1.TUIStore === null || index_1.TUIStore === void 0 ? void 0 : index_1.TUIStore.watch(index_1.StoreName.CALL, {
            [index_1.NAME.CALL_STATUS]: this._handleCallStatusChange,
        }, {
            notifyRangeWhenWatch: index_1.NAME.MYSELF,
        });
    }
    _unwatchTUIStore() {
        index_1.TUIStore === null || index_1.TUIStore === void 0 ? void 0 : index_1.TUIStore.unwatch(index_1.StoreName.CALL, {
            [index_1.NAME.CALL_STATUS]: this._handleCallStatusChange,
        });
    }
    _handleCallStatusToCalling() {
        if (this.getRoute() === this._globalCallPagePath)
            return;
        // @ts-ignore
        wx.navigateTo({
            url: `/${this._globalCallPagePath}`,
            success: () => { },
            fail: () => {
                console.error(`${PREFIX} navigateTo fail!`);
            },
            complete: () => { },
        });
    }
    _handleCallStatusToIdle() {
        if (this.getRoute() !== this._globalCallPagePath)
            return;
        // @ts-ignore
        wx.navigateBack({
            success: () => { },
            fail: () => {
                console.error(`${PREFIX} navigateBack fail!`);
            },
            complete: () => { },
        });
    }
    // 获取当前的页面地址
    getRoute() {
        // @ts-ignore
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        return currentPage.route;
    }
    // 卸载 callManger
    destroyed() {
        return __awaiter(this, void 0, void 0, function* () {
            this._globalCallPagePath = '';
            this._unwatchTUIStore();
            yield index_1.TUICallKitAPI.destroyed();
        });
    }
}
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CallManager.prototype, "init", null);
exports.CallManager = CallManager;
