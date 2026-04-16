package controller

import (
	"strconv"

	"video-consult-mvp/middleware"
	"video-consult-mvp/pkg/response"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
)

type ConsultController struct {
	consultService *service.ConsultService
}

func NewConsultController(consultService *service.ConsultService) *ConsultController {
	return &ConsultController{consultService: consultService}
}

func (ctl *ConsultController) CreateConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	var req service.CreateConsultSessionRequest
	_ = c.ShouldBindJSON(&req)

	result, err := ctl.consultService.CreateConsultSession(c.Request.Context(), claims.UserID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "会话创建成功"), result)
}

func (ctl *ConsultController) ShareConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	var req service.ShareConsultSessionRequest
	_ = c.ShouldBindJSON(&req)

	result, err := ctl.consultService.ShareConsultSession(c.Request.Context(), sessionID, claims.UserID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "分享入口生成成功"), result)
}

func (ctl *ConsultController) GetConsultEntry(c *gin.Context) {
	result, err := ctl.consultService.GetConsultEntryByToken(c.Request.Context(), c.Query("token"))
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "入口信息获取成功"), result)
}

func (ctl *ConsultController) GetConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	result, err := ctl.consultService.GetConsultSession(c.Request.Context(), sessionID, claims.UserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "会话信息获取成功"), result)
}

func (ctl *ConsultController) JoinConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	var req service.JoinConsultSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.consultService.JoinConsultSession(c.Request.Context(), sessionID, claims.UserID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "加入会话成功"), result)
}

func (ctl *ConsultController) StartConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	result, err := ctl.consultService.StartConsultSession(c.Request.Context(), sessionID, claims.UserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "开始面诊成功"), result)
}

func (ctl *ConsultController) FinishConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	var req service.FinishConsultSessionRequest
	_ = c.ShouldBindJSON(&req)

	result, err := ctl.consultService.FinishConsultSession(c.Request.Context(), sessionID, claims.UserID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "结束面诊成功"), result)
}

func (ctl *ConsultController) CancelConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	result, err := ctl.consultService.CancelConsultSession(c.Request.Context(), sessionID, claims.UserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "会话取消成功"), result)
}

func (ctl *ConsultController) LeaveConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	result, err := ctl.consultService.LeaveConsultSession(c.Request.Context(), sessionID, claims.UserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}

	response.Success(c, fallbackMessage(result.Message, "离开会话成功"), result)
}

func fallbackMessage(current, fallback string) string {
	if current != "" {
		return current
	}
	return fallback
}
