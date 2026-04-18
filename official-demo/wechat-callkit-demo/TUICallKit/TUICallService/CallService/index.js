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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiDesign = exports.TUIStore = exports.TUIGlobal = void 0;
const index_1 = require("../const/index");
// @ts-ignore
const call_engine_lite_wx_1 = require("@trtc/call-engine-lite-wx");
const miniProgram_1 = require("./miniProgram");
const index_2 = require("../locales/index");
const bellContext_1 = require("./bellContext");
const index_3 = require("../utils/validate/index");
const common_utils_1 = require("../utils/common-utils");
const utils_1 = require("./utils");
const timer_1 = __importDefault(require("../utils/timer"));
const tuiGlobal_1 = __importDefault(require("../TUIGlobal/tuiGlobal"));
const tuiStore_1 = __importDefault(require("../TUIStore/tuiStore"));
const UIDesign_1 = require("./UIDesign");
const chatCombine_1 = __importDefault(require("./chatCombine"));
const engineEventHandler_1 = __importDefault(require("./engineEventHandler"));
const TUIGlobal = tuiGlobal_1.default.getInstance();
exports.TUIGlobal = TUIGlobal;
const TUIStore = tuiStore_1.default.getInstance();
exports.TUIStore = TUIStore;
const uiDesign = UIDesign_1.UIDesign.getInstance();
exports.uiDesign = uiDesign;
uiDesign.setTUIStore(TUIStore);
const version = '4.2.11';
class TUICallService {
    constructor() {
        this._tim = null;
        this._TUICore = null;
        this._timerId = -1;
        this._startTimeStamp = (0, common_utils_1.performanceNow)();
        this._bellContext = null;
        this._isFromChat = false;
        this._currentGroupId = ''; // The currentGroupId of the group chat that the user is currently in
        this._offlinePushInfo = null;
        this._permissionCheckTimer = null;
        this._chatCombine = null;
        this._engineEventHandler = null;
        this._isInitialized = false;
        // =========================【监听 TUIStore 中的状态及处理】=========================
        this._handleCallStatusChange = (value) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const bellParams = {
                    callRole: TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_ROLE),
                    callStatus: TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS),
                };
                (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
                    name: 'TUICallkit._handleCallStatusChange.start',
                    data: { bellParams }
                });
                this._bellContext.setBellProperties(bellParams);
                if (value === index_1.CallStatus.CALLING) {
                    (_c = this === null || this === void 0 ? void 0 : this._bellContext) === null || _c === void 0 ? void 0 : _c.play();
                }
                else {
                    (_e = (_d = this._tuiCallEngine) === null || _d === void 0 ? void 0 : _d.reportLog) === null || _e === void 0 ? void 0 : _e.call(_d, {
                        name: 'TUICallkit._bellContext.stop',
                    });
                    (_f = this === null || this === void 0 ? void 0 : this._bellContext) === null || _f === void 0 ? void 0 : _f.stop();
                    // 状态变更通知
                    if (value === index_1.CallStatus.CONNECTED) {
                        const isGroup = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_GROUP);
                        const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
                        const remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
                        const oldStatus = isGroup ? index_1.StatusChange.DIALING_GROUP : index_1.StatusChange.DIALING_C2C;
                        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_TIPS, '');
                        this.statusChanged && this.statusChanged({ oldStatus, newStatus: (0, utils_1.generateStatusChangeText)() });
                        if (!isGroup && callMediaType === index_1.CallMediaType.VIDEO) {
                            this.switchScreen(remoteUserInfoList[0].domId);
                        }
                    }
                }
            }
            catch (error) {
                console.warn(`${index_1.NAME.PREFIX}handleCallStatusChange, ${error}.`);
            }
        });
        console.log(`${index_1.NAME.PREFIX}version: ${version}`);
        this._wasmReadyPromise = new Promise(resolve => {
            this._wasmReadyResolve = resolve;
        });
        this._loadWasm();
        this._watchTUIStore();
        this._engineEventHandler = engineEventHandler_1.default.getInstance({ callService: this });
        this._chatCombine = chatCombine_1.default.getInstance({ callService: this });
    }
    static getInstance() {
        if (!TUICallService.instance) {
            TUICallService.instance = new TUICallService();
        }
        return TUICallService.instance;
    }
    _loadWasm() {
        call_engine_lite_wx_1.TUICallEngine.once('ready', () => this._wasmReadyResolve());
    }
    init(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._isInitialized) {
                console.warn('TUICallKit has already been initialized.');
                return;
            }
            yield this._wasmReadyPromise;
            if (!this._isInitialized) {
                yield this._doInit(params);
                this._isInitialized = true;
            }
        });
    }
    _doInit(params) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._tuiCallEngine)
                    return;
                // @ts-ignore
                let { userID, tim, userSig, sdkAppID, SDKAppID, isFromChat, component = index_1.COMPONENT.TUI_CALL_KIT } = params;
                if (this._TUICore) {
                    sdkAppID = this._TUICore.SDKAppID;
                    tim = this._TUICore.tim;
                }
                this._tim = tim;
                console.log(`${index_1.NAME.PREFIX}init sdkAppId: ${sdkAppID || SDKAppID}, userId: ${userID}`);
                let scene = `web`;
                // To distinguish whether the UniApp mini-program chooses Vue 2 or Vue 3
                let vueVersion = 2;
                // #ifdef VUE3
                vueVersion = 3;
                // #endif
                scene = `wx-uniapp-vue${vueVersion}`;
                this._tuiCallEngine = call_engine_lite_wx_1.TUICallEngine.createInstance({
                    tim,
                    // @ts-ignore
                    sdkAppID: sdkAppID || SDKAppID,
                    callkitVersion: version,
                    isFromChat: isFromChat || false,
                    component,
                    scene,
                });
                uiDesign.setEngineInstance(this._tuiCallEngine);
                this._addListenTuiCallEngineEvent();
                if (this._bellContext) {
                    (_a = this._bellContext) === null || _a === void 0 ? void 0 : _a.destroy();
                }
                this._bellContext = new bellContext_1.BellContext();
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO, { userId: userID });
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN, { userId: userID });
                uiDesign.updateViewBackgroundUserId('local');
                yield this._tuiCallEngine.login({ userID, userSig, assetsPath: '' }); // web && mini
                const uiConfig = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG);
                (_c = (_b = this._tuiCallEngine) === null || _b === void 0 ? void 0 : _b.reportLog) === null || _c === void 0 ? void 0 : _c.call(_b, {
                    name: 'TUICallkit.init',
                    data: {
                        uiConfig,
                    }
                });
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}init failed, error: ${error}.`);
                throw error;
            }
        });
    }
    // component destroy
    destroyed() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._isInitialized = false;
                const currentCallStatus = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS);
                if (currentCallStatus !== index_1.CallStatus.IDLE) {
                    throw new Error(`please destroyed when status is idle, current status: ${currentCallStatus}`);
                }
                if (this._tuiCallEngine) {
                    this._removeListenTuiCallEngineEvent();
                    yield this._tuiCallEngine.destroyInstance();
                    this._tuiCallEngine = null;
                }
                (_a = this._bellContext) === null || _a === void 0 ? void 0 : _a.destroy();
                this._bellContext = null;
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}destroyed failed, error: ${error}.`);
                throw error;
            }
        });
    }
    // ===============================【通话操作】===============================
    inviteUser(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) === index_1.CallStatus.IDLE)
                return; // avoid double click when application stuck
            try {
                const { userIDList } = params;
                let inviteUserInfoList = yield (0, utils_1.getRemoteUserProfile)(userIDList, this.getTim());
                const remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
                const userIDListNotInRemoteUserInfoList = userIDList.filter(userId => {
                    return !remoteUserInfoList.some(remoteUserInfo => remoteUserInfo.userId === userId);
                });
                if (userIDListNotInRemoteUserInfoList.length === 0) {
                    return;
                }
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, [...remoteUserInfoList, ...inviteUserInfoList]);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, [...remoteUserInfoList, ...inviteUserInfoList]);
                this._tuiCallEngine && (yield this._tuiCallEngine.inviteUser(params));
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}inviteUser failed, error: ${error}.`);
            }
        });
    }
    calls(callsParams) {
        return __awaiter(this, void 0, void 0, function* () {
            if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) !== index_1.CallStatus.IDLE)
                return; // avoid double click when application stuck
            try {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PUSHER_ID, index_1.NAME.NEW_PUSHER);
                const { userIDList, type, chatGroupID, offlinePushInfo } = callsParams;
                if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) !== index_1.CallStatus.IDLE)
                    return;
                const remoteUserInfoList = userIDList.map(userId => ({ userId }));
                yield this._updateCallStoreBeforeCall(type, remoteUserInfoList, chatGroupID);
                this.executeExternalBeforeCalling();
                callsParams.offlinePushInfo = Object.assign(Object.assign({}, this.getDefaultOfflinePushInfo()), offlinePushInfo);
                const response = yield this._tuiCallEngine.calls(callsParams);
                yield this._updateCallStoreAfterCall(userIDList, response);
            }
            catch (error) {
                this._handleCallError(error, 'calls');
            }
        });
    }
    join(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) === index_1.CallStatus.CONNECTED)
                return; // avoid double click when application stuck
            try {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PUSHER_ID, index_1.NAME.NEW_PUSHER);
                const updateStoreParams = {
                    [index_1.NAME.CALL_ROLE]: index_1.CallRole.CALLEE,
                    [index_1.NAME.IS_GROUP]: true,
                    [index_1.NAME.CALL_STATUS]: index_1.CallStatus.CONNECTED,
                    [index_1.NAME.CALL_MEDIA_TYPE]: TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE) || index_1.CallMediaType.AUDIO, // default audio callMediaType
                };
                TUIStore.updateStore(updateStoreParams, index_1.StoreName.CALL);
                const response = yield this._tuiCallEngine.join(params);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.IS_CLICKABLE, true);
                this.startTimer();
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PUSHER, response);
                this.setSoundMode(params.type === index_1.CallMediaType.AUDIO ? index_1.AudioPlayBackDevice.EAR : index_1.AudioPlayBackDevice.SPEAKER);
                const localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO, Object.assign(Object.assign({}, localUserInfo), { isEnter: true }));
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN, Object.assign(Object.assign({}, localUserInfo), { isEnter: true }));
                yield this.openMicrophone();
                (0, utils_1.setLocalUserInfoAudioVideoAvailable)(true, index_1.NAME.AUDIO);
                // // Current policy: By default, the camera remains off when joining GroupCall
                // if (TUIStore.getData(StoreName.CALL, NAME.CALL_MEDIA_TYPE) === CallMediaType.VIDEO) {
                //   await this.openCamera(NAME.LOCAL_VIDEO);
                //   setLocalUserInfoAudioVideoAvailable(true, NAME.VIDEO);
                // }
            }
            catch (error) {
                this._handleCallError(error, 'join');
            }
        });
    }
    // ===============================【其它对外接口】===============================
    getTUICallEngineInstance() {
        return (this === null || this === void 0 ? void 0 : this._tuiCallEngine) || null;
    }
    setLogLevel(level) {
        var _a;
        (_a = this === null || this === void 0 ? void 0 : this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.setLogLevel(level);
    }
    setLanguage(language) {
        console.warn(`${index_1.NAME.PREFIX}The miniProgram does not support setLanguage`);
    }
    enableFloatWindow(enable) {
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.ENABLE_FLOAT_WINDOW, enable);
    }
    setSelfInfo(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { nickName, avatar } = params;
            try {
                yield this._tuiCallEngine.setSelfInfo(nickName, avatar);
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}setSelfInfo failed, error: ${error}.`);
            }
        });
    }
    enableVirtualBackground(enable) {
        return __awaiter(this, void 0, void 0, function* () {
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.IS_SHOW_ENABLE_VIRTUAL_BACKGROUND, enable);
        });
    }
    // 修改默认铃声：只支持本地铃声文件，不支持在线铃声文件；修改铃声修改的是被叫的铃声
    setCallingBell(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            let isCheckFileExist = true;
            if (!isCheckFileExist) {
                console.warn(`${index_1.NAME.PREFIX}setCallingBell failed, filePath: ${filePath}.`);
                return;
            }
            const bellParams = { calleeBellFilePath: filePath };
            this._bellContext.setBellProperties(bellParams);
        });
    }
    enableMuteMode(enable) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const bellParams = { isMuteBell: enable };
                this._bellContext.setBellProperties(bellParams);
                yield this._bellContext.setBellMute(enable);
            }
            catch (error) {
                console.warn(`${index_1.NAME.PREFIX}enableMuteMode failed, error: ${error}.`);
            }
        });
    }
    hideFeatureButton(buttonName) {
        uiDesign.hideFeatureButton(buttonName);
    }
    setLocalViewBackgroundImage(url) {
        uiDesign.setLocalViewBackgroundImage(url);
    }
    setRemoteViewBackgroundImage(userId, url) {
        uiDesign.setRemoteViewBackgroundImage(userId, url);
    }
    setLayoutMode(layoutMode) {
        uiDesign.setLayoutMode(layoutMode);
    }
    setCameraDefaultState(isOpen) {
        uiDesign.setCameraDefaultState(isOpen);
    }
    // =============================【实验性接口】=============================
    callExperimentalAPI(jsonStr) {
        var _a, _b;
        const jsonObj = JSON.parse(jsonStr);
        if (jsonObj === jsonStr)
            return;
        const { api, params } = jsonObj;
        if (!api || !params)
            return;
        try {
            switch (api) {
                case 'forceUseV2API':
                    const { enable } = params;
                    TUIStore.update(index_1.StoreName.CALL, index_1.NAME.IS_FORCE_USE_V2_API, !!enable);
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, { name: 'TUICallKit.callExperimentalAPI.fail', data: { error } });
        }
    }
    // =============================【内部按钮操作方法】=============================
    accept() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const callStatus = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS);
            (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, {
                name: 'TUICallKit.accept.start',
                data: { callStatus },
            });
            if (callStatus === index_1.CallStatus.CONNECTED)
                return; // avoid double click when application stuck, especially for miniProgram
            try {
                const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
                const deviceMap = {
                    microphone: true,
                    camera: callMediaType === index_1.CallMediaType.VIDEO,
                };
                const currentDevicePermission = yield this._tuiCallEngine.deviceCheck(deviceMap);
                if (!currentDevicePermission) {
                    const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
                    if (typeof call_engine_lite_wx_1.devicePermissions === 'function') {
                        yield (0, call_engine_lite_wx_1.devicePermissions)(callMediaType);
                    }
                }
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PUSHER_ID, index_1.NAME.NEW_PUSHER);
                const response = yield this._tuiCallEngine.accept();
                yield this._handleAcceptResponse(response);
            }
            catch (error) {
                (_d = (_c = this._tuiCallEngine) === null || _c === void 0 ? void 0 : _c.reportLog) === null || _d === void 0 ? void 0 : _d.call(_c, {
                    name: 'TUICallKit.accept.fail',
                    level: 'error',
                    error,
                });
                if ((0, common_utils_1.handleRepeatedCallError)(error))
                    return;
                (0, utils_1.noDevicePermissionToast)(error, index_1.CallMediaType.AUDIO, this._tuiCallEngine);
                this._resetCallStore();
            }
        });
    }
    _handleAcceptResponse(response) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (response) {
                // 小程序接通时会进行授权弹框, 状态需要放在 accept 后, 否则先接通后再拉起权限设置
                if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) === index_1.CallStatus.CONNECTED)
                    return;
                // C++ 回调异常时, 此时需要 callkit 主动打开音频, 否则出现小程序没有采集推音频流
                this.openMicrophone();
                // iOS 优化：立即停止铃声，避免状态变更延迟导致的铃声持续
                (_a = this._bellContext) === null || _a === void 0 ? void 0 : _a.stop();
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS, index_1.CallStatus.CONNECTED);
                (_b = this._chatCombine) === null || _b === void 0 ? void 0 : _b.callTUIService({ message: (_c = response === null || response === void 0 ? void 0 : response.data) === null || _c === void 0 ? void 0 : _c.message });
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.IS_CLICKABLE, true);
                this.startTimer();
                const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
                const isCameraDefaultStateClose = this._getFeatureButtonDefaultState(index_1.FeatureButton.Camera) === index_1.ButtonState.Close;
                (callMediaType === index_1.CallMediaType.VIDEO) && !isCameraDefaultStateClose && (yield this.openCamera(index_1.NAME.LOCAL_VIDEO));
                response.pusher && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PUSHER, response.pusher);
                this.setSoundMode(callMediaType === index_1.CallMediaType.AUDIO ? index_1.AudioPlayBackDevice.EAR : index_1.AudioPlayBackDevice.SPEAKER);
                const localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO, Object.assign(Object.assign({}, localUserInfo), { isEnter: true }));
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN, Object.assign(Object.assign({}, localUserInfo), { isEnter: true }));
                (0, utils_1.setLocalUserInfoAudioVideoAvailable)(true, index_1.NAME.AUDIO); // web && mini default open audio
            }
        });
    }
    hangup() {
        return __awaiter(this, void 0, void 0, function* () {
            if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) === index_1.CallStatus.IDLE)
                return; // avoid double click when application stuck
            try {
                const response = yield this._tuiCallEngine.hangup();
                response === null || response === void 0 ? void 0 : response.forEach((item) => {
                    var _a, _b;
                    if ((item === null || item === void 0 ? void 0 : item.code) === 0) {
                        (_a = this._chatCombine) === null || _a === void 0 ? void 0 : _a.callTUIService({ message: (_b = item === null || item === void 0 ? void 0 : item.data) === null || _b === void 0 ? void 0 : _b.message });
                    }
                });
            }
            catch (error) {
                console.debug(error);
            }
            this._resetCallStore();
        });
    }
    reject() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) === index_1.CallStatus.IDLE)
                return; // avoid double click when application stuck
            try {
                const response = yield this._tuiCallEngine.reject();
                if ((response === null || response === void 0 ? void 0 : response.code) === 0) {
                    (_a = this._chatCombine) === null || _a === void 0 ? void 0 : _a.callTUIService({ message: (_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.message });
                }
            }
            catch (error) {
                console.debug(error);
            }
            this._resetCallStore();
        });
    }
    openCamera(videoViewDomID) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (TUIGlobal.isH5 || TUIGlobal.isWeChat) {
                    const currentPosition = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CAMERA_POSITION);
                    const isFrontCamera = currentPosition === index_1.CameraPosition.FRONT ? true : false;
                    this._tuiCallEngine.openCamera(videoViewDomID, isFrontCamera);
                }
                else {
                    yield this._tuiCallEngine.openCamera(videoViewDomID);
                }
                (0, utils_1.setLocalUserInfoAudioVideoAvailable)(true, index_1.NAME.VIDEO);
            }
            catch (error) {
                (0, utils_1.noDevicePermissionToast)(error, index_1.CallMediaType.VIDEO, this._tuiCallEngine);
                console.error(`${index_1.NAME.PREFIX}openCamera error: ${error}.`);
            }
        });
    }
    closeCamera() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._tuiCallEngine.closeCamera();
                (0, utils_1.setLocalUserInfoAudioVideoAvailable)(false, index_1.NAME.VIDEO);
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}closeCamera error: ${error}.`);
            }
        });
    }
    openMicrophone() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._tuiCallEngine.openMicrophone();
                (0, utils_1.setLocalUserInfoAudioVideoAvailable)(true, index_1.NAME.AUDIO);
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}openMicrophone failed, error: ${error}.`);
            }
        });
    }
    closeMicrophone() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._tuiCallEngine.closeMicrophone();
                (0, utils_1.setLocalUserInfoAudioVideoAvailable)(false, index_1.NAME.AUDIO);
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}closeMicrophone failed, error: ${error}.`);
            }
        });
    }
    switchScreen(userId) {
        if (!userId)
            return;
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.BIG_SCREEN_USER_ID, userId);
    }
    // support video to audio; not support audio to video
    switchCallMediaType() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
                if (callMediaType === index_1.CallMediaType.AUDIO) {
                    console.warn(`${index_1.NAME.PREFIX}switchCallMediaType failed, ${callMediaType} not support.`);
                    return;
                }
                const response = yield this._tuiCallEngine.switchCallMediaType(index_1.CallMediaType.AUDIO);
                if ((response === null || response === void 0 ? void 0 : response.code) === 0) {
                    (_a = this._chatCombine) === null || _a === void 0 ? void 0 : _a.callTUIService({ message: (_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.message });
                }
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE, index_1.CallMediaType.AUDIO);
                const isGroup = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_GROUP);
                const oldStatus = isGroup ? index_1.StatusChange.CALLING_GROUP_VIDEO : index_1.StatusChange.CALLING_C2C_VIDEO;
                const newStatus = (0, utils_1.generateStatusChangeText)();
                this.statusChanged && this.statusChanged({ oldStatus, newStatus });
                this.setSoundMode(index_1.AudioPlayBackDevice.EAR);
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}switchCallMediaType failed, error: ${error}.`);
            }
        });
    }
    switchCamera() {
        return __awaiter(this, void 0, void 0, function* () {
            const currentPosition = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CAMERA_POSITION);
            const targetPosition = currentPosition === index_1.CameraPosition.BACK ? index_1.CameraPosition.FRONT : index_1.CameraPosition.BACK;
            try {
                yield this._tuiCallEngine.switchCamera(targetPosition);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CAMERA_POSITION, targetPosition);
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}_switchCamera failed, error: ${error}.`);
            }
        });
    }
    setSoundMode(type) {
        var _a;
        try {
            let isEarPhone = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_EAR_PHONE);
            const soundMode = type || (isEarPhone ? index_1.AudioPlayBackDevice.SPEAKER : index_1.AudioPlayBackDevice.EAR); // UI 层切换时传参数
            (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.selectAudioPlaybackDevice(soundMode);
            if (type) {
                isEarPhone = type === index_1.AudioPlayBackDevice.EAR;
            }
            else {
                isEarPhone = !isEarPhone;
            }
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.IS_EAR_PHONE, isEarPhone);
        }
        catch (error) {
            console.error(`${index_1.NAME.PREFIX}setSoundMode failed, error: ${error}.`);
        }
    }
    setBlurBackground(enable) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.ENABLE_VIRTUAL_BACKGROUND, enable);
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}_setBlurBackground failed, error: ${error}.`);
            }
        });
    }
    // ==========================【TUICallEngine 事件处理】==========================
    _addListenTuiCallEngineEvent() {
        this._engineEventHandler.addListenTuiCallEngineEvent();
    }
    _removeListenTuiCallEngineEvent() {
        this._engineEventHandler.removeListenTuiCallEngineEvent();
    }
    setCallback(params) {
        const { beforeCalling, afterCalling, onMinimized, onMessageSentByMe, kickedOut, statusChanged } = params;
        beforeCalling && (this.beforeCalling = beforeCalling);
        afterCalling && (this.afterCalling = afterCalling);
        onMinimized && (this.onMinimized = onMinimized);
        onMessageSentByMe && (this.onMessageSentByMe = onMessageSentByMe);
        kickedOut && (this.kickedOut = kickedOut);
        statusChanged && (this.statusChanged = statusChanged);
    }
    toggleMinimize() {
        const isMinimized = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_MINIMIZED);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.IS_MINIMIZED, !isMinimized);
        console.log(`${index_1.NAME.PREFIX}toggleMinimize: ${isMinimized} -> ${!isMinimized}.`);
        this.onMinimized && this.onMinimized(isMinimized, !isMinimized);
    }
    executeExternalBeforeCalling() {
        this.beforeCalling && this.beforeCalling();
    }
    executeExternalAfterCalling() {
        this.afterCalling && this.afterCalling();
    }
    // 处理用户异常退出的情况, 小程序 ”右滑“、"左上角退出"; web 页面关闭浏览器或关闭 tab 页面
    handleExceptionExit(event) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const callStatus = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS);
                const callRole = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_ROLE);
                (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, { name: 'TUICallkit.handleExceptionExit', data: { callStatus, callRole } });
                if (callStatus === index_1.CallStatus.IDLE)
                    return;
                // 在呼叫状态下，被叫调用 reject，主叫调用 hangup
                if (callStatus === index_1.CallStatus.CALLING) {
                    if (callRole === index_1.CallRole.CALLER) {
                        yield (this === null || this === void 0 ? void 0 : this.hangup());
                    }
                    else {
                        yield (this === null || this === void 0 ? void 0 : this.reject());
                    }
                }
                if (callStatus === index_1.CallStatus.CONNECTED) {
                    yield (this === null || this === void 0 ? void 0 : this.hangup());
                }
                this === null || this === void 0 ? void 0 : this._resetCallStore();
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX} handleExceptionExit failed, error: ${error}.`);
            }
            if (event) {
                event.returnValue = '';
            }
        });
    }
    // 处理 pusher 内部错误，没有 live-pusher 能力时做出弹窗提示。
    handlePusherError(event) {
        var _a;
        if (((_a = event === null || event === void 0 ? void 0 : event.detail) === null || _a === void 0 ? void 0 : _a.errMsg) === 'fail:access denied') {
            (0, miniProgram_1.handleNoPusherCapabilityError)();
        }
    }
    // ========================【TUICallKit 组件属性设置方法】========================
    setVideoDisplayMode(displayMode) {
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.DISPLAY_MODE, displayMode);
    }
    setVideoResolution(resolution) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!resolution)
                    return;
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.VIDEO_RESOLUTION, resolution);
                yield ((_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.setVideoQuality(resolution));
            }
            catch (error) {
                console.warn(`${index_1.NAME.PREFIX}setVideoResolution failed, error: ${error}.`);
            }
        });
    }
    // 通话时长更新
    startTimer() {
        if (this._timerId === -1) {
            this._startTimeStamp = (0, common_utils_1.performanceNow)();
            this._timerId = timer_1.default.run(index_1.NAME.TIMEOUT, this._updateCallDuration.bind(this), { delay: 1000 });
        }
    }
    // =========================【private methods for service use】=========================
    // 处理 “呼叫” 抛出的异常
    _handleCallError(error, methodName) {
        this._permissionCheckTimer && clearInterval(this._permissionCheckTimer);
        if ((0, common_utils_1.handleRepeatedCallError)(error))
            return;
        (0, miniProgram_1.handlePackageError)(error); // 无套餐提示, 小程序 engine 不抛出 onError
        (0, utils_1.noDevicePermissionToast)(error, index_1.CallMediaType.AUDIO, this._tuiCallEngine);
        console.error(`${index_1.NAME.PREFIX}${methodName} failed, error: ${error}.`);
        this._resetCallStore();
        throw error;
    }
    _updateCallStoreBeforeCall(type, remoteUserInfoList, groupID) {
        return __awaiter(this, void 0, void 0, function* () {
            let callTips = index_2.CallTips.CALLER_CALLING_MSG;
            if (groupID || TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_MINIMIZED) || remoteUserInfoList.length > 1) {
                callTips = index_2.CallTips.CALLER_GROUP_CALLING_MSG;
            }
            console.warn(`呼叫前更新 call status: ${(!!groupID || remoteUserInfoList.length > 1)}, ${groupID}, ${JSON.stringify(remoteUserInfoList)}`);
            let updateStoreParams = {
                [index_1.NAME.CALL_MEDIA_TYPE]: type,
                [index_1.NAME.CALL_ROLE]: index_1.CallRole.CALLER,
                [index_1.NAME.REMOTE_USER_INFO_LIST]: remoteUserInfoList,
                [index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST]: remoteUserInfoList,
                [index_1.NAME.IS_GROUP]: (!!groupID || remoteUserInfoList.length > 1),
                [index_1.NAME.CALL_TIPS]: callTips,
                [index_1.NAME.GROUP_ID]: groupID
            };
            const pusher = { enableCamera: type === index_1.CallMediaType.VIDEO, enableMic: true }; // mini 默认打开麦克风
            updateStoreParams = Object.assign(Object.assign({}, updateStoreParams), { [index_1.NAME.PUSHER]: pusher });
            TUIStore.updateStore(updateStoreParams, index_1.StoreName.CALL);
            const callStatus = yield (0, miniProgram_1.beforeCall)(type, this); // 如果没有权限, 此时为 false. 因此需要在 call 后设置为 calling. 和 web 存在差异
            console.log(`${index_1.NAME.PREFIX}mini beforeCall return callStatus: ${callStatus}.`);
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS, callStatus);
            const remoteUserInfoLists = yield (0, utils_1.getRemoteUserProfile)(remoteUserInfoList.map(obj => obj.userId), this.getTim());
            if (remoteUserInfoLists.length > 0) {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, remoteUserInfoLists);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, remoteUserInfoLists);
            }
            const deviceMap = {
                microphone: true,
                camera: type === index_1.CallMediaType.VIDEO,
            };
            let hasDevicePermission = yield this._tuiCallEngine.deviceCheck(deviceMap);
            if (!hasDevicePermission) {
                this._permissionCheckTimer && clearInterval(this._permissionCheckTimer);
                this._permissionCheckTimer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    hasDevicePermission = yield this._tuiCallEngine.deviceCheck(deviceMap);
                    if (hasDevicePermission && this._permissionCheckTimer) {
                        clearInterval(this._permissionCheckTimer);
                        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS, index_1.CallStatus.CALLING);
                    }
                }), 500);
            }
        });
    }
    _updateCallStoreAfterCall(userIdList, response) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            if (response) {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.IS_CLICKABLE, true);
                (0, utils_1.updateRoomIdAndRoomIdType)(response === null || response === void 0 ? void 0 : response.roomID, response === null || response === void 0 ? void 0 : response.strRoomID);
                const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
                (_a = this._chatCombine) === null || _a === void 0 ? void 0 : _a.callTUIService({ message: (_b = response === null || response === void 0 ? void 0 : response.data) === null || _b === void 0 ? void 0 : _b.message });
                response.pusher && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PUSHER, response.pusher);
                this.setSoundMode(callMediaType === index_1.CallMediaType.AUDIO ? index_1.AudioPlayBackDevice.EAR : index_1.AudioPlayBackDevice.SPEAKER);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS, index_1.CallStatus.CALLING); // 小程序未授权时, 此时状态为 idle; web 直接设置为 calling
                const isCameraDefaultStateClose = this._getFeatureButtonDefaultState(index_1.FeatureButton.Camera) === index_1.ButtonState.Close;
                (callMediaType === index_1.CallMediaType.VIDEO) && !isCameraDefaultStateClose && (yield this.openCamera(index_1.NAME.LOCAL_VIDEO));
                const localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO, Object.assign(Object.assign({}, localUserInfo), { isEnter: true }));
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN, Object.assign(Object.assign({}, localUserInfo), { isEnter: true }));
                (0, utils_1.setLocalUserInfoAudioVideoAvailable)(true, index_1.NAME.AUDIO); // web && mini, default open audio
            }
            else {
                this._permissionCheckTimer && clearInterval(this._permissionCheckTimer);
                this._permissionCheckTimer = null;
                this._resetCallStore();
            }
        });
    }
    _getFeatureButtonDefaultState(buttonName) {
        var _a;
        const { button: buttonConfig } = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CUSTOM_UI_CONFIG);
        return (_a = buttonConfig === null || buttonConfig === void 0 ? void 0 : buttonConfig[buttonName]) === null || _a === void 0 ? void 0 : _a.state;
    }
    _updateCallDuration() {
        const callDurationNum = Math.round(((0, common_utils_1.performanceNow)() - this._startTimeStamp) / 1000); // miniProgram stop timer when background
        const callDurationStr = (0, common_utils_1.formatTime)(callDurationNum);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_DURATION, callDurationStr);
    }
    _stopTimer() {
        if (this._timerId !== -1) {
            timer_1.default.clearTask(this._timerId);
            this._timerId = -1;
        }
    }
    // clear all use avoidRepeatCall decorator state
    _cleanupAvoidRepeatCallState(methodName) {
        var _a, _b;
        (_b = (_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, { name: 'TUICallkit._cleanupAvoidRepeatCallState', data: {} });
        let methodsToClean = [];
        if (methodName) {
            methodsToClean = [this[methodName]];
        }
        else {
            methodsToClean = [
                this.calls,
                this.accept,
                this.hangup,
                this.reject,
            ];
        }
        methodsToClean === null || methodsToClean === void 0 ? void 0 : methodsToClean.forEach(method => {
            var _a;
            (_a = method === null || method === void 0 ? void 0 : method.clearCallState) === null || _a === void 0 ? void 0 : _a.call(method, this);
        });
    }
    _resetCallStore() {
        var _a;
        this._cleanupAvoidRepeatCallState();
        (_a = this._bellContext) === null || _a === void 0 ? void 0 : _a.stop();
        const oldStatusStr = (0, utils_1.generateStatusChangeText)();
        this._stopTimer();
        // localUserInfo, language 在通话结束后不需要清除
        // callStatus 清除需要通知; isMinimized 也需要通知（basic-vue3 中切小窗关闭后, 再呼叫还是小窗, 因此需要通知到组件侧）
        // isGroup 也不清除(engine 先抛 cancel 事件, 再抛 reject 事件)
        // displayMode、videoResolution 也不能清除, 组件不卸载, 这些属性也需保留, 否则采用默认值.
        // enableFloatWindow 不清除：开启/关闭悬浮窗功能。
        let notResetOrNotifyKeys = Object.keys(index_1.CALL_DATA_KEY).filter((key) => {
            switch (index_1.CALL_DATA_KEY[key]) {
                case index_1.NAME.CALL_STATUS:
                case index_1.NAME.LANGUAGE:
                case index_1.NAME.IS_GROUP:
                case index_1.NAME.DISPLAY_MODE:
                case index_1.NAME.VIDEO_RESOLUTION:
                case index_1.NAME.ENABLE_FLOAT_WINDOW:
                case index_1.NAME.LOCAL_USER_INFO:
                case index_1.NAME.IS_SHOW_ENABLE_VIRTUAL_BACKGROUND:
                case index_1.NAME.IS_FORCE_USE_V2_API:
                case index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN: {
                    return false;
                }
                default: {
                    return true;
                }
            }
        });
        notResetOrNotifyKeys = notResetOrNotifyKeys.map(key => index_1.CALL_DATA_KEY[key]);
        TUIStore.reset(index_1.StoreName.CALL, notResetOrNotifyKeys);
        const callStatus = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS);
        callStatus !== index_1.CallStatus.IDLE && TUIStore.reset(index_1.StoreName.CALL, [index_1.NAME.CALL_STATUS], true); // callStatus reset need notify
        TUIStore.reset(index_1.StoreName.CALL, [index_1.NAME.IS_MINIMIZED], true); // isMinimized reset need notify
        TUIStore.reset(index_1.StoreName.CALL, [index_1.NAME.IS_EAR_PHONE], true); // isEarPhone reset need notify
        TUIStore.reset(index_1.StoreName.CALL, [index_1.NAME.PUSHER_ID], true); // pusher unload reset need notify
        TUIStore.reset(index_1.StoreName.CALL, [index_1.NAME.ENABLE_VIRTUAL_BACKGROUND], true); // ENABLE_VIRTUAL_BACKGROUND reset need notify
        TUIStore.reset(index_1.StoreName.CALL, [index_1.NAME.IS_MUTE_SPEAKER], true); // IS_MUTE_SPEAKER reset need notify
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO, Object.assign(Object.assign({}, TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO)), { isVideoAvailable: false, isAudioAvailable: false }));
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN, Object.assign(Object.assign({}, TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN)), { isVideoAvailable: false, isAudioAvailable: false }));
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, []);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, []);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CAMERA_POSITION, index_1.CameraPosition.FRONT);
        const newStatusStr = (0, utils_1.generateStatusChangeText)();
        if (oldStatusStr !== newStatusStr) {
            this.statusChanged && this.statusChanged({ oldStatus: oldStatusStr, newStatus: newStatusStr });
        }
    }
    // =========================【Calling the Chat SDK APi】=========================
    // 获取群成员
    getGroupMemberList(count, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            const groupID = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.GROUP_ID);
            let groupMemberList = yield (0, utils_1.getGroupMemberList)(groupID, this.getTim(), count, offset);
            return groupMemberList;
        });
    }
    // 获取群信息
    getGroupProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            const groupID = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.GROUP_ID);
            return yield (0, utils_1.getGroupProfile)(groupID, this.getTim());
        });
    }
    _watchTUIStore() {
        TUIStore === null || TUIStore === void 0 ? void 0 : TUIStore.watch(index_1.StoreName.CALL, {
            [index_1.NAME.CALL_STATUS]: this._handleCallStatusChange,
        });
    }
    _unwatchTUIStore() {
        TUIStore === null || TUIStore === void 0 ? void 0 : TUIStore.unwatch(index_1.StoreName.CALL, {
            [index_1.NAME.CALL_STATUS]: this._handleCallStatusChange,
        });
    }
    // =========================【融合 chat 】=========================
    bindTUICore(TUICore) {
        this._TUICore = TUICore;
    }
    // =========================【set、get methods】=========================
    getTim() {
        var _a, _b;
        if (this._tim)
            return this._tim;
        if (!this._tuiCallEngine) {
            console.warn(`${index_1.NAME.PREFIX}getTim warning: _tuiCallEngine Instance is not available.`);
            return null;
        }
        return ((_a = this._tuiCallEngine) === null || _a === void 0 ? void 0 : _a.tim) || ((_b = this._tuiCallEngine) === null || _b === void 0 ? void 0 : _b.getTim()); // mini support getTim interface
    }
    setIsFromChat(isFromChat) {
        this._isFromChat = isFromChat;
    }
    setCurrentGroupId(groupId) {
        this._currentGroupId = groupId;
    }
    getCurrentGroupId() {
        return this._currentGroupId;
    }
    setDefaultOfflinePushInfo(offlinePushInfo) {
        this._offlinePushInfo = offlinePushInfo;
    }
    getDefaultOfflinePushInfo() {
        const localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
        if (this._offlinePushInfo) {
            return this._offlinePushInfo;
        }
        return {
            title: (localUserInfo === null || localUserInfo === void 0 ? void 0 : localUserInfo.displayUserInfo) || '',
            description: (0, index_2.t)('you have a new call'),
        };
    }
    getCallMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._chatCombine.getCallKitMessage(message, this.getTim());
        });
    }
}
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "init", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "inviteUser", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "calls", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "join", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "accept", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "hangup", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "reject", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "openCamera", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "closeCamera", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "openMicrophone", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "closeMicrophone", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TUICallService.prototype, "switchScreen", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "switchCallMediaType", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "switchCamera", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TUICallService.prototype, "setSoundMode", null);
__decorate([
    (0, index_3.avoidRepeatedCall)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], TUICallService.prototype, "setBlurBackground", null);
exports.default = TUICallService;
