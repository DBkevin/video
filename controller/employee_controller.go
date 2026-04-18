package controller

import (
	"strconv"

	"video-consult-mvp/middleware"
	"video-consult-mvp/pkg/response"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
)

type EmployeeController struct {
	employeeService *service.EmployeeService
}

func NewEmployeeController(employeeService *service.EmployeeService) *EmployeeController {
	return &EmployeeController{employeeService: employeeService}
}

func (ctl *EmployeeController) WXLogin(c *gin.Context) {
	var req service.EmployeeWXLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.employeeService.WXLogin(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, "员工登录成功", result)
}

func (ctl *EmployeeController) GetBindStatus(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	result, err := ctl.employeeService.GetBindStatus(c.Request.Context(), claims)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, "绑定状态获取成功", result)
}

func (ctl *EmployeeController) SubmitBindRequest(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	var req service.EmployeeBindRequestSubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.employeeService.SubmitBindRequest(c.Request.Context(), claims, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "绑定申请提交成功"), result)
}

func (ctl *EmployeeController) GetDoctors(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	result, err := ctl.employeeService.GetAvailableDoctors(c.Request.Context(), claims.UserID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "可选医生列表获取成功"), result)
}

func (ctl *EmployeeController) CreateConsultSession(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	var req service.EmployeeCreateConsultSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.employeeService.CreateConsultSession(c.Request.Context(), claims.UserID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "员工会话创建成功"), result)
}

func (ctl *EmployeeController) ListConsultSessions(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	page, pageSize := parsePageQuery(c)
	result, err := ctl.employeeService.ListConsultSessions(c.Request.Context(), claims.UserID, service.SessionListQuery{
		Status:     c.Query("status"),
		SourceType: c.Query("source_type"),
		DoctorID:   parseUintQuery(c, "doctor_id"),
		Page:       page,
		PageSize:   pageSize,
	})
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "员工会话列表获取成功"), result)
}

func (ctl *EmployeeController) GetConsultSession(c *gin.Context) {
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

	result, err := ctl.employeeService.GetConsultSession(c.Request.Context(), claims.UserID, sessionID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "员工会话详情获取成功"), result)
}
