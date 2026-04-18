package controller

import (
	"strconv"

	"video-consult-mvp/middleware"
	"video-consult-mvp/pkg/response"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
)

type AdminController struct {
	adminService *service.AdminService
}

func NewAdminController(adminService *service.AdminService) *AdminController {
	return &AdminController{adminService: adminService}
}

func (ctl *AdminController) Login(c *gin.Context) {
	var req service.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.Login(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, "登录成功", result)
}

func (ctl *AdminController) ListEmployees(c *gin.Context) {
	page, pageSize := parsePageQuery(c)
	result, err := ctl.adminService.ListEmployees(c.Request.Context(), c.Query("keyword"), c.Query("status"), page, pageSize)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "员工列表获取成功"), result)
}

func (ctl *AdminController) CreateEmployee(c *gin.Context) {
	var req service.AdminEmployeeUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.CreateEmployee(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "员工创建成功"), result)
}

func (ctl *AdminController) UpdateEmployee(c *gin.Context) {
	employeeID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "员工ID不合法")
		return
	}

	var req service.AdminEmployeeUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.UpdateEmployee(c.Request.Context(), employeeID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "员工更新成功"), result)
}

func (ctl *AdminController) ListBindRequests(c *gin.Context) {
	page, pageSize := parsePageQuery(c)
	result, err := ctl.adminService.ListBindRequests(c.Request.Context(), c.Query("status"), page, pageSize)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "绑定申请列表获取成功"), result)
}

func (ctl *AdminController) ApproveBindRequest(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	requestID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "绑定申请ID不合法")
		return
	}

	var req service.ApproveBindRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.ApproveBindRequest(c.Request.Context(), claims.UserID, requestID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, "绑定申请审核通过", gin.H{"request": result})
}

func (ctl *AdminController) RejectBindRequest(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		response.Unauthorized(c, "登录状态无效")
		return
	}

	requestID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "绑定申请ID不合法")
		return
	}

	var req service.RejectBindRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.RejectBindRequest(c.Request.Context(), claims.UserID, requestID, req.Reason)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, "绑定申请已驳回", gin.H{"request": result})
}

func (ctl *AdminController) ListDoctors(c *gin.Context) {
	page, pageSize := parsePageQuery(c)
	result, err := ctl.adminService.ListDoctors(c.Request.Context(), c.Query("keyword"), c.Query("status"), page, pageSize)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "医生列表获取成功"), result)
}

func (ctl *AdminController) CreateDoctor(c *gin.Context) {
	var req service.AdminDoctorUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.CreateDoctor(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "医生创建成功"), result)
}

func (ctl *AdminController) UpdateDoctor(c *gin.Context) {
	doctorID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "医生ID不合法")
		return
	}

	var req service.AdminDoctorUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.UpdateDoctor(c.Request.Context(), doctorID, req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "医生更新成功"), result)
}

func (ctl *AdminController) ListDoctorEmployeeRelations(c *gin.Context) {
	doctorID := parseUintQuery(c, "doctor_id")
	employeeID := parseUintQuery(c, "employee_id")
	result, err := ctl.adminService.ListDoctorEmployeeRelations(c.Request.Context(), doctorID, employeeID, c.Query("status"))
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "医生员工关系获取成功"), result)
}

func (ctl *AdminController) CreateDoctorEmployeeRelation(c *gin.Context) {
	var req service.DoctorEmployeeRelationCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请求参数不合法")
		return
	}

	result, err := ctl.adminService.CreateDoctorEmployeeRelation(c.Request.Context(), req)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "医生员工关系创建成功"), result)
}

func (ctl *AdminController) DeleteDoctorEmployeeRelation(c *gin.Context) {
	relationID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "关系ID不合法")
		return
	}

	if err := ctl.adminService.DeleteDoctorEmployeeRelation(c.Request.Context(), relationID); err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, "医生员工关系删除成功", nil)
}

func (ctl *AdminController) ListConsultSessions(c *gin.Context) {
	page, pageSize := parsePageQuery(c)
	result, err := ctl.adminService.ListConsultSessions(c.Request.Context(), service.SessionListQuery{
		Status:     c.Query("status"),
		SourceType: c.Query("source_type"),
		DoctorID:   parseUintQuery(c, "doctor_id"),
		EmployeeID: parseUintQuery(c, "employee_id"),
		Page:       page,
		PageSize:   pageSize,
	})
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "会话列表获取成功"), result)
}

func (ctl *AdminController) GetConsultSession(c *gin.Context) {
	sessionID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.BadRequest(c, "会话ID不合法")
		return
	}

	result, err := ctl.adminService.GetConsultSession(c.Request.Context(), sessionID)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	response.Success(c, fallbackMessage(result.Message, "会话详情获取成功"), result)
}
