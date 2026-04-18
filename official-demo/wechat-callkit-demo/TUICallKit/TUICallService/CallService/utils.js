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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLocalUserInfoAudioVideoAvailable = exports.noDevicePermissionToast = exports.updateDeviceList = exports.deleteRemoteUser = exports.analyzeEventData = exports.updateRoomIdAndRoomIdType = exports.getGroupProfile = exports.getGroupMemberList = exports.generateStatusChangeText = exports.generateText = exports.getRemoteUserProfile = exports.getMyProfile = exports.setDefaultUserInfo = void 0;
const index_1 = require("../const/index");
const common_utils_1 = require("../utils/common-utils");
const index_2 = require("../locales/index");
const tuiStore_1 = __importDefault(require("../TUIStore/tuiStore"));
// @ts-ignore
const TUIStore = tuiStore_1.default.getInstance();
// 设置默认的 UserInfo 信息
function setDefaultUserInfo(userId, domId) {
    const userInfo = {
        userId,
        nick: '',
        avatar: '',
        remark: '',
        displayUserInfo: '',
        isAudioAvailable: false,
        isVideoAvailable: false,
        isEnter: false,
        domId: domId || userId,
    };
    return domId ? userInfo : Object.assign(Object.assign({}, userInfo), { isEnter: false }); // localUserInfo 没有 isEnter, remoteUserInfoList 有 isEnter
}
exports.setDefaultUserInfo = setDefaultUserInfo;
// 获取个人用户信息
function getMyProfile(myselfUserId, tim) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        let localUserInfo = setDefaultUserInfo(myselfUserId, index_1.NAME.LOCAL_VIDEO);
        try {
            if (!tim)
                return localUserInfo;
            const res = yield tim.getMyProfile();
            const currentLocalUserInfo = TUIStore === null || TUIStore === void 0 ? void 0 : TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO); // localUserInfo may have been updated
            if ((res === null || res === void 0 ? void 0 : res.code) === 0) {
                localUserInfo = Object.assign(Object.assign(Object.assign({}, localUserInfo), currentLocalUserInfo), { userId: (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.userID, nick: (_b = res === null || res === void 0 ? void 0 : res.data) === null || _b === void 0 ? void 0 : _b.nick, avatar: (_c = res === null || res === void 0 ? void 0 : res.data) === null || _c === void 0 ? void 0 : _c.avatar, displayUserInfo: ((_d = res === null || res === void 0 ? void 0 : res.data) === null || _d === void 0 ? void 0 : _d.nick) || ((_e = res === null || res === void 0 ? void 0 : res.data) === null || _e === void 0 ? void 0 : _e.userID) });
            }
            return localUserInfo;
        }
        catch (error) {
            console.error(`${index_1.NAME.PREFIX}getMyProfile failed, error: ${error}.`);
            return localUserInfo;
        }
    });
}
exports.getMyProfile = getMyProfile;
// 获取远端用户列表信息
function getRemoteUserProfile(userIdList, tim) {
    return __awaiter(this, void 0, void 0, function* () {
        let remoteUserInfoList = userIdList.map((userId) => setDefaultUserInfo(userId));
        try {
            if (!tim)
                return remoteUserInfoList;
            if (tim === null || tim === void 0 ? void 0 : tim.getFriendProfile) {
                const res = yield tim.getFriendProfile({ userIDList: userIdList });
                if (res.code === 0) {
                    const { friendList = [], failureUserIDList = [] } = res.data;
                    let unFriendList = failureUserIDList.map((obj) => obj.userID);
                    if (failureUserIDList.length > 0) {
                        const res = yield tim.getUserProfile({ userIDList: failureUserIDList.map((obj) => obj.userID) });
                        if ((res === null || res === void 0 ? void 0 : res.code) === 0) {
                            unFriendList = (res === null || res === void 0 ? void 0 : res.data) || [];
                        }
                    }
                    const currentRemoteUserInfoList = TUIStore === null || TUIStore === void 0 ? void 0 : TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST); // remoteUserInfoList may have been updated
                    const tempFriendIdList = friendList.map((obj) => obj.userID);
                    const tempUnFriendIdList = unFriendList.map((obj) => obj.userID);
                    remoteUserInfoList = userIdList.map((userId) => {
                        var _a, _b, _c, _d, _e, _f, _g;
                        const defaultUserInfo = setDefaultUserInfo(userId);
                        const friendListIndex = tempFriendIdList.indexOf(userId);
                        const unFriendListIndex = tempUnFriendIdList.indexOf(userId);
                        let remark = '';
                        let nick = '';
                        let displayUserInfo = '';
                        let avatar = '';
                        if (friendListIndex !== -1) {
                            remark = ((_a = friendList[friendListIndex]) === null || _a === void 0 ? void 0 : _a.remark) || '';
                            nick = ((_c = (_b = friendList[friendListIndex]) === null || _b === void 0 ? void 0 : _b.profile) === null || _c === void 0 ? void 0 : _c.nick) || '';
                            displayUserInfo = remark || nick || defaultUserInfo.userId || '';
                            avatar = ((_e = (_d = friendList[friendListIndex]) === null || _d === void 0 ? void 0 : _d.profile) === null || _e === void 0 ? void 0 : _e.avatar) || '';
                        }
                        if (unFriendListIndex !== -1) {
                            nick = ((_f = unFriendList[unFriendListIndex]) === null || _f === void 0 ? void 0 : _f.nick) || '';
                            displayUserInfo = nick || defaultUserInfo.userId || '';
                            avatar = ((_g = unFriendList[unFriendListIndex]) === null || _g === void 0 ? void 0 : _g.avatar) || '';
                        }
                        const userInfo = currentRemoteUserInfoList.find(subObj => subObj.userId === userId) || {};
                        return Object.assign(Object.assign(Object.assign({}, defaultUserInfo), userInfo), { remark, nick, displayUserInfo, avatar });
                    });
                }
                return remoteUserInfoList;
            }
            else {
                const res = yield tim.getUserProfile({ userIDList: userIdList });
                const currentRemoteUserInfoList = TUIStore === null || TUIStore === void 0 ? void 0 : TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST); // remoteUserInfoList may have been updated
                remoteUserInfoList = userIdList.map((userId) => {
                    const defaultUserInfo = setDefaultUserInfo(userId);
                    const userInfo = currentRemoteUserInfoList.find(subObj => subObj.userId === userId) || {};
                    const userData = (res.data || []).find(obj => obj.userID === userId) || {};
                    return Object.assign(Object.assign(Object.assign({}, defaultUserInfo), userInfo), { nick: (userData === null || userData === void 0 ? void 0 : userData.nick) || '', displayUserInfo: (userData === null || userData === void 0 ? void 0 : userData.nick) || userId, avatar: (userData === null || userData === void 0 ? void 0 : userData.avatar) || '' });
                });
                return remoteUserInfoList;
            }
        }
        catch (error) {
            console.error(`${index_1.NAME.PREFIX}getRemoteUserProfile failed, error: ${error}.`);
            return remoteUserInfoList;
        }
    });
}
exports.getRemoteUserProfile = getRemoteUserProfile;
// 生成弹框提示文案
function generateText(key, prefix, suffix) {
    const isGroup = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_GROUP);
    let callTips = `${(0, index_2.t)(key)}`;
    if (isGroup) {
        callTips = prefix ? `${prefix} ${callTips}` : callTips;
        callTips = suffix ? `${callTips} ${suffix}` : callTips;
    }
    return callTips;
}
exports.generateText = generateText;
// 生成 statusChange 抛出的字符串
function generateStatusChangeText() {
    const callStatus = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_STATUS);
    if (callStatus === index_1.CallStatus.IDLE) {
        return index_1.StatusChange.IDLE;
    }
    const isGroup = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.IS_GROUP);
    if (callStatus === index_1.CallStatus.CALLING) {
        return isGroup ? index_1.StatusChange.DIALING_GROUP : index_1.StatusChange.DIALING_C2C;
    }
    const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
    if (isGroup) {
        return callMediaType === index_1.CallMediaType.AUDIO ? index_1.StatusChange.CALLING_GROUP_AUDIO : index_1.StatusChange.CALLING_GROUP_VIDEO;
    }
    return callMediaType === index_1.CallMediaType.AUDIO ? index_1.StatusChange.CALLING_C2C_AUDIO : index_1.StatusChange.CALLING_C2C_VIDEO;
}
exports.generateStatusChangeText = generateStatusChangeText;
// 获取群组[offset, count + offset]区间成员
function getGroupMemberList(groupID, tim, count, offset) {
    return __awaiter(this, void 0, void 0, function* () {
        let groupMemberList = [];
        try {
            const res = yield tim.getGroupMemberList({ groupID, count, offset });
            if (res.code === 0) {
                return res.data.memberList || groupMemberList;
            }
        }
        catch (error) {
            console.error(`${index_1.NAME.PREFIX}getGroupMember failed, error: ${error}.`);
            return groupMemberList;
        }
    });
}
exports.getGroupMemberList = getGroupMemberList;
// 获取 IM 群信息
function getGroupProfile(groupID, tim) {
    return __awaiter(this, void 0, void 0, function* () {
        let groupProfile = {};
        try {
            const res = yield tim.getGroupProfile({ groupID });
            return res.data.group || groupProfile;
        }
        catch (error) {
            console.warn(`${index_1.NAME.PREFIX}getGroupProfile failed, error: ${error}.`);
            return groupProfile;
        }
    });
}
exports.getGroupProfile = getGroupProfile;
/**
 * update roomId and roomIdType
 * @param {number} roomId number roomId
 * @param {string} strRoomId string roomId
 */
function updateRoomIdAndRoomIdType(roomId, strRoomId) {
    if (roomId === 0 && strRoomId) { // use strRoomID
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.ROOM_ID, strRoomId);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.ROOM_ID_TYPE, index_1.ROOM_ID_TYPE.STRING_ROOM_ID);
    }
    else {
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.ROOM_ID, roomId);
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.ROOM_ID_TYPE, index_1.ROOM_ID_TYPE.NUMBER_ROOM_ID);
    }
}
exports.updateRoomIdAndRoomIdType = updateRoomIdAndRoomIdType;
/**
 * web and miniProgram call engine throw event data structure are different
 * @param {any} event call engine throw out data
 * @returns {any} data
 */
function analyzeEventData(event) {
    return event || {};
}
exports.analyzeEventData = analyzeEventData;
/**
 * delete user from remoteUserInfoList
 * @param {string[]} userIdList to be deleted userIdList
 * @param {ITUIStore} TUIStore TUIStore instance
 */
function deleteRemoteUser(userIdList) {
    if (userIdList.length === 0)
        return;
    let remoteUserInfoList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST);
    userIdList.forEach((userId) => {
        remoteUserInfoList = remoteUserInfoList.filter((obj) => obj.userId !== userId);
    });
    TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_LIST, remoteUserInfoList);
    TUIStore.update(index_1.StoreName.CALL, index_1.NAME.REMOTE_USER_INFO_EXCLUDE_VOLUMN_LIST, remoteUserInfoList);
}
exports.deleteRemoteUser = deleteRemoteUser;
function updateDeviceList(tuiCallEngine) {
    tuiCallEngine === null || tuiCallEngine === void 0 ? void 0 : tuiCallEngine.getDeviceList('speaker').then((result) => {
        const deviceList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.DEVICE_LIST);
        const currentSpeaker = (result === null || result === void 0 ? void 0 : result[0]) || {};
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.DEVICE_LIST, Object.assign(Object.assign({}, deviceList), { speakerList: result, currentSpeaker }));
    }).catch(error => {
        console.error(`${index_1.NAME.PREFIX}updateSpeakerList failed, error: ${JSON.stringify(error)}.`);
    });
    const callMediaType = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.CALL_MEDIA_TYPE);
    if (callMediaType === index_1.CallMediaType.VIDEO) {
        tuiCallEngine === null || tuiCallEngine === void 0 ? void 0 : tuiCallEngine.getDeviceList('camera').then((result) => {
            const deviceList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.DEVICE_LIST);
            const currentCamera = (result === null || result === void 0 ? void 0 : result[0]) || {};
            TUIStore.update(index_1.StoreName.CALL, index_1.NAME.DEVICE_LIST, Object.assign(Object.assign({}, deviceList), { cameraList: result, currentCamera }));
        }).catch(error => {
            console.error(`${index_1.NAME.PREFIX}updateCameraList failed, error: ${error}.`);
        });
    }
    tuiCallEngine === null || tuiCallEngine === void 0 ? void 0 : tuiCallEngine.getDeviceList('microphones').then((result) => {
        const deviceList = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.DEVICE_LIST);
        const currentMicrophone = (result === null || result === void 0 ? void 0 : result[0]) || {};
        TUIStore.update(index_1.StoreName.CALL, index_1.NAME.DEVICE_LIST, Object.assign(Object.assign({}, deviceList), { microphoneList: result, currentMicrophone }));
    }).catch(error => {
        console.error(`${index_1.NAME.PREFIX}updateMicrophoneList failed, error: ${error}.`);
    });
}
exports.updateDeviceList = updateDeviceList;
/**
 * update the no device permission toast
 * @param {any} error error
 * @param {CallMediaType} type call midia type
 * @param {any} tuiCallEngine TUICallEngine instance
 */
function noDevicePermissionToast(error, type, tuiCallEngine) {
    let toastInfoKey = '';
    if ((0, common_utils_1.handleNoDevicePermissionError)(error)) {
        if (type === index_1.CallMediaType.AUDIO) {
            toastInfoKey = index_2.CallTips.NO_MICROPHONE_DEVICE_PERMISSION;
        }
        if (type === index_1.CallMediaType.VIDEO) {
            toastInfoKey = index_2.CallTips.NO_CAMERA_DEVICE_PERMISSION;
        }
        toastInfoKey && TUIStore.update(index_1.StoreName.CALL, index_1.NAME.TOAST_INFO, { content: toastInfoKey, type: index_1.NAME.ERROR });
        console.error(`${index_1.NAME.PREFIX}call failed, error: ${error.message}.`);
    }
}
exports.noDevicePermissionToast = noDevicePermissionToast;
/**
 * set localUserInfo audio/video available
 * @param {boolean} isAvailable is available
 * @param {string} type callMediaType 'audio' | 'video'
 * @param {ITUIStore} TUIStore TUIStore instance
 */
function setLocalUserInfoAudioVideoAvailable(isAvailable, type) {
    let localUserInfo = TUIStore.getData(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO);
    if (type === index_1.NAME.AUDIO) {
        localUserInfo = Object.assign(Object.assign({}, localUserInfo), { isAudioAvailable: isAvailable });
    }
    if (type === index_1.NAME.VIDEO) {
        localUserInfo = Object.assign(Object.assign({}, localUserInfo), { isVideoAvailable: isAvailable });
    }
    TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO, localUserInfo);
    TUIStore.update(index_1.StoreName.CALL, index_1.NAME.LOCAL_USER_INFO_EXCLUDE_VOLUMN, localUserInfo);
}
exports.setLocalUserInfoAudioVideoAvailable = setLocalUserInfoAudioVideoAvailable;
