import { TUICallKitAPI, TUIStore, StoreName, NAME } from "../index";
import { CallTips, t } from '../TUICallService/locales/index';
const {
  CALL_STATUS,
  CALL_ROLE,
  CALL_MEDIA_TYPE,
  LOCAL_USER_INFO,
  REMOTE_USER_INFO_LIST,
  CALLER_USER_INFO,
  IS_GROUP,
  CALL_DURATION,
  PUSHER,
  PLAYER,
  BIG_SCREEN_USER_ID,
  IS_EAR_PHONE,
  LOCAL_VIDEO,
  MYSELF,
  TOAST_INFO,
  ENABLE_FLOAT_WINDOW,
  IS_SHOW_ENABLE_VIRTUAL_BACKGROUND,
  ENABLE_VIRTUAL_BACKGROUND,
  NETWORK_STATUS,
  CALL_TIPS,
  IS_CLICKABLE
} = NAME;

Component({
  properties: {},
  data: {
    callStatus: TUIStore.getData(StoreName.CALL, CALL_STATUS), // 通话状态
    isGroupCall: TUIStore.getData(StoreName.CALL, IS_GROUP), // 是否群通话
    callMediaType: TUIStore.getData(StoreName.CALL, CALL_MEDIA_TYPE), // 通话类型
    callDuration: TUIStore.getData(StoreName.CALL, CALL_DURATION), // 通话时长
    callRole: TUIStore.getData(StoreName.CALL, CALL_ROLE), // 通话角色
    isEarPhone: TUIStore.getData(StoreName.CALL, IS_EAR_PHONE), // 声音模式 听筒/扬声器
    bigScreenUserId: TUIStore.getData(StoreName.CALL, BIG_SCREEN_USER_ID), // 大屏显示的用户
    localUserInfo: TUIStore.getData(StoreName.CALL, LOCAL_USER_INFO), // 本地用户信息
    callerUserInfo: TUIStore.getData(StoreName.CALL, CALLER_USER_INFO), // 邀请者用户信息
    remoteUserInfoList: TUIStore.getData(StoreName.CALL, REMOTE_USER_INFO_LIST), // 远端用户信息
    pusher: TUIStore.getData(StoreName.CALL, PUSHER), // TRTC 本地流
    playerList: TUIStore.getData(StoreName.CALL, PLAYER), // TRTC 远端流
    playerProcess: {}, // 经过处理的的远端流(多人通话)
    enableFloatWindow: TUIStore.getData(StoreName.CALL, ENABLE_FLOAT_WINDOW), // 开启/关闭悬浮窗功能，设置为false，通话界面左上角的悬浮窗按钮会隐藏
    enableVirtualBackground: TUIStore.getData(StoreName.CALL, IS_SHOW_ENABLE_VIRTUAL_BACKGROUND), // 开启/关闭虚拟背景功能，设置为 false，通话界面的虚拟背景按钮会隐藏
    isVirtualBackground: TUIStore.getData(StoreName.CALL, ENABLE_VIRTUAL_BACKGROUND), // 当前是否是虚拟背景模式
    isClickable: TUIStore.getData(StoreName.CALL, IS_CLICKABLE), // 按钮是否可点击
    watchOptions: {},
  },
  methods: {
    // 监听通话状态变更回调
    handleCallStatusChange(value) {
      this.setData({
        callStatus: value,
      });
    },
    // 监听是否群组通话变更回调
    handleIsGroupChange(value) {
      this.setData({
        isGroupCall: value,
      });
    },
    // 监听通话类型变更回调
    handleCallMediaTypeChange(value) {
      this.setData({
        callMediaType: value,
      });
    },
    // 监听通话角色变更回调
    handleCallRoleChange(value) {
      this.setData({
        callRole: value,
      });
    },
    // 监听通话时长变更回调
    handleCallDurationChange(value) {
      this.setData({
        callDuration: value,
      });
    },
    // 监听声音模式变更回调
    handleEarPhoneChange(value) {
      this.setData({
        isEarPhone: value,
      });
    },
    // 监听大屏显示的用户变更回调
    handleScreenChange(value) {
      if (value === LOCAL_VIDEO) {
        this.setData({
          bigScreenUserId: true,
        });
      } else {
        this.setData({
          bigScreenUserId: false,
        });
      }
    },
    // 监听本地用户信息变更回调
    handleLocalUserInfoChange(value) {
      this.setData({
        localUserInfo: value,
      });
    },
    // 监听到邀请者信息变更回调
    handleCallerUserInfoChange(value) {
      this.setData({
        callerUserInfo: value,
      });
    },
    // 监听远端用户信息变更回调
    handleRemoteUserInfoListChange(value) {
      this.setData({
        remoteUserInfoList: value,
      });
    },
    // 监听 TRTC 本地流变更回调
    handlePusherChange(value) {
      this.setData({
        pusher: value,
      });
    },
    // 监听 TRTC 远端流变更回调
    handlePlayerListChange(value) {
      if (this.data.isGroupCall) {
        const convertToPlayer = this.convertToObj(value);
        this.setData({
          playerProcess: convertToPlayer,
        });
      } else {
        this.setData({
          playerList: value,
        });
      }
    },
    // 监听到弹窗信息变更回调
    handleToastInfoChange(value) {
      if (value.text) {
        this.showToast(value.text, value.type || "info");
      }
    },
    showToast(value, type) {
      switch (type) {
        case "info":
          wx.showToast({
            title: value,
            icon: "none",
          });
          break;
        default:
          break;
      }
    },
    convertToObj(arr = []) {
      const tempObject = {};
      for (let i = 0; i < arr.length; i++) {
        tempObject[arr[i].userID] = arr[i];
      }
      return tempObject;
    },
    handleFloatWindowChange(value) {
      this.setData({
        enableFloatWindow: value,
      });
    },
    handleEnableVirtualChange(value) {
      this.setData({
        enableVirtualBackground: value,
      });
    },
    handleBackgroundChange(value) {
      this.setData({
        isVirtualBackground: value,
      });
    },
    handleNetWorkStatusChange(value) {
      if (!this.data.isGroupCall || !value) return;     
      const netWorkQualityList = value.filter(user => user.quality >= 4).map(user => user.userId) || [];
      if (netWorkQualityList.length > 0) {
        wx.showToast({
          title: '当前通话网络质量不佳',
          icon: "none",
        });
      }
    },
    handleCallTipsChange(value) {
      if ([CallTips.LOCAL_NETWORK_IS_POOR, CallTips.REMOTE_NETWORK_IS_POOR].indexOf(value) === -1) return;
      wx.showToast({
        title: value,
        icon: "none",
      });
    },
    handleClickableChange(value) {
      this.setData({
        isClickable: value,
      });
    },
  },

  // 生命周期方法
  lifetimes: {
    attached() {
      const watchOptions = {
        // The change of callStatus needs to be after whether it isGroupCall, to avoid having two live-pusher.
        [IS_GROUP]: this.handleIsGroupChange.bind(this),
        [CALL_STATUS]: this.handleCallStatusChange.bind(this),
        [CALL_MEDIA_TYPE]: this.handleCallMediaTypeChange.bind(this),
        [CALL_DURATION]: this.handleCallDurationChange.bind(this),
        [CALL_ROLE]: this.handleCallRoleChange.bind(this),
        [IS_EAR_PHONE]: this.handleEarPhoneChange.bind(this),
        [BIG_SCREEN_USER_ID]: this.handleScreenChange.bind(this),
        [LOCAL_USER_INFO]: this.handleLocalUserInfoChange.bind(this),
        [CALLER_USER_INFO]: this.handleCallerUserInfoChange.bind(this),
        [REMOTE_USER_INFO_LIST]: this.handleRemoteUserInfoListChange.bind(this),
        [TOAST_INFO]: this.handleToastInfoChange.bind(this),
        [PUSHER]: this.handlePusherChange.bind(this),
        [PLAYER]: this.handlePlayerListChange.bind(this),
        [ENABLE_FLOAT_WINDOW]: this.handleFloatWindowChange.bind(this),
        [IS_SHOW_ENABLE_VIRTUAL_BACKGROUND]: this.handleEnableVirtualChange.bind(this),
        [ENABLE_VIRTUAL_BACKGROUND]: this.handleBackgroundChange.bind(this),
        [NETWORK_STATUS]: this.handleNetWorkStatusChange.bind(this),
        [CALL_TIPS]: this.handleCallTipsChange.bind(this),
        [IS_CLICKABLE]: this.handleClickableChange.bind(this),
      };
      this.setData({ watchOptions });
      TUIStore.watch(StoreName.CALL, watchOptions, {  notifyRangeWhenWatch: MYSELF });
    },
    async detached() {
      TUIStore.unwatch(StoreName.CALL, this.data.watchOptions);
      await TUICallKitAPI.handleExceptionExit();
    },
  },
});
