import { CallStatus, TUICallKitAPI } from "../../../TUICallService/index";
const PATH = "../../../static";

// Player state codes from TRTC-WX
const PLAYER_CODE = {
  RTMP_CONNECTED: 2002,    // Connected to RTMP server, start pulling stream
  VIDEO_PLAY_START: 2004,  // Video playback started
};
Component({
  properties: {
    callRole: {
      type: String,
    },
    callStatus: {
      type: String,
    },
    callMediaType: {
      type: Number,
    },
    callDuration: {
      type: String,
    },
    pusher: {
      type: Object,
    },
    playerList: {
      type: Array,
    },
    localUserInfo: {
      type: Object,
    },
    remoteUserInfoList: {
      type: Array,
    },
    isEarPhone: {
      type: Boolean,
    },
    bigScreenUserId: {
      type: Boolean,
    },
    enableFloatWindow: {
      type: Boolean,
    },
    enableVirtualBackground: {
      type: Boolean,
    },
    isVirtualBackground: {
      type: Boolean,
    },
    isClickable: {
      type: Boolean,
    },
  },
  data: {
    IMG_DEFAULT_AVATAR: `${PATH}/default_avatar.png`,
    IMG_HANGUP: `${PATH}/hangup.png`,
    IMG_ACCEPT: `${PATH}/dialing.png`,
    IMG_SPEAKER_FALSE: `${PATH}/speaker-false.png`,
    IMG_SPEAKER_TRUE: `${PATH}/speaker-true.png`,
    IMG_AUDIO_TRUE: `${PATH}/audio-true.png`,
    IMG_AUDIO_FALSE: `${PATH}/audio-false.png`,
    IMG_CAMERA_TRUE: `${PATH}/camera-true.png`,
    IMG_CAMERA_FALSE: `${PATH}/camera-false.png`,
    IMG_TRANS: `${PATH}/trans.png`,
    IMG_SWITCH_CAMERA: `${PATH}/switch_camera.png`,
    IMG_MINIMIZE_BLACK: `${PATH}/minimize-black.svg`,
    IMG_MINIMIZE_WHITE: `${PATH}/minimize-white.png`,
    IMG_VIRTUALBACKGROUND_OPEN: `${PATH}/virtualBackground-open.png`,
    IMG_VIRTUALBACKGROUND_CLOSE: `${PATH}/virtualBackground-close.png`,
    IMG_VIRTUALBACKGROUND_MINI: `${PATH}/virtualBackground-mini.png`,
    IMG_LOADING: `${PATH}/loading.png`,
    // 使用空字符串作为属性传入，属性更新不会更新live-pusher
    pictureMode: "push",
  },
  methods: {
    async accept() {
      await TUICallKitAPI.accept();
    },
    async hangup() {
      if (!this.data.isClickable) {
        return;
      }
      this.exitPictureInPicture(false);
      await TUICallKitAPI.hangup();
    },
    async reject() {
      await TUICallKitAPI.reject();
    },
    async switchCamera() {
      await TUICallKitAPI.switchCamera();
    },
    toggleMinimize() {
      wx.navigateBack();
    },
    async microPhoneHandler() {
      if (this.data.localUserInfo.isAudioAvailable) {
        await TUICallKitAPI.closeMicrophone();
      } else {
        await TUICallKitAPI.openMicrophone();
      }
    },
    async cameraHandler() {
      if (this.data.localUserInfo.isVideoAvailable) {
        await TUICallKitAPI.closeCamera();
      } else {
        await TUICallKitAPI.openCamera('localVideo');
      }
    },
    async toggleSoundMode() {
      await TUICallKitAPI.setSoundMode();
    },
    async setBlurBackground() {
      await TUICallKitAPI.setBlurBackground(!this.data.isVirtualBackground);
    },
    toggleViewSize() {
      TUICallKitAPI.switchScreen(
        this.data.bigScreenUserId ? "player" : "localVideo"
      );
    },
    exitPictureInPicture(shouldHangup = false) {
      if (!this.data.enableFloatWindow) return;
      // Only hangup when explicitly requested (e.g., detached lifecycle)
      if (shouldHangup && this.data.callStatus === CallStatus.CONNECTED) {
        TUICallKitAPI.hangup();
      } 
      // iOS 设备需要通过属性来控制小窗的关闭
      this.setData({ pictureMode: "push" });
      
      // Android 设备需要通过 exitPictureInPicture 接口关闭悬浮窗
      try {
        const pusherContext = wx.createLivePusherContext();
        if (pusherContext && typeof pusherContext.exitPictureInPicture === 'function') {
          pusherContext.exitPictureInPicture();
        }
      } catch (error) {
        console.warn('[TUICallKit] exitPictureInPicture failed:', error);
      }
    },
    handlePusherCode(e) {
      // 1032: 用户离开当前页面，触发悬浮窗 TRTC-WX 抛出的该通知用户离开事件
      if (e.detail.code === 1032) {
        this.setData({
          pictureMode: "push",
        });
      }
    },
    handlePlayerCode(e) {
      const { code } = e.detail;
      const { callMediaType } = this.data;
      
      // Audio call: trigger on RTMP connected (2002)
      // Video call: trigger on video playback start (2004)
      const shouldEnablePIP = 
        (callMediaType === 1 && code === PLAYER_CODE.RTMP_CONNECTED) ||
        (callMediaType === 2 && code === PLAYER_CODE.VIDEO_PLAY_START);
      
      if (shouldEnablePIP) {
        this.setData({ pictureMode: "pop" });
      }
    },
    pusherStateChangeHandler(e) {
      if (this.data.enableFloatWindow) {
        this.handlePusherCode(e);
      }
    },
    playerStateChange(e) {
      if (this.data.enableFloatWindow) {
        this.handlePlayerCode(e);
      }
    },
  },
  lifetimes: {
    detached() {
      this.exitPictureInPicture(true);
    },
  },
});
