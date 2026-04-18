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
// @ts-ignore
const call_engine_lite_wx_1 = require("@trtc/call-engine-lite-wx");
const index_1 = require("../const/index");
const index_2 = require("../locales/index");
const miniProgram_1 = require("./miniProgram");
const utils_1 = require("./utils");
const promise_retry_1 = __importDefault(require("../utils/decorators/promise-retry"));
const UIDesign_1 = require("./UIDesign");
const tuiStore_1 = __importDefault(require("../TUIStore/tuiStore"));
const TUIStore = tuiStore_1.default.getInstance();
const uiDesign = UIDesign_1.UIDesign.getInstance();
class EngineEventHandler {
    constructor(options) {
        this._callService = options.callService;
    }
    static getInstance(options) {
        if (!EngineEventHandler.instance) {
            EngineEventHandler.instance = new EngineEventHandler(options);
        }
        return EngineEventHandler.instance;
    }
    addListenTuiCallEngineEvent() {
        var _a;
        const callEngine = (_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTUICallEngineInstance();
        if (!callEngine) {
            console.warn(`${index_1.NAME.PREFIX}add engine event listener failed, engine is empty.`);
            return;
        }
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.ERROR, this._handleError, this);
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.ON_CALL_RECEIVED, this._handleNewInvitationReceived, this); // 收到邀请事件
        (call_engine_lite_wx_1.TUICallEvent === null || call_engine_lite_wx_1.TUICallEvent === void 0 ? void 0 : call_engine_lite_wx_1.TUICallEvent.ON_CALL_BEGIN) && callEngine.on(call_engine_lite_wx_1.TUICallEvent.ON_CALL_BEGIN, this._handleOnCallBegin, this); // 主叫收到被叫接通事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.USER_ENTER, this._handleUserEnter, this); // 有用户进房事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.USER_LEAVE, this._handleUserLeave, this); // 有用户离开通话事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.REJECT, this._handleInviteeReject, this); // 主叫收到被叫的拒绝通话事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.NO_RESP, this._handleNoResponse, this); // 主叫收到被叫的无应答事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.LINE_BUSY, this._handleLineBusy, this); // 主叫收到被叫的忙线事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.ON_CALL_NOT_CONNECTED, this._handleCallNotConnected, this); // 主被叫在通话未建立时, 收到的取消事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.ON_USER_INVITING, this._handleOnUserInviting, this); // 通话存在邀请他人时, 通话里的所有人都会抛出
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.SDK_READY, this._handleSDKReady, this); // SDK Ready 回调
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.KICKED_OUT, this._handleKickedOut, this); // 未开启多端登录时, 多端登录收到的被踢事件
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.MESSAGE_SENT_BY_ME, this._messageSentByMe, this);
        // @ts-ignore
        call_engine_lite_wx_1.TUICallEvent.CALL_MESSAGE && callEngine.on(call_engine_lite_wx_1.TUICallEvent.CALL_MESSAGE, this._handleCallMessage, this); // call message card display event
        // @ts-ignore
        call_engine_lite_wx_1.TUICallEvent.ON_USER_NETWORK_QUALITY_CHANGED && callEngine.on(call_engine_lite_wx_1.TUICallEvent.ON_USER_NETWORK_QUALITY_CHANGED, this._handleNetworkQuality, this); // 用户网络质量
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.USER_VIDEO_AVAILABLE, this._handleUserVideoAvailable, this);
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.USER_AUDIO_AVAILABLE, this._handleUserAudioAvailable, this);
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.ON_CALL_END, this._handleCallingEnd, this); // 主被叫在通话结束时, 收到的通话结束事件
        // @ts-ignore
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.CALL_MODE, this._handleCallTypeChange, this);
        // @ts-ignore
        callEngine.on(call_engine_lite_wx_1.TUICallEvent.USER_UPDATE, this._handleUserUpdate, this); // mini: user data update
    }
    removeListenTuiCallEngineEvent() {
        var _a;
        const callEngine = (_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTUICallEngineInstance();
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.ERROR, this._handleError, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.ON_CALL_RECEIVED, this._handleNewInvitationReceived, this);
        (call_engine_lite_wx_1.TUICallEvent === null || call_engine_lite_wx_1.TUICallEvent === void 0 ? void 0 : call_engine_lite_wx_1.TUICallEvent.ON_CALL_BEGIN) && callEngine.off(call_engine_lite_wx_1.TUICallEvent.ON_CALL_BEGIN, this._handleOnCallBegin, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.USER_ENTER, this._handleUserEnter, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.USER_LEAVE, this._handleUserLeave, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.REJECT, this._handleInviteeReject, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.NO_RESP, this._handleNoResponse, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.LINE_BUSY, this._handleLineBusy, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.ON_CALL_NOT_CONNECTED, this._handleCallNotConnected, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.ON_USER_INVITING, this._handleOnUserInviting, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.SDK_READY, this._handleSDKReady, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.KICKED_OUT, this._handleKickedOut, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.MESSAGE_SENT_BY_ME, this._messageSentByMe, this);
        // @ts-ignore
        call_engine_lite_wx_1.TUICallEvent.ON_USER_NETWORK_QUALITY_CHANGED && callEngine.off(call_engine_lite_wx_1.TUICallEvent.ON_USER_NETWORK_QUALITY_CHANGED, this._handleNetworkQuality, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.USER_VIDEO_AVAILABLE, this._handleUserVideoAvailable, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.USER_AUDIO_AVAILABLE, this._handleUserAudioAvailable, this);
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.CALL_END, this._handleCallingEnd, this);
        // @ts-ignore
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.CALL_MODE, this._handleCallTypeChange, this); // 切换通话事件 miniProgram CALL_MODE
        // @ts-ignore
        callEngine.off(call_engine_lite_wx_1.TUICallEvent.USER_UPDATE, this._handleUserUpdate, this); // mini: user data update
    }
    _callerChangeToConnected() {
        var _a, _b, _c;
        const callRole = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_ROLE);
        const callStatus = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS);
        if (callStatus === index_1.CallStatus.CALLING && callRole === index_1.CallRole.CALLER) {
            // iOS 优化：主叫状态变更时立即停止铃声
            (_b = (_a = this._callService) === null || _a === void 0 ? void 0 : _a._bellContext) === null || _b === void 0 ? void 0 : _b.stop();
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS, index_1.CallStatus.CONNECTED);
            (_c = this._callService) === null || _c === void 0 ? void 0 : _c.startTimer();
        }
    }
    _unNormalEventsManager(event, eventName) {
        var _a, _b;
        console.log(`${index_1.NAME.PREFIX}${eventName} event data: ${JSON.stringify(event)}.`);
        const isGroup = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_GROUP);
        const remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
        switch (eventName) {
            case call_engine_lite_wx_1.TUICallEvent.REJECT:
            case call_engine_lite_wx_1.TUICallEvent.LINE_BUSY: {
                const { userID: userId } = (0, utils_1.analyzeEventData)(event);
                let callTipsKey = eventName === call_engine_lite_wx_1.TUICallEvent.REJECT ? index_2.CallTips.OTHER_SIDE_REJECT_CALL : index_2.CallTips.OTHER_SIDE_LINE_BUSY;
                let userListNeedToShow = '';
                if (isGroup) {
                    userListNeedToShow = (remoteUserInfoList.find(obj => obj.userId === userId) || {}).displayUserInfo || userId;
                    callTipsKey = eventName === call_engine_lite_wx_1.TUICallEvent.REJECT ? index_2.CallTips.REJECT_CALL : index_2.CallTips.IN_BUSY;
                }
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.TOAST_INFO, { content: { key: callTipsKey, options: { userList: userListNeedToShow } } });
                userId && (0, utils_1.deleteRemoteUser)([userId]);
                if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST).length === 0) {
                    (_a = this._callService) === null || _a === void 0 ? void 0 : _a._resetCallStore();
                }
                break;
            }
            case call_engine_lite_wx_1.TUICallEvent.NO_RESP: {
                const { userIDList = [] } = (0, utils_1.analyzeEventData)(event);
                const callTipsKey = isGroup ? index_2.CallTips.TIMEOUT : index_2.CallTips.CALL_TIMEOUT;
                const userInfoList = userIDList.map(userId => {
                    const userInfo = remoteUserInfoList.find(obj => obj.userId === userId) || {};
                    return userInfo.displayUserInfo || userId;
                });
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.TOAST_INFO, { content: { key: callTipsKey, options: { userList: userInfoList.join() } } });
                userIDList.length > 0 && (0, utils_1.deleteRemoteUser)(userIDList);
                break;
            }
            case call_engine_lite_wx_1.TUICallEvent.ON_CALL_NOT_CONNECTED: {
                (_b = this._callService) === null || _b === void 0 ? void 0 : _b._resetCallStore();
                break;
            }
        }
    }
    _handleError(event) {
        var _a;
        const { code, message } = event || {};
        const index = Object.values(index_1.ErrorCode).indexOf(code);
        let callTips = '';
        if (index !== -1) {
            const key = Object.keys(index_1.ErrorCode)[index];
            callTips = (0, index_2.t)(index_1.ErrorMessage[key]);
            callTips && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.TOAST_INFO, { content: index_1.ErrorMessage[key], type: index_1.NAME.ERROR });
        }
        (_a = this._callService) === null || _a === void 0 ? void 0 : _a.executeExternalAfterCalling();
        console.error(`${index_1.NAME.PREFIX}_handleError, errorCode: ${code}; errorMessage: ${callTips || message}.`);
    }
    _handleNewInvitationReceived(event) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`${index_1.NAME.PREFIX}onCallReceived event data: ${JSON.stringify(event)}.`);
            const { callerId = '', callMediaType, inviteData = {}, calleeIdList = [], chatGroupID: groupID = '', roomID, strRoomID } = (0, utils_1.analyzeEventData)(event);
            const currentUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
            const remoteUserIdList = [callerId, ...calleeIdList.filter((userId) => userId !== currentUserInfo.userId)];
            const type = callMediaType || inviteData.callType;
            const callTipsKey = type === index_1.CallMediaType.AUDIO ? index_2.CallTips.CALLEE_CALLING_AUDIO_MSG : index_2.CallTips.CALLEE_CALLING_VIDEO_MSG;
            let updateStoreParams = {
                [index_1.NAME.CALL_ROLE]: index_1.CallRole.CALLEE,
                [index_1.NAME.IS_GROUP]: (!!groupID || calleeIdList.length > 1),
                [index_1.NAME.CALL_STATUS]: index_1.CallStatus.CALLING,
                [index_1.NAME.CALL_MEDIA_TYPE]: type,
                [index_1.NAME.CALL_TIPS]: callTipsKey,
                [index_1.NAME.CALLER_USER_INFO]: { userId: callerId },
                [index_1.NAME.GROUP_ID]: groupID,
            };
            (0, miniProgram_1.initAndCheckRunEnv)();
            const pusher = { enableCamera: type === index_1.CallMediaType.VIDEO, enableMic: true }; // mini 默认打开麦克风
            updateStoreParams = Object.assign(Object.assign({}, updateStoreParams), { [index_1.NAME.PUSHER]: pusher });
            (type === index_1.CallMediaType.VIDEO) && this._callService.openCamera(index_1.NAME.LOCAL_VIDEO);
            this._callService.openMicrophone();
            const deviceMap = {
                microphone: true,
                camera: type === index_1.CallMediaType.VIDEO,
            };
            this._callService._preDevicePermission = yield this._callService._tuiCallEngine.deviceCheck(deviceMap);
            (0, utils_1.updateRoomIdAndRoomIdType)(roomID, strRoomID);
            TUIStore.updateStore(updateStoreParams, index_1.StoreName.CALL);
            (_a = this._callService) === null || _a === void 0 ? void 0 : _a.executeExternalBeforeCalling();
            ((_b = this._callService) === null || _b === void 0 ? void 0 : _b.statusChanged) && ((_c = this._callService) === null || _c === void 0 ? void 0 : _c.statusChanged({ oldStatus: index_1.StatusChange.IDLE, newStatus: index_1.StatusChange.BE_INVITED }));
            const remoteUserInfoList = yield (0, utils_1.getRemoteUserProfile)(remoteUserIdList, (_d = this._callService) === null || _d === void 0 ? void 0 : _d.getTim());
            const [userInfo] = remoteUserInfoList.filter((userInfo) => userInfo.userId === callerId);
            remoteUserInfoList.length > 0 && TUIStore.updateStore({
                [index_1.NAME.REMOTE_USER_INFO_LIST]: remoteUserInfoList,
                [index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST]: remoteUserInfoList,
                [index_1.NAME.CALLER_USER_INFO]: {
                    userId: callerId,
                    nick: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nick) || '',
                    avatar: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.avatar) || '',
                    displayUserInfo: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.remark) || (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nick) || callerId,
                },
            }, index_1.StoreName.CALL);
        });
    }
    _handleOnCallBegin(event) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // iOS 优化：ON_CALL_BEGIN 事件时立即停止铃声
            (_b = (_a = this._callService) === null || _a === void 0 ? void 0 : _a._bellContext) === null || _b === void 0 ? void 0 : _b.stop();
            this._callerChangeToConnected();
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_TIPS, { text: 'answered', duration: 2000 });
            yield this._callService.openMicrophone();
            console.log(`${index_1.NAME.PREFIX}accept event data: ${JSON.stringify(event)}.`);
        });
    }
    _handleUserEnter(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userID: userId, data } = (0, utils_1.analyzeEventData)(event);
            if (userId && TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_ROLE) === index_1.CallRole.CALLEE) {
                if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) === index_1.CallStatus.CALLING) {
                    this._callService._handleAcceptResponse({});
                    this._callService._cleanupAvoidRepeatCallState('accept');
                }
            }
            this._callerChangeToConnected();
            (data === null || data === void 0 ? void 0 : data.playerList) && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PLAYER, data.playerList);
            yield this._addUserToRemoteUserInfoList(userId);
            let remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
            remoteUserInfoList = remoteUserInfoList.map((obj) => {
                if (obj.userId === userId)
                    obj.isEnter = true;
                return obj;
            });
            if (remoteUserInfoList.length > 0) {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, remoteUserInfoList);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, remoteUserInfoList);
                uiDesign.updateViewBackgroundUserId('remote');
            }
            console.log(`${index_1.NAME.PREFIX}userEnter event data: ${JSON.stringify(event)}.`);
        });
    }
    _handleUserLeave(event) {
        console.log(`${index_1.NAME.PREFIX}userLeave event data: ${JSON.stringify(event)}.`);
        const { data, userID: userId } = (0, utils_1.analyzeEventData)(event);
        (data === null || data === void 0 ? void 0 : data.playerList) && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PLAYER, data.playerList);
        if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_GROUP)) {
            const remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
            const userListNeedToShow = (remoteUserInfoList.find(obj => obj.userId === userId) || {}).displayUserInfo || userId;
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.TOAST_INFO, { content: { key: index_2.CallTips.END_CALL, options: { userList: userListNeedToShow } } });
        }
        userId && (0, utils_1.deleteRemoteUser)([userId]);
    }
    _handleInviteeReject(event) {
        this._unNormalEventsManager(event, call_engine_lite_wx_1.TUICallEvent.REJECT);
    }
    _handleNoResponse(event) {
        this._unNormalEventsManager(event, call_engine_lite_wx_1.TUICallEvent.NO_RESP);
    }
    _handleLineBusy(event) {
        this._unNormalEventsManager(event, call_engine_lite_wx_1.TUICallEvent.LINE_BUSY);
    }
    _handleCallNotConnected(event) {
        var _a, _b, _c;
        (_b = (_a = this === null || this === void 0 ? void 0 : this._callService) === null || _a === void 0 ? void 0 : _a._cleanupAvoidRepeatCallState) === null || _b === void 0 ? void 0 : _b.call(_a);
        (_c = this._callService) === null || _c === void 0 ? void 0 : _c.executeExternalAfterCalling();
        this._unNormalEventsManager(event, call_engine_lite_wx_1.TUICallEvent.ON_CALL_NOT_CONNECTED);
    }
    _handleOnUserInviting(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userID: userId } = (0, utils_1.analyzeEventData)(event);
            if (!userId)
                return;
            if (userId !== TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO).userId) {
                yield this._addUserToRemoteUserInfoList(userId);
            }
        });
    }
    _handleCallingEnd(event) {
        var _a, _b;
        console.log(`${index_1.NAME.PREFIX}callEnd event data: ${JSON.stringify(event)}.`);
        (_a = this._callService) === null || _a === void 0 ? void 0 : _a.executeExternalAfterCalling();
        (_b = this._callService) === null || _b === void 0 ? void 0 : _b._resetCallStore();
    }
    // SDK_READY 后才能调用 tim 接口, 否则登录后立刻获取导致调用接口失败. v2.27.4+、v3 接口 login 后会抛出 SDK_READY
    _handleSDKReady(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
            localUserInfo = yield (0, utils_1.getMyProfile)(localUserInfo.userId, (_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTim());
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO, localUserInfo);
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN, localUserInfo);
        });
    }
    _handleKickedOut(event) {
        var _a, _b, _c;
        console.log(`${index_1.NAME.PREFIX}kickOut event data: ${JSON.stringify(event)}.`);
        ((_a = this._callService) === null || _a === void 0 ? void 0 : _a.kickedOut) && ((_b = this._callService) === null || _b === void 0 ? void 0 : _b.kickedOut(event));
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_TIPS, index_2.CallTips.KICK_OUT);
        (_c = this._callService) === null || _c === void 0 ? void 0 : _c._resetCallStore();
    }
    _messageSentByMe(event) {
        var _a, _b;
        const message = event === null || event === void 0 ? void 0 : event.data;
        ((_a = this._callService) === null || _a === void 0 ? void 0 : _a.onMessageSentByMe) && ((_b = this._callService) === null || _b === void 0 ? void 0 : _b.onMessageSentByMe(message));
    }
    _handleCallMessage(event) {
        const message = (0, utils_1.analyzeEventData)(event);
        this._callService._chatCombine.callTUIService({ message });
    }
    _handleCallTypeChange(event) {
        var _a;
        const { newCallType, type } = (0, utils_1.analyzeEventData)(event);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE, newCallType || type);
        (_a = this._callService) === null || _a === void 0 ? void 0 : _a.setSoundMode(index_1.AudioPlayBackDevice.EAR);
    }
    _handleNetworkQuality(event) {
        const { networkQualityList = [] } = (0, utils_1.analyzeEventData)(event);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.NETWORK_STATUS, networkQualityList);
        const isGroup = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_GROUP);
        const localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
        const remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
        if (!isGroup) {
            const isRemoteNetworkPoor = networkQualityList.find(user => { var _a; return ((_a = remoteUserInfoList[0]) === null || _a === void 0 ? void 0 : _a.userId) === (user === null || user === void 0 ? void 0 : user.userId) && (user === null || user === void 0 ? void 0 : user.quality) >= index_1.NETWORK_QUALITY_THRESHOLD; });
            if (isRemoteNetworkPoor) {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_TIPS, index_2.CallTips.REMOTE_NETWORK_IS_POOR);
                return;
            }
            ;
            const isLocalNetworkPoor = networkQualityList.find(user => (localUserInfo === null || localUserInfo === void 0 ? void 0 : localUserInfo.userId) === (user === null || user === void 0 ? void 0 : user.userId) && (user === null || user === void 0 ? void 0 : user.quality) >= index_1.NETWORK_QUALITY_THRESHOLD);
            if (isLocalNetworkPoor) {
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.CALL_TIPS, index_2.CallTips.LOCAL_NETWORK_IS_POOR);
                return;
            }
        }
    }
    // =============================【 WEB 私有事件】==============================
    _startRemoteView(userId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId) {
                console.warn(`${index_1.NAME.PREFIX}_startRemoteView userID is empty`);
                return;
            }
            try {
                const displayMode = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.DISPLAY_MODE);
                yield ((_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTUICallEngineInstance().startRemoteView({ userID: userId, videoViewDomID: `${userId}_0`, options: { objectFit: displayMode } }));
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}_startRemoteView error: ${error}.`);
                return Promise.reject(error);
            }
        });
    }
    _setRemoteUserInfoAudioVideoAvailable(isAvailable, type, userId) {
        let remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
        remoteUserInfoList = remoteUserInfoList.map((obj) => {
            if (obj.userId === userId) {
                if (type === index_1.NAME.AUDIO) {
                    return Object.assign(Object.assign({}, obj), { isAudioAvailable: isAvailable });
                }
                if (type === index_1.NAME.VIDEO) {
                    return Object.assign(Object.assign({}, obj), { isVideoAvailable: isAvailable });
                }
            }
            return obj;
        });
        if (remoteUserInfoList.length > 0) {
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, remoteUserInfoList);
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, remoteUserInfoList);
        }
    }
    _handleUserVideoAvailable(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userID: userId, isVideoAvailable } = (0, utils_1.analyzeEventData)(event);
            console.log(`${index_1.NAME.PREFIX}_handleUserVideoAvailable event data: ${JSON.stringify(event)}.`);
            this._setRemoteUserInfoAudioVideoAvailable(isVideoAvailable, index_1.NAME.VIDEO, userId);
            try {
                isVideoAvailable && (yield this._startRemoteView(userId));
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}_startRemoteView failed, error: ${error}.`);
            }
        });
    }
    _handleUserAudioAvailable(event) {
        const { userID: userId, isAudioAvailable } = (0, utils_1.analyzeEventData)(event);
        console.log(`${index_1.NAME.PREFIX}_handleUserAudioAvailable event data: ${JSON.stringify(event)}.`);
        this._setRemoteUserInfoAudioVideoAvailable(isAudioAvailable, index_1.NAME.AUDIO, userId);
    }
    _handleUserVoiceVolume(event) {
        try {
            const { volumeMap: volumeList } = (0, utils_1.analyzeEventData)(event);
            if ((volumeList || []).length === 0)
                return; // 减少不必要的更新
            const localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
            let remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
            const [localUserVolumeObj] = volumeList.filter((obj) => obj.userId === localUserInfo.userId);
            const remoteUserVolumeObj = volumeList.reduce((acc, obj) => {
                if (obj.userId !== localUserInfo.userId) {
                    return Object.assign(Object.assign({}, acc), { [obj.userId]: obj.audioVolume });
                }
                return acc;
            }, {});
            localUserInfo.volume = localUserVolumeObj.audioVolume;
            remoteUserInfoList = remoteUserInfoList.map((obj) => (Object.assign(Object.assign({}, obj), { volume: remoteUserVolumeObj[obj.userId] })));
            const updateStoreParams = {
                [index_1.NAME.LOCAL_USER_INFO]: localUserInfo,
                [index_1.NAME.REMOTE_USER_INFO_LIST]: remoteUserInfoList,
            };
            TUIStore.updateStore(updateStoreParams, index_1.StoreName.CALL);
        }
        catch (error) {
            console.debug(error);
        }
    }
    _handleDeviceUpdate(event) {
        const { cameraList, microphoneList, speakerList, currentCamera, currentMicrophone, currentSpeaker } = event;
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.DEVICE_LIST, { cameraList, microphoneList, speakerList, currentCamera, currentMicrophone, currentSpeaker });
    }
    // ==========================【 miniProgram 私有事件】==========================
    _handleUserUpdate(event) {
        const data = (0, utils_1.analyzeEventData)(event);
        (data === null || data === void 0 ? void 0 : data.pusher) && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PUSHER, data.pusher);
        (data === null || data === void 0 ? void 0 : data.playerList) && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.PLAYER, data.playerList);
    }
    _addUserToRemoteUserInfoList(userId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
            const isInRemoteUserList = remoteUserInfoList.find(item => (item === null || item === void 0 ? void 0 : item.userId) === userId);
            if (!isInRemoteUserList) {
                remoteUserInfoList.push({ userId });
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, remoteUserInfoList);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, remoteUserInfoList);
                const [userInfo] = yield (0, utils_1.getRemoteUserProfile)([userId], (_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTim());
                remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
                remoteUserInfoList.forEach((obj) => {
                    if ((obj === null || obj === void 0 ? void 0 : obj.userId) === userId) {
                        obj = Object.assign(obj, userInfo);
                    }
                });
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, remoteUserInfoList);
                TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, remoteUserInfoList);
            }
        });
    }
}
__decorate([
    (0, promise_retry_1.default)({
        retries: 5,
        timeout: 200,
        onRetrying(retryCount) {
            console.warn(`${index_1.NAME.PREFIX}_startRemoteView, retrying [${retryCount}]`);
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EngineEventHandler.prototype, "_startRemoteView", null);
exports.default = EngineEventHandler;
