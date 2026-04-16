package controller

import (
	"video-consult-mvp/pkg/response"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	authService *service.AuthService
}

func NewAuthController(authService *service.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

func (ctl *AuthController) UserLogin(c *gin.Context) {
	var req service.UserLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.authService.UserLogin(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, "登录成功", result)
}

func (ctl *AuthController) DoctorLogin(c *gin.Context) {
	var req service.DoctorLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.authService.DoctorLogin(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, "登录成功", result)
}

func (ctl *AuthController) WXLogin(c *gin.Context) {
	var req service.WXLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.authService.WXLogin(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, "登录成功", result)
}
