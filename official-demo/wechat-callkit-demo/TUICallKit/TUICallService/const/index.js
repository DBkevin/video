"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOM_ID_TYPE = exports.COMPONENT = exports.PLATFORM = exports.NETWORK_QUALITY_THRESHOLD = exports.DEFAULT_BLUR_LEVEL = exports.MAX_NUMBER_ROOM_ID = exports.VideoCallIcon = exports.AudioCallIcon = exports.NAME = exports.PUSHER_ID = exports.CHAT_DATA_KEY = exports.CALL_DATA_KEY = void 0;
__exportStar(require("./call"), exports);
__exportStar(require("./error"), exports);
__exportStar(require("./log"), exports);
exports.CALL_DATA_KEY = {
    CALL_STATUS: 'callStatus',
    CALL_ROLE: 'callRole',
    CALL_MEDIA_TYPE: 'callMediaType',
    LOCAL_USER_INFO: 'localUserInfo',
    LOCAL_USER_INFO_EXCLUDE_VOLUMN: 'localUserInfoExcludeVolume',
    REMOTE_USER_INFO_LIST: 'remoteUserInfoList',
    REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST: 'remoteUserInfoExcludeVolumeList',
    CALLER_USER_INFO: 'callerUserInfo',
    IS_GROUP: 'isGroup',
    CALL_DURATION: 'callDuration',
    CALL_TIPS: 'callTips',
    TOAST_INFO: 'toastInfo',
    IS_MINIMIZED: 'isMinimized',
    ENABLE_FLOAT_WINDOW: 'enableFloatWindow',
    BIG_SCREEN_USER_ID: 'bigScreenUserId',
    LANGUAGE: 'language',
    IS_CLICKABLE: 'isClickable',
    DISPLAY_MODE: 'displayMode',
    VIDEO_RESOLUTION: 'videoResolution',
    PUSHER: 'pusher',
    PLAYER: 'player',
    IS_EAR_PHONE: 'isEarPhone',
    IS_MUTE_SPEAKER: 'isMuteSpeaker',
    SHOW_PERMISSION_TIP: 'SHOW_PERMISSION_TIP',
    NETWORK_STATUS: 'NetWorkStatus',
    CALL_ID: 'callID',
    GROUP_ID: 'groupID',
    ROOM_ID: 'roomID',
    ROOM_ID_TYPE: 'roomIdType',
    SHOW_SELECT_USER: 'showSelectUser',
    IS_SHOW_ENABLE_VIRTUAL_BACKGROUND: 'isShowEnableVirtualBackground',
    ENABLE_VIRTUAL_BACKGROUND: 'enableVirtualBackground',
    GROUP_CALL_MEMBERS: 'groupCallMembers',
    PUSHER_ID: 'pusherId',
    IS_FORCE_USE_V2_API: 'isForceUseV2API',
};
exports.CHAT_DATA_KEY = {
    "INNER_ATTR_KIT_INFO": "inner_attr_kit_info",
};
exports.PUSHER_ID = {
    INITIAL_PUSHER: 'initialPusher',
    NEW_PUSHER: 'newPusher'
};
exports.NAME = Object.assign(Object.assign(Object.assign({ PREFIX: '【CallService】', AUDIO: 'audio', VIDEO: 'video', LOCAL_VIDEO: 'localVideo', ERROR: 'error', TIMEOUT: 'timeout', RAF: 'raf', INTERVAL: 'interval', DEFAULT: 'default', BOOLEAN: 'boolean', STRING: 'string', NUMBER: 'number', OBJECT: 'object', ARRAY: 'array', FUNCTION: 'function', UNDEFINED: "undefined", UNKNOWN: 'unknown', ALL: 'all', MYSELF: 'myself', DEVICE_LIST: 'deviceList', CAMERA_POSITION: 'cameraPosition', CUSTOM_UI_CONFIG: 'customUIConfig', TRANSLATE: 'translate' }, exports.PUSHER_ID), exports.CALL_DATA_KEY), exports.CHAT_DATA_KEY);
exports.AudioCallIcon = 'https://web.sdk.qcloud.com/component/TUIKit/assets/call.png';
exports.VideoCallIcon = 'https://web.sdk.qcloud.com/component/TUIKit/assets/call-video-reverse.svg';
exports.MAX_NUMBER_ROOM_ID = 2147483647;
exports.DEFAULT_BLUR_LEVEL = 3;
exports.NETWORK_QUALITY_THRESHOLD = 4;
var PLATFORM;
(function (PLATFORM) {
    // eslint-disable-next-line no-unused-vars
    PLATFORM["MAC"] = "mac";
    // eslint-disable-next-line no-unused-vars
    PLATFORM["WIN"] = "win";
})(PLATFORM = exports.PLATFORM || (exports.PLATFORM = {}));
;
var COMPONENT;
(function (COMPONENT) {
    // eslint-disable-next-line no-unused-vars
    COMPONENT[COMPONENT["TUI_CALL_KIT"] = 14] = "TUI_CALL_KIT";
    // eslint-disable-next-line no-unused-vars
    COMPONENT[COMPONENT["TIM_CALL_KIT"] = 15] = "TIM_CALL_KIT";
})(COMPONENT = exports.COMPONENT || (exports.COMPONENT = {}));
;
var ROOM_ID_TYPE;
(function (ROOM_ID_TYPE) {
    // eslint-disable-next-line no-unused-vars
    ROOM_ID_TYPE[ROOM_ID_TYPE["NUMBER_ROOM_ID"] = 1] = "NUMBER_ROOM_ID";
    // eslint-disable-next-line no-unused-vars
    ROOM_ID_TYPE[ROOM_ID_TYPE["STRING_ROOM_ID"] = 2] = "STRING_ROOM_ID";
})(ROOM_ID_TYPE = exports.ROOM_ID_TYPE || (exports.ROOM_ID_TYPE = {}));
;
