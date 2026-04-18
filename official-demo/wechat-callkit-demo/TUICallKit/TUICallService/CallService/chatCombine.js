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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tui_core_lite_1 = require("@tencentcloud/tui-core-lite");
const index_1 = require("../const/index");
const common_utils_1 = require("../utils/common-utils");
const utils_1 = require("./utils");
const tuiStore_1 = __importDefault(require("../TUIStore/tuiStore"));
// @ts-ignore
const basic_1 = __importDefault(require("@tencentcloud/lite-chat/basic")); // 仅支持 calls 接口
const index_2 = require("../locales/index");
const TUIStore = tuiStore_1.default.getInstance();
const cmd2messageCardContentMap = {
    audioCall: () => 'Voice call',
    videoCall: () => 'Video call',
    switchToAudio: () => 'Switch audio call',
    switchToVideo: () => 'Switch video call',
    hangup: ({ callDuration }) => `${(0, index_2.t)('Call duration')}：${callDuration}`,
};
class ChatCombine {
    constructor(options) {
        var _a, _b, _c;
        this._callService = options.callService;
        // 下面：TUICore注册事件，注册组件服务，注册界面拓展
        tui_core_lite_1.TUICore.registerEvent(tui_core_lite_1.TUIConstants.TUILogin.EVENT.LOGIN_STATE_CHANGED, tui_core_lite_1.TUIConstants.TUILogin.EVENT_SUB_KEY.USER_LOGIN_SUCCESS, this); // onNotifyEvent 
        // @ts-ignore
        if ((_a = tui_core_lite_1.TUIConstants.TUIChat) === null || _a === void 0 ? void 0 : _a.EVENT) {
            // @ts-ignore
            tui_core_lite_1.TUICore.registerEvent((_b = tui_core_lite_1.TUIConstants.TUIChat.EVENT) === null || _b === void 0 ? void 0 : _b.CHAT_STATE_CHANGED, (_c = tui_core_lite_1.TUIConstants.TUIChat.EVENT_SUB_KEY) === null || _c === void 0 ? void 0 : _c.CHAT_OPENED, this); // onNotifyEvent 
        }
        tui_core_lite_1.TUICore.registerService(tui_core_lite_1.TUIConstants.TUICalling.SERVICE.NAME, this); // onCall
        tui_core_lite_1.TUICore.registerExtension(tui_core_lite_1.TUIConstants.TUIChat.EXTENSION.INPUT_MORE.EXT_ID, this); // onGetExtension
    }
    static getInstance(options) {
        if (!ChatCombine.instance) {
            ChatCombine.instance = new ChatCombine(options);
        }
        return ChatCombine.instance;
    }
    // ================ 【】 ================
    /**
     * message on screen
     * @param {Any} params Parameters for message up-screening
     */
    callTUIService(params) {
        const { message } = params || {};
        tui_core_lite_1.TUICore.callService({
            serviceName: tui_core_lite_1.TUIConstants.TUIChat.SERVICE.NAME,
            method: tui_core_lite_1.TUIConstants.TUIChat.SERVICE.METHOD.UPDATE_MESSAGE_LIST,
            params: { message },
        });
    }
    /**
     * tuicore getExtension
     * @param {String} extensionID extension id
     * @param {Any} params tuicore pass parameters
     * @returns {Any[]} return extension
     */
    onGetExtension(extensionID, params) {
        var _a, _b;
        if (extensionID === tui_core_lite_1.TUIConstants.TUIChat.EXTENSION.INPUT_MORE.EXT_ID) {
            (_b = (_a = this._callService.getTUICallEngineInstance()) === null || _a === void 0 ? void 0 : _a.reportLog) === null || _b === void 0 ? void 0 : _b.call(_a, { name: 'TUICallKit.onGetExtension', data: { extensionID, params } });
            if ((0, common_utils_1.isUndefined)(params))
                return [];
            // room and customer_service ChatType not show audio and video icon.
            // @ts-ignore
            if ([tui_core_lite_1.TUIConstants.TUIChat.TYPE.ROOM, tui_core_lite_1.TUIConstants.TUIChat.TYPE.CUSTOMER_SERVICE].includes(params.chatType))
                return [];
            let list = [];
            const audioCallExtension = {
                weight: 1000,
                text: '语音通话',
                icon: index_1.AudioCallIcon,
                data: {
                    name: 'voiceCall',
                },
                listener: {
                    onClicked: (options) => __awaiter(this, void 0, void 0, function* () { return yield this._handleTUICoreOnClick(options, options.type || index_1.CallMediaType.AUDIO); }),
                },
            };
            const videoCallExtension = {
                weight: 900,
                text: '视频通话',
                icon: index_1.VideoCallIcon,
                data: {
                    name: 'videoCall',
                },
                listener: {
                    onClicked: (options) => __awaiter(this, void 0, void 0, function* () { return yield this._handleTUICoreOnClick(options, options.type || index_1.CallMediaType.VIDEO); }),
                },
            };
            if (params === null || params === void 0 ? void 0 : params.chatType) {
                list = [audioCallExtension, videoCallExtension];
            }
            else {
                !(params === null || params === void 0 ? void 0 : params.filterVoice) && list.push(audioCallExtension);
                !(params === null || params === void 0 ? void 0 : params.filterVideo) && list.push(videoCallExtension);
            }
            return list;
        }
    }
    onCall(method, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (method === tui_core_lite_1.TUIConstants.TUICalling.SERVICE.METHOD.START_CALL) {
                yield this._handleTUICoreOnClick(params, params.type);
            }
        });
    }
    /**
     * tuicore notify event manager
     * @param {String} eventName event name
     * @param {String} subKey sub key
     * @param {Any} options tuicore event parameters
     */
    onNotifyEvent(eventName, subKey, options) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (eventName === tui_core_lite_1.TUIConstants.TUILogin.EVENT.LOGIN_STATE_CHANGED) {
                    // TUICallkit executes its own business logic when it receives a successful login.
                    if (subKey === tui_core_lite_1.TUIConstants.TUILogin.EVENT_SUB_KEY.USER_LOGIN_SUCCESS) {
                        // @ts-ignore
                        const { chat, userID, userSig, SDKAppID } = tui_core_lite_1.TUILogin.getContext();
                        yield ((_a = this._callService) === null || _a === void 0 ? void 0 : _a.init({ tim: chat, userID, userSig, sdkAppID: SDKAppID, isFromChat: true, component: index_1.COMPONENT.TIM_CALL_KIT }));
                        (_b = this._callService) === null || _b === void 0 ? void 0 : _b.setIsFromChat(true);
                        (_c = this._callService) === null || _c === void 0 ? void 0 : _c.setLogLevel(index_1.LOG_LEVEL.NORMAL); // setLogLevel to 0 in tuikit. easy to find out problem via logs.
                        this._addListenChatEvent();
                    }
                    else if (subKey === tui_core_lite_1.TUIConstants.TUILogin.EVENT_SUB_KEY.USER_LOGOUT_SUCCESS) {
                        this._removeListenChatEvent();
                        yield ((_d = this._callService) === null || _d === void 0 ? void 0 : _d.destroyed());
                    }
                }
                // @ts-ignore
                if (((_e = tui_core_lite_1.TUIConstants.TUIChat) === null || _e === void 0 ? void 0 : _e.EVENT) && eventName === tui_core_lite_1.TUIConstants.TUIChat.EVENT.CHAT_STATE_CHANGED) {
                    // @ts-ignore
                    if (subKey === tui_core_lite_1.TUIConstants.TUIChat.EVENT_SUB_KEY.CHAT_OPENED) {
                        (_f = this._callService) === null || _f === void 0 ? void 0 : _f.setCurrentGroupId((options === null || options === void 0 ? void 0 : options.groupID) || '');
                        if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) !== index_1.CallStatus.IDLE)
                            return;
                        const currentGroupId = (_g = this._callService) === null || _g === void 0 ? void 0 : _g.getCurrentGroupId();
                        const groupAttributes = currentGroupId ? yield this.getGroupAttributes((_h = this._callService) === null || _h === void 0 ? void 0 : _h.getTim(), currentGroupId) : {};
                        yield this.updateStoreBasedOnGroupAttributes(groupAttributes);
                    }
                }
            }
            catch (error) {
                console.error(`${index_1.NAME.PREFIX}TUICore onNotifyEvent failed, error: ${error}.`);
            }
        });
    }
    // Handling the chat+call scenario, data required for the joinInGroupCall API: update store / clear relevant store data
    updateStoreBasedOnGroupAttributes(groupAttributes) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            (_c = (_b = (_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTUICallEngineInstance()) === null || _b === void 0 ? void 0 : _b.reportLog) === null || _c === void 0 ? void 0 : _c.call(_b, {
                name: 'TUICallKit.getJoinGroupCallInfo.success',
                data: { groupAttributes },
            });
            try {
                const { call_id: callId = '', // callEngine v3.1 support
                group_id: groupId = '', room_id: roomId = 0, room_id_type: roomIdType = 0, call_media_type: callType = index_1.NAME.UNKNOWN, 
                // @ts-ignore
                user_list: userList, // The default value of the user list returned by the background is null
                 } = groupAttributes[index_1.NAME.INNER_ATTR_KIT_INFO] ? JSON.parse(groupAttributes[index_1.NAME.INNER_ATTR_KIT_INFO]) : {};
                let userListInfo = (userList || []).map(user => user.userid);
                if (userListInfo.length > 0) {
                    userListInfo = yield (0, utils_1.getRemoteUserProfile)(userListInfo, (_d = this._callService) === null || _d === void 0 ? void 0 : _d.getTim());
                }
                const updateStoreParams = {
                    [index_1.NAME.CALL_ID]: callId,
                    [index_1.NAME.GROUP_ID]: groupId,
                    [index_1.NAME.GROUP_CALL_MEMBERS]: userListInfo,
                    [index_1.NAME.ROOM_ID]: roomId,
                    [index_1.NAME.CALL_MEDIA_TYPE]: index_1.CallType[callType],
                    [index_1.NAME.ROOM_ID_TYPE]: roomIdType,
                };
                TUIStore.updateStore(updateStoreParams, index_1.StoreName.CALL);
            }
            catch (error) {
                console.warn(`${index_1.NAME.PREFIX}updateStoreBasedOnGroupAttributes fail, error: ${error}`);
            }
        });
    }
    // Get group attribute
    getGroupAttributes(tim, groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!groupId)
                return {};
            try {
                const { data } = yield tim.getGroupAttributes({
                    groupID: groupId,
                    keyList: []
                });
                return (data === null || data === void 0 ? void 0 : data.groupAttributes) || {};
            }
            catch (error) {
                console.warn(`${index_1.NAME.PREFIX}getGroupAttributes fail: ${error}`);
                return {};
            }
        });
    }
    isLineBusy(message) {
        var _a;
        const callMessage = (0, common_utils_1.JSONToObject)(message.payload.data);
        const objectData = (0, common_utils_1.JSONToObject)(callMessage === null || callMessage === void 0 ? void 0 : callMessage.data);
        return (objectData === null || objectData === void 0 ? void 0 : objectData.line_busy) === 'line_busy' || (objectData === null || objectData === void 0 ? void 0 : objectData.line_busy) === '' || ((_a = objectData === null || objectData === void 0 ? void 0 : objectData.data) === null || _a === void 0 ? void 0 : _a.message) === 'lineBusy';
    }
    getCallKitMessage(message, tim) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const callMessage = (0, common_utils_1.JSONToObject)(message.payload.data);
            if ((callMessage === null || callMessage === void 0 ? void 0 : callMessage.businessID) !== 1) {
                return {};
            }
            let messageCardContent = '';
            const objectData = (0, common_utils_1.JSONToObject)(callMessage === null || callMessage === void 0 ? void 0 : callMessage.data);
            const callMediaType = objectData.call_type;
            const inviteeList = callMessage.inviteeList;
            const inviter = (_a = objectData === null || objectData === void 0 ? void 0 : objectData.data) === null || _a === void 0 ? void 0 : _a.inviter;
            const localUserId = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO).userId;
            const isInviter = inviter === localUserId;
            const cmd = (_b = objectData === null || objectData === void 0 ? void 0 : objectData.data) === null || _b === void 0 ? void 0 : _b.cmd;
            switch (callMessage === null || callMessage === void 0 ? void 0 : callMessage.actionType) {
                case index_1.ACTION_TYPE.INVITE: {
                    messageCardContent = cmd2messageCardContentMap[cmd]({ callDuration: (0, common_utils_1.formatTime)(objectData === null || objectData === void 0 ? void 0 : objectData.call_end) });
                    break;
                }
                case index_1.ACTION_TYPE.CANCEL_INVITE:
                    messageCardContent = isInviter ? 'Call Cancel' : 'Other Side Cancel';
                    break;
                case index_1.ACTION_TYPE.ACCEPT_INVITE:
                    if (['switchToAudio', 'switchToVideo'].includes(cmd)) {
                        messageCardContent = (_c = cmd2messageCardContentMap === null || cmd2messageCardContentMap === void 0 ? void 0 : cmd2messageCardContentMap[cmd]) === null || _c === void 0 ? void 0 : _c.call(cmd2messageCardContentMap);
                    }
                    else {
                        messageCardContent = (0, index_2.t)('Answered');
                    }
                    break;
                case index_1.ACTION_TYPE.REJECT_INVITE:
                    if (this.isLineBusy(message)) {
                        messageCardContent = isInviter ? 'Line Busy' : 'Other Side Line Busy';
                    }
                    else {
                        messageCardContent = isInviter ? 'Other Side Decline' : 'Decline';
                    }
                    break;
                case index_1.ACTION_TYPE.INVITE_TIMEOUT:
                    if (['switchToAudio', 'switchToVideo'].includes(cmd)) {
                        messageCardContent = (_d = cmd2messageCardContentMap === null || cmd2messageCardContentMap === void 0 ? void 0 : cmd2messageCardContentMap[cmd]) === null || _d === void 0 ? void 0 : _d.call(cmd2messageCardContentMap);
                    }
                    else {
                        messageCardContent = isInviter ? 'Other Side No Answer' : 'No answer';
                    }
                    break;
            }
            return { messageCardContent, callMediaType, inviteeList };
        });
    }
    // =========================【chat: event listening】=========================
    _addListenChatEvent() {
        var _a, _b;
        if (!((_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTim())) {
            console.warn(`${index_1.NAME.PREFIX}add tim event listener failed, tim is empty.`);
            return;
        }
        (_b = this._callService) === null || _b === void 0 ? void 0 : _b.getTim().on(basic_1.default.EVENT.GROUP_ATTRIBUTES_UPDATED, this._handleGroupAttributesUpdated, this);
    }
    _removeListenChatEvent() {
        var _a, _b;
        if (!((_a = this._callService) === null || _a === void 0 ? void 0 : _a.getTim())) {
            console.warn(`${index_1.NAME.PREFIX}remove tim event listener failed, tim is empty.`);
            return;
        }
        (_b = this._callService) === null || _b === void 0 ? void 0 : _b.getTim().off(basic_1.default.EVENT.GROUP_ATTRIBUTES_UPDATED, this._handleGroupAttributesUpdated, this);
    }
    /**
     * chat start audio/video call via click
     * @param {Any} options Parameters passed in when clicking on an audio/video call from chat
     * @param {CallMediaType} type call media type. 0 - audio; 1 - video.
     *
     * priority: isForceUseV2API > version
     */
    _handleTUICoreOnClick(options, type) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { groupID, userIDList = [], version = '' } = options, rest = __rest(options, ["groupID", "userIDList", "version"]);
                yield ((_a = this._callService) === null || _a === void 0 ? void 0 : _a.calls(Object.assign({ chatGroupID: groupID, userIDList, type }, rest)));
            }
            catch (error) {
                // call update to lite-chat only support calls interface
                if (!(options === null || options === void 0 ? void 0 : options.version)) {
                    console.warn('Please upgrade to the latest Chat UIKit components.');
                }
                console.debug(error);
            }
        });
    }
    _handleGroupAttributesUpdated(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS) !== index_1.CallStatus.IDLE)
                return;
            const data = (event === null || event === void 0 ? void 0 : event.data) || {};
            const { groupID: groupId = '', groupAttributes = {} } = data;
            if (groupId !== ((_a = this._callService) === null || _a === void 0 ? void 0 : _a.getCurrentGroupId()))
                return;
            yield this.updateStoreBasedOnGroupAttributes(groupAttributes);
        });
    }
}
exports.default = ChatCombine;
