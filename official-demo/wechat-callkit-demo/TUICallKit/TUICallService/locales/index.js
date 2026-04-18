"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = exports.languageData = exports.CallTips = void 0;
const index_1 = require("../CallService/index");
const index_2 = require("../const/index");
const zh_cn_1 = require("./zh-cn");
// @if process.env.BUILD_TARGET!='MINI'
const en_1 = require("./en");
const ja_JP_1 = require("./ja_JP");
// @endif
const common_utils_1 = require("../utils/common-utils");
exports.CallTips = {
    OTHER_SIDE: 'other side',
    CANCEL: 'cancel',
    OTHER_SIDE_REJECT_CALL: 'other side reject call',
    REJECT_CALL: 'reject call',
    OTHER_SIDE_LINE_BUSY: 'other side line busy',
    IN_BUSY: 'in busy',
    CALL_TIMEOUT: 'call timeout',
    END_CALL: 'end call',
    TIMEOUT: 'timeout',
    KICK_OUT: 'kick out',
    CALLER_CALLING_MSG: 'caller calling message',
    CALLER_GROUP_CALLING_MSG: 'wait to be called',
    CALLEE_CALLING_VIDEO_MSG: 'callee calling video message',
    CALLEE_CALLING_AUDIO_MSG: 'callee calling audio message',
    NO_MICROPHONE_DEVICE_PERMISSION: 'no microphone access',
    NO_CAMERA_DEVICE_PERMISSION: 'no camera access',
    EXIST_GROUP_CALL: 'exist group call',
    LOCAL_NETWORK_IS_POOR: 'The network is poor during your current call',
    REMOTE_NETWORK_IS_POOR: 'The other user network is poor during the current call',
};
exports.languageData = {
    'zh-cn': zh_cn_1.zh,
    // @if process.env.BUILD_TARGET!='MINI'
    en: en_1.en,
    ja_JP: ja_JP_1.ja_JP,
    // @endif
};
// language translate
function t(args) {
    var _a, _b;
    const language = index_1.TUIStore.getData(index_2.StoreName.CALL, index_2.NAME.LANGUAGE);
    let translationContent = '';
    if ((0, common_utils_1.isString)(args)) {
        translationContent = ((_a = exports.languageData === null || exports.languageData === void 0 ? void 0 : exports.languageData[language]) === null || _a === void 0 ? void 0 : _a[args]) || '';
    }
    else if ((0, common_utils_1.isPlainObject)(args)) {
        const { key, options } = args;
        translationContent = ((_b = exports.languageData === null || exports.languageData === void 0 ? void 0 : exports.languageData[language]) === null || _b === void 0 ? void 0 : _b[key]) || '';
        translationContent = (0, common_utils_1.interpolate)(translationContent, options);
    }
    return translationContent;
}
exports.t = t;
