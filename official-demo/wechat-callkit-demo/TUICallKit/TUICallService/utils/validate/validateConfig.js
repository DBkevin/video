"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATE_PARAMS = void 0;
const index_1 = require("../../const/index");
exports.VALIDATE_PARAMS = {
    init: {
        SDKAppID: {
            required: true,
            rules: [index_1.NAME.NUMBER],
            allowEmpty: false,
        },
        userID: {
            required: true,
            rules: [index_1.NAME.STRING],
            allowEmpty: false,
        },
        userSig: {
            required: true,
            rules: [index_1.NAME.STRING],
            allowEmpty: false,
        },
        tim: {
            required: false,
            rules: [index_1.NAME.OBJECT],
        },
    },
    call: {
        userID: {
            required: true,
            rules: [index_1.NAME.STRING],
            allowEmpty: false
        },
        type: {
            required: true,
            rules: [index_1.NAME.NUMBER],
            range: [1, 2],
            allowEmpty: false
        },
        roomID: {
            required: false,
            rules: [index_1.NAME.NUMBER],
            range: `0~${index_1.MAX_NUMBER_ROOM_ID}`,
            allowEmpty: false,
        },
        strRoomID: {
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: true,
        },
        userData: {
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: false,
        },
        timeout: {
            required: false,
            rules: [index_1.NAME.NUMBER],
            allowEmpty: false
        }
    },
    groupCall: {
        userIDList: {
            required: true,
            rules: [index_1.NAME.ARRAY],
            allowEmpty: false
        },
        type: {
            required: true,
            rules: [index_1.NAME.NUMBER],
            range: [1, 2],
            allowEmpty: false
        },
        groupID: {
            required: true,
            rules: [index_1.NAME.STRING],
            allowEmpty: false
        },
        roomID: {
            required: false,
            rules: [index_1.NAME.NUMBER],
            range: `0~${index_1.MAX_NUMBER_ROOM_ID}`,
            allowEmpty: false
        },
        strRoomID: {
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: true,
        },
        timeout: {
            required: false,
            rules: [index_1.NAME.NUMBER],
            allowEmpty: false
        },
        userData: {
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: false,
        },
        offlinePushInfo: {
            required: false,
            rules: [index_1.NAME.OBJECT],
            allowEmpty: false,
        },
    },
    joinInGroupCall: {
        type: {
            required: true,
            rules: [index_1.NAME.NUMBER],
            range: [1, 2],
            allowEmpty: false
        },
        groupID: {
            required: true,
            rules: [index_1.NAME.STRING],
            allowEmpty: false
        },
        roomID: {
            required: true,
            rules: [index_1.NAME.NUMBER],
            allowEmpty: false,
        },
        strRoomID: {
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: true,
        },
    },
    inviteUser: {
        userIDList: {
            required: true,
            rules: [index_1.NAME.ARRAY],
            allowEmpty: false
        },
    },
    setSelfInfo: {
        nickName: {
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: false,
        },
        avatar: {
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: false,
        }
    },
    enableFloatWindow: [
        {
            key: "enable",
            required: false,
            rules: [index_1.NAME.BOOLEAN],
            allowEmpty: false,
        }
    ],
    enableAIVoice: [
        {
            key: "enable",
            required: true,
            rules: [index_1.NAME.BOOLEAN],
            allowEmpty: false,
        }
    ],
    enableMuteMode: [
        {
            key: "enable",
            required: true,
            rules: [index_1.NAME.BOOLEAN],
            allowEmpty: false,
        }
    ],
    setCallingBell: [
        {
            key: "filePath",
            required: false,
            rules: [index_1.NAME.STRING],
            allowEmpty: true,
        }
    ],
    setLanguage: [
        {
            key: "language",
            required: true,
            rules: [index_1.NAME.STRING],
            allowEmpty: false
        }
    ],
    setVideoDisplayMode: [
        {
            key: "displayMode",
            required: true,
            rules: [index_1.NAME.STRING],
            range: [index_1.VideoDisplayMode.CONTAIN, index_1.VideoDisplayMode.COVER, index_1.VideoDisplayMode.FILL],
            allowEmpty: false
        }
    ],
    setVideoResolution: [
        {
            key: "resolution",
            required: true,
            rules: [index_1.NAME.STRING],
            range: [index_1.VideoResolution.RESOLUTION_1080P, index_1.VideoResolution.RESOLUTION_480P, index_1.VideoResolution.RESOLUTION_720P],
            allowEmpty: false
        }
    ]
};
