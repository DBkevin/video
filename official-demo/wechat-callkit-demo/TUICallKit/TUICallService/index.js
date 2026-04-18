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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutMode = exports.FeatureButton = exports.uiDesign = exports.t = exports.AudioPlayBackDevice = exports.VideoDisplayMode = exports.VideoResolution = exports.StatusChange = exports.CallMediaType = exports.CallRole = exports.CallStatus = exports.NAME = exports.TUICallKitAPI = exports.StoreName = exports.TUIStore = exports.TUIGlobal = void 0;
const index_1 = __importStar(require("./CallService/index"));
Object.defineProperty(exports, "TUIGlobal", { enumerable: true, get: function () { return index_1.TUIGlobal; } });
Object.defineProperty(exports, "TUIStore", { enumerable: true, get: function () { return index_1.TUIStore; } });
Object.defineProperty(exports, "uiDesign", { enumerable: true, get: function () { return index_1.uiDesign; } });
const index_2 = require("./const/index");
Object.defineProperty(exports, "StoreName", { enumerable: true, get: function () { return index_2.StoreName; } });
Object.defineProperty(exports, "NAME", { enumerable: true, get: function () { return index_2.NAME; } });
Object.defineProperty(exports, "CallRole", { enumerable: true, get: function () { return index_2.CallRole; } });
Object.defineProperty(exports, "CallMediaType", { enumerable: true, get: function () { return index_2.CallMediaType; } });
Object.defineProperty(exports, "CallStatus", { enumerable: true, get: function () { return index_2.CallStatus; } });
Object.defineProperty(exports, "StatusChange", { enumerable: true, get: function () { return index_2.StatusChange; } });
Object.defineProperty(exports, "VideoResolution", { enumerable: true, get: function () { return index_2.VideoResolution; } });
Object.defineProperty(exports, "VideoDisplayMode", { enumerable: true, get: function () { return index_2.VideoDisplayMode; } });
Object.defineProperty(exports, "AudioPlayBackDevice", { enumerable: true, get: function () { return index_2.AudioPlayBackDevice; } });
Object.defineProperty(exports, "FeatureButton", { enumerable: true, get: function () { return index_2.FeatureButton; } });
Object.defineProperty(exports, "LayoutMode", { enumerable: true, get: function () { return index_2.LayoutMode; } });
const index_3 = require("./locales/index");
Object.defineProperty(exports, "t", { enumerable: true, get: function () { return index_3.t; } });
// 实例化
const TUICallKitAPI = index_1.default.getInstance();
exports.TUICallKitAPI = TUICallKitAPI;
