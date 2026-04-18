"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_TYPE = exports.LayoutMode = exports.ViewName = exports.ButtonState = exports.FeatureButton = exports.CameraPosition = exports.DeviceType = exports.AudioPlayBackDevice = exports.CallType = exports.StatusChange = exports.LanguageType = exports.VideoResolution = exports.VideoDisplayMode = exports.CallStatus = exports.CallRole = exports.CallMediaType = exports.StoreName = void 0;
/**
 * @property {String} call 1v1 通话 + 群组通话
 * @property {String} CUSTOM 自定义 Store
*/
var StoreName;
(function (StoreName) {
    StoreName["CALL"] = "call";
    StoreName["CUSTOM"] = "custom";
})(StoreName = exports.StoreName || (exports.StoreName = {}));
/**
 * @property {String} idle 空闲
 * @property {String} connecting 呼叫等待中
 * @property {String} connected 通话中
*/
var CallMediaType;
(function (CallMediaType) {
    CallMediaType[CallMediaType["UNKNOWN"] = 0] = "UNKNOWN";
    CallMediaType[CallMediaType["AUDIO"] = 1] = "AUDIO";
    CallMediaType[CallMediaType["VIDEO"] = 2] = "VIDEO";
})(CallMediaType = exports.CallMediaType || (exports.CallMediaType = {}));
/**
 * @property {String} caller 主叫
 * @property {String} callee 被叫
*/
var CallRole;
(function (CallRole) {
    CallRole["UNKNOWN"] = "unknown";
    CallRole["CALLEE"] = "callee";
    CallRole["CALLER"] = "caller";
})(CallRole = exports.CallRole || (exports.CallRole = {}));
/**
 * @property {String} idle 空闲
 * @property {String} calling 呼叫等待中
 * @property {String} connected 通话中
*/
var CallStatus;
(function (CallStatus) {
    CallStatus["IDLE"] = "idle";
    CallStatus["CALLING"] = "calling";
    CallStatus["CONNECTED"] = "connected";
})(CallStatus = exports.CallStatus || (exports.CallStatus = {}));
/**
 * 视频画面显示模式
 * 播放视频流默认使用 cover 模式; 播放屏幕共享流默认使用 contain 模式。
 * @property {String} contain 优先保证视频内容全部显示。视频尺寸等比缩放，直至视频窗口的一边与视窗边框对齐。如果视频尺寸与显示视窗尺寸不一致，在保持长宽比的前提下，将视频进行缩放后填满视窗，缩放后的视频四周会有一圈黑边。
 * @property {String} cover 优先保证视窗被填满。视频尺寸等比缩放，直至整个视窗被视频填满。如果视频长宽与显示窗口不同，则视频流会按照显示视窗的比例进行周边裁剪或图像拉伸后填满视窗
 * @property {String} fill 保证视窗被填满的同时保证视频内容全部显示，但是不保证视频尺寸比例不变。视频的宽高会被拉伸至和视窗尺寸一致。(该选项值自 v4.12.1 开始支持)
*/
var VideoDisplayMode;
(function (VideoDisplayMode) {
    VideoDisplayMode["CONTAIN"] = "contain";
    VideoDisplayMode["COVER"] = "cover";
    VideoDisplayMode["FILL"] = "fill";
})(VideoDisplayMode = exports.VideoDisplayMode || (exports.VideoDisplayMode = {}));
/**
 * 视频分辨率
 * @property {String} 480p
 * @property {String} 720p
 * @property {String} 1080p
*/
var VideoResolution;
(function (VideoResolution) {
    VideoResolution["RESOLUTION_480P"] = "480p";
    VideoResolution["RESOLUTION_720P"] = "720p";
    VideoResolution["RESOLUTION_1080P"] = "1080p";
})(VideoResolution = exports.VideoResolution || (exports.VideoResolution = {}));
// 支持的语言
var LanguageType;
(function (LanguageType) {
    LanguageType["EN"] = "en";
    LanguageType["ZH-CN"] = "zh-cn";
    LanguageType["JA_JP"] = "ja_JP";
})(LanguageType = exports.LanguageType || (exports.LanguageType = {}));
/* === 【原来 TUICallKit 对外暴露】=== */
// 原来 web callKit 定义通知外部状态变更的变量, 对外暴露
exports.StatusChange = {
    IDLE: "idle",
    BE_INVITED: "be-invited",
    DIALING_C2C: "dialing-c2c",
    DIALING_GROUP: "dialing-group",
    CALLING_C2C_AUDIO: "calling-c2c-audio",
    CALLING_C2C_VIDEO: "calling-c2c-video",
    CALLING_GROUP_AUDIO: "calling-group-audio",
    CALLING_GROUP_VIDEO: "calling-group-video",
};
exports.CallType = {
    'unknown': CallMediaType.UNKNOWN,
    'audio': CallMediaType.AUDIO,
    'video': CallMediaType.VIDEO,
};
/* === 【小程序使用】=== */
/**
 * @property {String} ear 听筒
 * @property {String} speaker 免提
*/
var AudioPlayBackDevice;
(function (AudioPlayBackDevice) {
    AudioPlayBackDevice["EAR"] = "ear";
    AudioPlayBackDevice["SPEAKER"] = "speaker";
})(AudioPlayBackDevice = exports.AudioPlayBackDevice || (exports.AudioPlayBackDevice = {}));
;
var DeviceType;
(function (DeviceType) {
    DeviceType["MICROPHONE"] = "microphone";
    DeviceType["CAMERA"] = "camera";
    DeviceType["SPEAKER"] = "speaker";
})(DeviceType = exports.DeviceType || (exports.DeviceType = {}));
var CameraPosition;
(function (CameraPosition) {
    CameraPosition[CameraPosition["FRONT"] = 0] = "FRONT";
    CameraPosition[CameraPosition["BACK"] = 1] = "BACK";
})(CameraPosition = exports.CameraPosition || (exports.CameraPosition = {}));
var FeatureButton;
(function (FeatureButton) {
    FeatureButton["Camera"] = "camera";
    FeatureButton["Microphone"] = "microphone";
    FeatureButton["SwitchCamera"] = "switchCamera";
    FeatureButton["InviteUser"] = "inviteUser";
})(FeatureButton = exports.FeatureButton || (exports.FeatureButton = {}));
var ButtonState;
(function (ButtonState) {
    ButtonState["Open"] = "open";
    ButtonState["Close"] = "close";
})(ButtonState = exports.ButtonState || (exports.ButtonState = {}));
var ViewName;
(function (ViewName) {
    ViewName["LOCAL"] = "local";
    ViewName["REMOTE"] = "remote";
})(ViewName = exports.ViewName || (exports.ViewName = {}));
var LayoutMode;
(function (LayoutMode) {
    LayoutMode["LocalInLargeView"] = "local";
    LayoutMode["RemoteInLargeView"] = "remote";
})(LayoutMode = exports.LayoutMode || (exports.LayoutMode = {}));
var ACTION_TYPE;
(function (ACTION_TYPE) {
    ACTION_TYPE[ACTION_TYPE["INVITE"] = 1] = "INVITE";
    ACTION_TYPE[ACTION_TYPE["CANCEL_INVITE"] = 2] = "CANCEL_INVITE";
    ACTION_TYPE[ACTION_TYPE["ACCEPT_INVITE"] = 3] = "ACCEPT_INVITE";
    ACTION_TYPE[ACTION_TYPE["REJECT_INVITE"] = 4] = "REJECT_INVITE";
    ACTION_TYPE[ACTION_TYPE["INVITE_TIMEOUT"] = 5] = "INVITE_TIMEOUT";
})(ACTION_TYPE = exports.ACTION_TYPE || (exports.ACTION_TYPE = {}));
