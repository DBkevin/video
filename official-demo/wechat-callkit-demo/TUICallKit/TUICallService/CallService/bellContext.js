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
exports.BellContext = void 0;
const index_1 = require("../const/index");
const common_utils_1 = require("../utils/common-utils");
const DEFAULT_CALLER_BELL_FILEPATH = '/TUICallKit/static/phone_dialing.mp3';
const DEFAULT_CALLEE_BELL_FILEPATH = '/TUICallKit/static/phone_ringing.mp3';
class BellContext {
    constructor() {
        this._bellContext = null;
        this._isMuteBell = false;
        this._calleeBellFilePath = DEFAULT_CALLEE_BELL_FILEPATH;
        this._callRole = index_1.CallRole.UNKNOWN;
        this._callStatus = index_1.CallStatus.IDLE;
        this._isPlaying = false;
        this._handleAudioInterruptionBegin = () => __awaiter(this, void 0, void 0, function* () {
            yield this.stop();
        });
        this._handleAudioInterruptionEnd = () => __awaiter(this, void 0, void 0, function* () {
            if (this._callStatus !== index_1.CallStatus.CALLING) {
                yield this.stop();
            }
            else {
                // 音频中断结束后，延时一下再重新播放，确保系统音频资源释放完成
                this._delayCallback(() => __awaiter(this, void 0, void 0, function* () {
                    if (this._callStatus === index_1.CallStatus.CALLING && !this._isPlaying) {
                        yield this.play();
                    }
                }), 100);
            }
        });
        // @ts-ignore
        this._bellContext = wx.createInnerAudioContext({ useWebAudioImplement: false });
        this._addListenBellContextEvent();
        this._bellContext.loop = true;
    }
    setBellSrc() {
        // @ts-ignore
        const fs = wx.getFileSystemManager();
        try {
            let playBellFilePath = DEFAULT_CALLER_BELL_FILEPATH;
            if (this._callRole === index_1.CallRole.CALLEE) {
                playBellFilePath = this._calleeBellFilePath || DEFAULT_CALLEE_BELL_FILEPATH;
            }
            fs.readFileSync(playBellFilePath, 'utf8', 0);
            this._bellContext.src = playBellFilePath;
        }
        catch (error) {
            console.warn(`${index_1.NAME.PREFIX}Failed to setBellSrc, ${error}`);
        }
    }
    setBellProperties(bellParams) {
        this._callRole = bellParams.callRole || this._callRole;
        this._callStatus = bellParams.callStatus || this._callStatus;
        this._calleeBellFilePath = bellParams.calleeBellFilePath || this._calleeBellFilePath;
        // undefined/false || isMuteBell => isMuteBell (不符合预期)
        this._isMuteBell = (0, common_utils_1.isUndefined)(bellParams.isMuteBell) ? this._isMuteBell : bellParams.isMuteBell;
    }
    play() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._callStatus !== index_1.CallStatus.CALLING) {
                    return;
                }
                // iOS 优化：增加更严格的状态检查
                if (this._callStatus !== index_1.CallStatus.CALLING || this._isPlaying) {
                    console.warn(`${index_1.NAME.PREFIX}play skipped, callStatus: ${this._callStatus}, isPlaying: ${this._isPlaying}`);
                    return;
                }
                this._isPlaying = true;
                this.setBellSrc();
                if (this._callRole === index_1.CallRole.CALLEE && !this._isMuteBell) {
                    // 再次检查状态，避免在设置过程中状态已变更
                    if (!this._isPlaying || this._callStatus !== index_1.CallStatus.CALLING)
                        return;
                    yield this._bellContext.play();
                    return;
                }
                if (this._callRole === index_1.CallRole.CALLER) {
                    // 再次检查状态，避免在设置过程中状态已变更
                    if (!this._isPlaying || this._callStatus !== index_1.CallStatus.CALLING)
                        return;
                    yield this._bellContext.play();
                    return;
                }
            }
            catch (error) {
                console.warn(`${index_1.NAME.PREFIX}Failed to play audio file, ${error}`);
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._isPlaying = false;
                // iOS 小程序音频停止优化：先暂停再停止，并添加延时确保操作完成
                if (this._bellContext) {
                    // 先暂停音频
                    this._bellContext.pause();
                    // iOS 需要短暂延时确保暂停操作完成
                    yield this._delay(100);
                    // 再停止音频
                    this._bellContext.stop();
                    // 重置音频源，确保彻底停止
                    this._bellContext.src = '';
                    // 再次延时确保所有操作完成
                    yield this._delay(100);
                }
            }
            catch (error) {
                console.warn(`${index_1.NAME.PREFIX}Failed to stop audio file, ${error}`);
            }
        });
    }
    setBellMute(enable) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._callStatus !== index_1.CallStatus.CALLING && this._callRole !== index_1.CallRole.CALLEE) {
                return;
            }
            if (enable) {
                yield this.stop();
            }
            else {
                yield this.play();
            }
        });
    }
    destroy() {
        try {
            this._isMuteBell = false;
            this._calleeBellFilePath = '';
            this._callRole = index_1.CallRole.UNKNOWN;
            this._callStatus = index_1.CallStatus.IDLE;
            this._isPlaying = false;
            this === null || this === void 0 ? void 0 : this._removeListenBellContextEvent();
            this._bellContext.destroy();
            this._bellContext = null;
        }
        catch (error) {
            console.warn(`${index_1.NAME.PREFIX}Failed to destroy, ${error}`);
        }
    }
    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    _delayCallback(callback, ms) {
        setTimeout(callback, ms);
    }
    _addListenBellContextEvent() {
        this._bellContext.onPlay(() => {
            var _a, _b;
            if (!this._isPlaying) {
                (_a = this._bellContext) === null || _a === void 0 ? void 0 : _a.pause();
                (_b = this._bellContext) === null || _b === void 0 ? void 0 : _b.stop();
            }
        });
        // @ts-ignore
        wx.onAudioInterruptionBegin(this._handleAudioInterruptionBegin);
        // @ts-ignore
        wx.onAudioInterruptionEnd(this._handleAudioInterruptionEnd);
    }
    _removeListenBellContextEvent() {
        // @ts-ignore
        wx.offAudioInterruptionBegin(this._handleAudioInterruptionBegin);
        // @ts-ignore
        wx.offAudioInterruptionEnd(this._handleAudioInterruptionEnd);
    }
}
exports.BellContext = BellContext;
