"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../const/index");
const index_2 = require("../locales/index");
const common_utils_1 = require("../utils/common-utils");
const index_3 = require("../utils/index");
class CallStore {
    constructor() {
        this.defaultStore = {
            callStatus: index_1.CallStatus.IDLE,
            callRole: index_1.CallRole.UNKNOWN,
            callMediaType: index_1.CallMediaType.UNKNOWN,
            localUserInfo: { userId: '' },
            localUserInfoExcludeVolume: { userId: '' },
            remoteUserInfoList: [],
            remoteUserInfoExcludeVolumeList: [],
            callerUserInfo: { userId: '' },
            isGroup: false,
            callDuration: '00:00:00',
            callTips: '',
            toastInfo: { text: '' },
            isMinimized: false,
            enableFloatWindow: false,
            bigScreenUserId: '',
            language: (0, common_utils_1.getLanguage)(),
            isClickable: false,
            deviceList: { cameraList: [], microphoneList: [], currentCamera: {}, currentMicrophone: {} },
            showPermissionTip: false,
            netWorkQualityList: [],
            isMuteSpeaker: false,
            callID: '',
            groupID: '',
            roomID: 0,
            roomIdType: 0,
            cameraPosition: index_1.CameraPosition.FRONT,
            groupCallMembers: [],
            // TUICallKit 组件上的属性
            displayMode: index_1.VideoDisplayMode.COVER,
            videoResolution: index_1.VideoResolution.RESOLUTION_720P,
            showSelectUser: false,
            // 小程序相关属性
            pusher: {},
            player: [],
            isEarPhone: false,
            pusherId: '',
            // 是否开启虚拟背景, 目前仅 web 支持
            isShowEnableVirtualBackground: false,
            enableVirtualBackground: false,
            // customUIConfig
            customUIConfig: {
                button: {},
                viewBackground: {},
                layoutMode: index_1.LayoutMode.RemoteInLargeView,
            },
            // translate function
            translate: index_2.t,
            isForceUseV2API: false,
        };
        this.store = (0, index_3.deepClone)(this.defaultStore);
        this.prevStore = (0, index_3.deepClone)(this.defaultStore);
    }
    update(key, data) {
        switch (key) {
            case index_1.NAME.CALL_TIPS:
                const preData = this.getData(key);
                this.prevStore[key] = preData;
            default:
                // resolve "Type 'any' is not assignable to type 'never'.ts", ref: https://github.com/microsoft/TypeScript/issues/31663
                this.store[key] = data;
        }
    }
    getPrevData(key) {
        if (!key)
            return this.prevStore;
        return this.prevStore[key];
    }
    getData(key) {
        if (!key)
            return this.store;
        return this.store[key];
    }
    // reset call store
    reset(keyList = []) {
        if (keyList.length === 0) {
            keyList = Object.keys(this.store);
        }
        const resetToDefault = keyList.reduce((acc, key) => (Object.assign(Object.assign({}, acc), { [key]: this.defaultStore[key] })), {});
        this.store = Object.assign(Object.assign(Object.assign({}, this.defaultStore), this.store), resetToDefault);
    }
}
exports.default = CallStore;
