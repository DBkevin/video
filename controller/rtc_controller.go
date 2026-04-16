package controller

import (
	"video-consult-mvp/middleware"
	"video-consult-mvp/pkg/response"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
)

type RTCController struct {
	rtcService *service.RTCService
}

func NewRTCController(rtcService *service.RTCService) *RTCController {
	return &RTCController{rtcService: rtcService}
}

func (ctl *RTCController) GenerateUserSig(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	var req service.GenerateUserSigRequest
	_ = c.ShouldBindJSON(&req)

	result, err := ctl.rtcService.GenerateUserSig(c.Request.Context(), claims.Role, claims.UserID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, "获取 UserSig 成功", result)
}
