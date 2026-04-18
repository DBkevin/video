package service

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"video-consult-mvp/model"
	jwtpkg "video-consult-mvp/pkg/jwt"
	"video-consult-mvp/pkg/wechat"
	"video-consult-mvp/repository"

	"gorm.io/gorm"
)

const (
	EmployeeTokenRoleBound   = "employee"
	EmployeeTokenRolePending = "employee_pending"
	EmployeeTokenRoleGuest   = "employee_guest"

	EmployeeBindingStatusBound    = "bound"
	EmployeeBindingStatusPending  = "pending"
	EmployeeBindingStatusUnbound  = "unbound"
	EmployeeBindingStatusRejected = "rejected"
)

type EmployeeWXLoginRequest struct {
	Code      string `json:"code" binding:"required"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
}

type EmployeeBindRequestSubmitRequest struct {
	RealName     string `json:"real_name" binding:"required"`
	Mobile       string `json:"mobile"`
	EmployeeCode string `json:"employee_code"`
}

type EmployeeBindRequestInfo struct {
	ID           uint64  `json:"id"`
	Status       string  `json:"status"`
	RealName     string  `json:"real_name"`
	Mobile       string  `json:"mobile"`
	EmployeeCode string  `json:"employee_code"`
	RejectReason string  `json:"reject_reason"`
	EmployeeID   *uint64 `json:"employee_id"`
}

type EmployeeAuthResult struct {
	AccessToken   string                   `json:"access_token,omitempty"`
	ExpiresAt     int64                    `json:"expires_at,omitempty"`
	Role          string                   `json:"role"`
	BindingStatus string                   `json:"binding_status"`
	Employee      *EmployeeBasicInfo       `json:"employee,omitempty"`
	BindRequest   *EmployeeBindRequestInfo `json:"bind_request,omitempty"`
}

type EmployeeDoctorItem struct {
	RelationID uint64 `json:"relation_id"`
	DoctorBasicInfo
}

type EmployeeDoctorListResult struct {
	Items   []EmployeeDoctorItem `json:"items"`
	Message string               `json:"-"`
}

type EmployeeBindSubmitResult struct {
	Request *EmployeeBindRequestInfo `json:"request"`
	Message string                   `json:"-"`
}

type employeeIdentity struct {
	Platform  string
	OpenID    string
	UnionID   string
	Nickname  string
	AvatarURL string
}

type EmployeeService struct {
	db                *gorm.DB
	employeeRepo      *repository.EmployeeRepository
	accountRepo       *repository.EmployeeWechatAccountRepository
	bindRequestRepo   *repository.EmployeeBindRequestRepository
	relationRepo      *repository.DoctorEmployeeRelationRepository
	doctorRepo        *repository.DoctorRepository
	jwtManager        *jwtpkg.Manager
	miniProgramClient *wechat.MiniProgramClient
	consultService    *ConsultService
}

func NewEmployeeService(
	db *gorm.DB,
	employeeRepo *repository.EmployeeRepository,
	accountRepo *repository.EmployeeWechatAccountRepository,
	bindRequestRepo *repository.EmployeeBindRequestRepository,
	relationRepo *repository.DoctorEmployeeRelationRepository,
	doctorRepo *repository.DoctorRepository,
	jwtManager *jwtpkg.Manager,
	miniProgramClient *wechat.MiniProgramClient,
	consultService *ConsultService,
) *EmployeeService {
	return &EmployeeService{
		db:                db,
		employeeRepo:      employeeRepo,
		accountRepo:       accountRepo,
		bindRequestRepo:   bindRequestRepo,
		relationRepo:      relationRepo,
		doctorRepo:        doctorRepo,
		jwtManager:        jwtManager,
		miniProgramClient: miniProgramClient,
		consultService:    consultService,
	}
}

func (s *EmployeeService) WXLogin(ctx context.Context, req EmployeeWXLoginRequest) (*EmployeeAuthResult, error) {
	identity, err := s.resolveIdentityFromCode(ctx, req.Code, req.Nickname, req.AvatarURL)
	if err != nil {
		return nil, err
	}
	return s.buildAuthResult(ctx, identity, true)
}

func (s *EmployeeService) GetBindStatus(ctx context.Context, claims *jwtpkg.Claims) (*EmployeeAuthResult, error) {
	identity := buildIdentityFromClaims(claims)
	if identity.OpenID == "" {
		return nil, NewBizError(http.StatusUnauthorized, "员工登录态已失效，请重新扫码进入")
	}
	return s.buildAuthResult(ctx, identity, false)
}

func (s *EmployeeService) SubmitBindRequest(ctx context.Context, claims *jwtpkg.Claims, req EmployeeBindRequestSubmitRequest) (*EmployeeBindSubmitResult, error) {
	identity := buildIdentityFromClaims(claims)
	if identity.OpenID == "" {
		return nil, NewBizError(http.StatusUnauthorized, "员工登录态已失效，请重新扫码进入")
	}

	if _, err := s.accountRepo.WithDB(s.db.WithContext(ctx)).GetByPlatformOpenID(identity.Platform, identity.OpenID); err == nil {
		return nil, NewBizError(http.StatusConflict, "当前微信身份已绑定员工，无需重复申请")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	latestRequest, err := s.bindRequestRepo.WithDB(s.db.WithContext(ctx)).GetLatestByPlatformOpenID(identity.Platform, identity.OpenID)
	if err == nil && latestRequest.Status == model.EmployeeBindRequestStatusPending {
		return nil, NewBizError(http.StatusConflict, "已有待审核申请，请勿重复提交")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	request := &model.EmployeeBindRequest{
		Platform:     identity.Platform,
		OpenID:       identity.OpenID,
		UnionID:      identity.UnionID,
		Nickname:     identity.Nickname,
		AvatarURL:    identity.AvatarURL,
		RealName:     strings.TrimSpace(req.RealName),
		Mobile:       strings.TrimSpace(req.Mobile),
		EmployeeCode: strings.TrimSpace(req.EmployeeCode),
		Status:       model.EmployeeBindRequestStatusPending,
	}
	if err := HandleDBError(s.bindRequestRepo.WithDB(s.db.WithContext(ctx)).Create(request), "绑定申请提交失败，请稍后重试"); err != nil {
		return nil, err
	}

	return &EmployeeBindSubmitResult{
		Request: buildEmployeeBindRequestInfo(request),
		Message: "绑定申请已提交，请等待后台审核",
	}, nil
}

func (s *EmployeeService) GetAvailableDoctors(ctx context.Context, employeeID uint64) (*EmployeeDoctorListResult, error) {
	if _, err := s.ensureActiveEmployee(ctx, employeeID); err != nil {
		return nil, err
	}

	relations, err := s.relationRepo.WithDB(s.db.WithContext(ctx)).List(0, employeeID, model.DoctorEmployeeRelationStatusActive)
	if err != nil {
		return nil, err
	}

	items := make([]EmployeeDoctorItem, 0, len(relations))
	for _, relation := range relations {
		if relation.Doctor.Status != model.DoctorStatusEnabled {
			continue
		}
		items = append(items, EmployeeDoctorItem{
			RelationID: relation.ID,
			DoctorBasicInfo: DoctorBasicInfo{
				ID:           relation.Doctor.ID,
				Name:         relation.Doctor.Name,
				Title:        relation.Doctor.Title,
				Department:   relation.Doctor.Department,
				Introduction: relation.Doctor.Introduction,
			},
		})
	}

	return &EmployeeDoctorListResult{
		Items:   items,
		Message: "可选医生列表获取成功",
	}, nil
}

func (s *EmployeeService) CreateConsultSession(ctx context.Context, employeeID uint64, req EmployeeCreateConsultSessionRequest) (*ShareConsultSessionResult, error) {
	if _, err := s.ensureActiveEmployee(ctx, employeeID); err != nil {
		return nil, err
	}

	exists, err := s.relationRepo.WithDB(s.db.WithContext(ctx)).ExistsActive(req.DoctorID, employeeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, NewBizError(http.StatusForbidden, "当前员工无权为该医生发起面诊")
	}
	return s.consultService.CreateConsultSessionByEmployee(ctx, employeeID, req)
}

func (s *EmployeeService) ListConsultSessions(ctx context.Context, employeeID uint64, query SessionListQuery) (*SessionListResult, error) {
	if _, err := s.ensureActiveEmployee(ctx, employeeID); err != nil {
		return nil, err
	}
	return s.consultService.ListConsultSessionsByEmployee(ctx, employeeID, query)
}

func (s *EmployeeService) GetConsultSession(ctx context.Context, employeeID, sessionID uint64) (*SessionDetailResult, error) {
	if _, err := s.ensureActiveEmployee(ctx, employeeID); err != nil {
		return nil, err
	}
	return s.consultService.GetConsultSessionForEmployee(ctx, employeeID, sessionID)
}

func (s *EmployeeService) resolveIdentityFromCode(ctx context.Context, code, nickname, avatarURL string) (*employeeIdentity, error) {
	if s.miniProgramClient == nil {
		return nil, NewBizError(http.StatusInternalServerError, "微信小程序登录能力未配置")
	}

	wxResult, err := s.miniProgramClient.Code2Session(ctx, code)
	if err != nil {
		return nil, NewBizError(http.StatusBadRequest, "员工微信登录失败："+err.Error())
	}
	if wxResult.OpenID == "" {
		return nil, NewBizError(http.StatusBadRequest, "员工微信登录失败，未获取到身份标识")
	}

	return &employeeIdentity{
		Platform:  model.WechatPlatformMiniProgram,
		OpenID:    wxResult.OpenID,
		UnionID:   strings.TrimSpace(wxResult.UnionID),
		Nickname:  normalizeWXNickname(nickname),
		AvatarURL: strings.TrimSpace(avatarURL),
	}, nil
}

func (s *EmployeeService) buildAuthResult(ctx context.Context, identity *employeeIdentity, withToken bool) (*EmployeeAuthResult, error) {
	account, err := s.accountRepo.WithDB(s.db.WithContext(ctx)).GetByPlatformOpenID(identity.Platform, identity.OpenID)
	if err == nil {
		if account.Status != model.EmployeeWechatAccountStatusActive {
			return nil, NewBizError(http.StatusForbidden, "当前微信身份已被禁用")
		}
		if account.Employee.Status != model.EmployeeStatusActive {
			return nil, NewBizError(http.StatusForbidden, "当前员工账号已被禁用")
		}

		result := &EmployeeAuthResult{
			Role:          EmployeeTokenRoleBound,
			BindingStatus: EmployeeBindingStatusBound,
			Employee:      buildEmployeeBasicInfo(&account.EmployeeID, &account.Employee),
		}
		if withToken {
			token, expiresAt, err := s.jwtManager.GenerateTokenWithOptions(account.EmployeeID, EmployeeTokenRoleBound, jwtpkg.TokenOptions{
				Platform:  identity.Platform,
				OpenID:    identity.OpenID,
				UnionID:   identity.UnionID,
				Nickname:  identity.Nickname,
				AvatarURL: identity.AvatarURL,
			})
			if err != nil {
				return nil, err
			}
			result.AccessToken = token
			result.ExpiresAt = expiresAt
		}
		return result, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	result := &EmployeeAuthResult{
		Role:          EmployeeTokenRoleGuest,
		BindingStatus: EmployeeBindingStatusUnbound,
	}
	latestRequest, err := s.bindRequestRepo.WithDB(s.db.WithContext(ctx)).GetLatestByPlatformOpenID(identity.Platform, identity.OpenID)
	if err == nil {
		result.BindRequest = buildEmployeeBindRequestInfo(latestRequest)
		switch latestRequest.Status {
		case model.EmployeeBindRequestStatusPending:
			result.Role = EmployeeTokenRolePending
			result.BindingStatus = EmployeeBindingStatusPending
		case model.EmployeeBindRequestStatusRejected:
			result.BindingStatus = EmployeeBindingStatusRejected
		}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if withToken {
		token, expiresAt, err := s.jwtManager.GenerateTokenWithOptions(0, result.Role, jwtpkg.TokenOptions{
			Platform:  identity.Platform,
			OpenID:    identity.OpenID,
			UnionID:   identity.UnionID,
			Nickname:  identity.Nickname,
			AvatarURL: identity.AvatarURL,
		})
		if err != nil {
			return nil, err
		}
		result.AccessToken = token
		result.ExpiresAt = expiresAt
	}

	return result, nil
}

func buildEmployeeBindRequestInfo(request *model.EmployeeBindRequest) *EmployeeBindRequestInfo {
	if request == nil {
		return nil
	}
	return &EmployeeBindRequestInfo{
		ID:           request.ID,
		Status:       request.Status,
		RealName:     request.RealName,
		Mobile:       request.Mobile,
		EmployeeCode: request.EmployeeCode,
		RejectReason: request.RejectReason,
		EmployeeID:   request.EmployeeID,
	}
}

func buildIdentityFromClaims(claims *jwtpkg.Claims) *employeeIdentity {
	if claims == nil {
		return &employeeIdentity{}
	}
	return &employeeIdentity{
		Platform:  claims.Platform,
		OpenID:    claims.OpenID,
		UnionID:   claims.UnionID,
		Nickname:  claims.Nickname,
		AvatarURL: claims.AvatarURL,
	}
}

func (s *EmployeeService) ensureActiveEmployee(ctx context.Context, employeeID uint64) (*model.Employee, error) {
	employee, err := s.employeeRepo.WithDB(s.db.WithContext(ctx)).GetByID(employeeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "员工不存在")
		}
		return nil, err
	}
	if employee.Status != model.EmployeeStatusActive {
		return nil, NewBizError(http.StatusForbidden, "当前员工账号已禁用")
	}
	return employee, nil
}
