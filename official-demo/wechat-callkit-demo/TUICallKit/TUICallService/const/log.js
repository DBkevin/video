"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_LEVEL = void 0;
/* eslint-disable */
// 唯一一个变量格式有问题的, 但是为了和原来 TUICallKit 对外暴露的保持一致
var LOG_LEVEL;
(function (LOG_LEVEL) {
    LOG_LEVEL[LOG_LEVEL["NORMAL"] = 0] = "NORMAL";
    LOG_LEVEL[LOG_LEVEL["RELEASE"] = 1] = "RELEASE";
    LOG_LEVEL[LOG_LEVEL["WARNING"] = 2] = "WARNING";
    LOG_LEVEL[LOG_LEVEL["ERROR"] = 3] = "ERROR";
    LOG_LEVEL[LOG_LEVEL["NONE"] = 4] = "NONE";
})(LOG_LEVEL = exports.LOG_LEVEL || (exports.LOG_LEVEL = {}));
