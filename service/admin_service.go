package service

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"video-consult-mvp/model"
	jwtpkg "video-consult-mvp/pkg/jwt"
	"video-consult-mvp/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AdminLoginResult struct {
	AccessToken string          `json:"access_token"`
	ExpiresAt   int64           `json:"expires_at"`
	Role        string          `json:"role"`
	Admin       *AdminBasicInfo `json:"admin"`
}

type AdminBasicInfo struct {
	ID          uint64 `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"`
}

type AdminEmployeeUpsertRequest struct {
	RealName     string `json:"real_name" binding:"required"`
	Mobile       string `json:"mobile"`
	EmployeeCode string `json:"employee_code"`
	Status       string `json:"status"`
	Remark       string `json:"remark"`
}

type AdminEmployeeItem struct {
	ID                 uint64 `json:"id"`
	RealName           string `json:"real_name"`
	Mobile             string `json:"mobile"`
	EmployeeCode       string `json:"employee_code"`
	Status             string `json:"status"`
	Remark             string `json:"remark"`
	WechatAccountCount int64  `json:"wechat_account_count"`
}

type AdminEmployeeListResult struct {
	Items    []AdminEmployeeItem `json:"items"`
	Total    int64               `json:"total"`
	Page     int                 `json:"page"`
	PageSize int                 `json:"page_size"`
	Message  string              `json:"-"`
}

type AdminEmployeeResult struct {
	Employee *model.Employee `json:"employee"`
	Message  string          `json:"-"`
}

type AdminBindRequestListResult struct {
	Items    []model.EmployeeBindRequest `json:"items"`
	Total    int64                       `json:"total"`
	Page     int                         `json:"page"`
	PageSize int                         `json:"page_size"`
	Message  string                      `json:"-"`
}

type ApproveBindRequestRequest struct {
	EmployeeID   uint64 `json:"employee_id"`
	RealName     string `json:"real_name"`
	Mobile       string `json:"mobile"`
	EmployeeCode string `json:"employee_code"`
	Remark       string `json:"remark"`
}

type RejectBindRequestRequest struct {
	Reason string `json:"reason" binding:"required"`
}

type AdminDoctorUpsertRequest struct {
	Name         string `json:"name" binding:"required"`
	Mobile       string `json:"mobile" binding:"required"`
	Title        string `json:"title"`
	Department   string `json:"department"`
	Introduction string `json:"introduction"`
	EmployeeNo   string `json:"employee_no" binding:"required"`
	Password     string `json:"password"`
	Status       string `json:"status"`
}

type AdminDoctorListResult struct {
	Items    []model.Doctor `json:"items"`
	Total    int64          `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"page_size"`
	Message  string         `json:"-"`
}

type AdminDoctorResult struct {
	Doctor  *model.Doctor `json:"doctor"`
	Message string        `json:"-"`
}

type DoctorEmployeeRelationCreateRequest struct {
	DoctorID   uint64 `json:"doctor_id" binding:"required"`
	EmployeeID uint64 `json:"employee_id" binding:"required"`
	Status     string `json:"status"`
}

type DoctorEmployeeRelationListResult struct {
	Items   []model.DoctorEmployeeRelation `json:"items"`
	Message string                         `json:"-"`
}

type DoctorEmployeeRelationResult struct {
	Relation *model.DoctorEmployeeRelation `json:"relation"`
	Message  string                        `json:"-"`
}

type AdminService struct {
	db              *gorm.DB
	adminRepo       *repository.AdminUserRepository
	employeeRepo    *repository.EmployeeRepository
	accountRepo     *repository.EmployeeWechatAccountRepository
	bindRequestRepo *repository.EmployeeBindRequestRepository
	doctorRepo      *repository.DoctorRepository
	relationRepo    *repository.DoctorEmployeeRelationRepository
	jwtManager      *jwtpkg.Manager
	consultService  *ConsultService
}

func NewAdminService(
	db *gorm.DB,
	adminRepo *repository.AdminUserRepository,
	employeeRepo *repository.EmployeeRepository,
	accountRepo *repository.EmployeeWechatAccountRepository,
	bindRequestRepo *repository.EmployeeBindRequestRepository,
	doctorRepo *repository.DoctorRepository,
	relationRepo *repository.DoctorEmployeeRelationRepository,
	jwtManager *jwtpkg.Manager,
	consultService *ConsultService,
) *AdminService {
	return &AdminService{
		db:              db,
		adminRepo:       adminRepo,
		employeeRepo:    employeeRepo,
		accountRepo:     accountRepo,
		bindRequestRepo: bindRequestRepo,
		doctorRepo:      doctorRepo,
		relationRepo:    relationRepo,
		jwtManager:      jwtManager,
		consultService:  consultService,
	}
}

func (s *AdminService) Login(ctx context.Context, req AdminLoginRequest) (*AdminLoginResult, error) {
	admin, err := s.adminRepo.WithDB(s.db.WithContext(ctx)).GetByUsername(strings.TrimSpace(req.Username))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusUnauthorized, "管理员账号或密码错误")
		}
		return nil, err
	}
	if admin.Status != model.AdminUserStatusActive {
		return nil, NewBizError(http.StatusForbidden, "管理员账号已禁用")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		return nil, NewBizError(http.StatusUnauthorized, "管理员账号或密码错误")
	}

	now := time.Now()
	admin.LastLoginAt = &now
	if err := s.adminRepo.WithDB(s.db.WithContext(ctx)).Update(admin); err != nil {
		return nil, err
	}

	token, expiresAt, err := s.jwtManager.GenerateToken(admin.ID, "admin")
	if err != nil {
		return nil, err
	}

	return &AdminLoginResult{
		AccessToken: token,
		ExpiresAt:   expiresAt,
		Role:        "admin",
		Admin: &AdminBasicInfo{
			ID:          admin.ID,
			Username:    admin.Username,
			DisplayName: admin.DisplayName,
			Status:      admin.Status,
		},
	}, nil
}

func (s *AdminService) ListEmployees(ctx context.Context, keyword, status string, page, pageSize int) (*AdminEmployeeListResult, error) {
	page, pageSize, offset := normalizePagination(page, pageSize)
	employees, total, err := s.employeeRepo.WithDB(s.db.WithContext(ctx)).List(strings.TrimSpace(keyword), strings.TrimSpace(status), offset, pageSize)
	if err != nil {
		return nil, err
	}

	employeeIDs := make([]uint64, 0, len(employees))
	for _, item := range employees {
		employeeIDs = append(employeeIDs, item.ID)
	}
	accountCountMap, err := s.accountRepo.WithDB(s.db.WithContext(ctx)).CountByEmployeeIDs(employeeIDs)
	if err != nil {
		return nil, err
	}

	items := make([]AdminEmployeeItem, 0, len(employees))
	for _, employee := range employees {
		items = append(items, AdminEmployeeItem{
			ID:                 employee.ID,
			RealName:           employee.RealName,
			Mobile:             employee.Mobile,
			EmployeeCode:       employee.EmployeeCode,
			Status:             employee.Status,
			Remark:             employee.Remark,
			WechatAccountCount: accountCountMap[employee.ID],
		})
	}

	return &AdminEmployeeListResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Message:  "员工列表获取成功",
	}, nil
}

func (s *AdminService) CreateEmployee(ctx context.Context, req AdminEmployeeUpsertRequest) (*AdminEmployeeResult, error) {
	employee := &model.Employee{
		RealName:     strings.TrimSpace(req.RealName),
		Mobile:       strings.TrimSpace(req.Mobile),
		EmployeeCode: strings.TrimSpace(req.EmployeeCode),
		Status:       normalizeEmployeeStatus(req.Status),
		Remark:       strings.TrimSpace(req.Remark),
	}
	if err := HandleDBError(s.employeeRepo.WithDB(s.db.WithContext(ctx)).Create(employee), "员工创建失败，请检查员工编号或手机号是否重复"); err != nil {
		return nil, err
	}
	return &AdminEmployeeResult{Employee: employee, Message: "员工创建成功"}, nil
}

func (s *AdminService) UpdateEmployee(ctx context.Context, employeeID uint64, req AdminEmployeeUpsertRequest) (*AdminEmployeeResult, error) {
	employee, err := s.employeeRepo.WithDB(s.db.WithContext(ctx)).GetByID(employeeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "员工不存在")
		}
		return nil, err
	}

	employee.RealName = strings.TrimSpace(req.RealName)
	employee.Mobile = strings.TrimSpace(req.Mobile)
	employee.EmployeeCode = strings.TrimSpace(req.EmployeeCode)
	employee.Status = normalizeEmployeeStatus(req.Status)
	employee.Remark = strings.TrimSpace(req.Remark)

	if err := HandleDBError(s.employeeRepo.WithDB(s.db.WithContext(ctx)).Update(employee), "员工更新失败，请检查员工编号或手机号是否重复"); err != nil {
		return nil, err
	}
	return &AdminEmployeeResult{Employee: employee, Message: "员工更新成功"}, nil
}

func (s *AdminService) ListBindRequests(ctx context.Context, status string, page, pageSize int) (*AdminBindRequestListResult, error) {
	page, pageSize, offset := normalizePagination(page, pageSize)
	items, total, err := s.bindRequestRepo.WithDB(s.db.WithContext(ctx)).List(strings.TrimSpace(status), offset, pageSize)
	if err != nil {
		return nil, err
	}
	return &AdminBindRequestListResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Message:  "绑定申请列表获取成功",
	}, nil
}

func (s *AdminService) ApproveBindRequest(ctx context.Context, adminID, requestID uint64, req ApproveBindRequestRequest) (*model.EmployeeBindRequest, error) {
	var bindRequest *model.EmployeeBindRequest

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		requestRepo := s.bindRequestRepo.WithDB(tx)
		employeeRepo := s.employeeRepo.WithDB(tx)
		accountRepo := s.accountRepo.WithDB(tx)

		var err error
		bindRequest, err = requestRepo.GetByID(requestID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return NewBizError(http.StatusNotFound, "绑定申请不存在")
			}
			return err
		}
		if bindRequest.Status == model.EmployeeBindRequestStatusApproved {
			return nil
		}
		if bindRequest.Status == model.EmployeeBindRequestStatusRejected {
			return NewBizError(http.StatusBadRequest, "已驳回的申请不能直接审核通过")
		}

		var employee *model.Employee
		if req.EmployeeID > 0 {
			employee, err = employeeRepo.GetByID(req.EmployeeID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return NewBizError(http.StatusNotFound, "要绑定的员工不存在")
				}
				return err
			}
		} else {
			employee = &model.Employee{
				RealName:     firstNonEmpty(strings.TrimSpace(req.RealName), bindRequest.RealName),
				Mobile:       firstNonEmpty(strings.TrimSpace(req.Mobile), bindRequest.Mobile),
				EmployeeCode: firstNonEmpty(strings.TrimSpace(req.EmployeeCode), bindRequest.EmployeeCode),
				Status:       model.EmployeeStatusActive,
				Remark:       strings.TrimSpace(req.Remark),
			}
			if err := HandleDBError(employeeRepo.Create(employee), "审核通过失败，员工编号或手机号重复"); err != nil {
				return err
			}
		}

		existingAccount, err := accountRepo.GetByPlatformOpenID(bindRequest.Platform, bindRequest.OpenID)
		if err == nil {
			if existingAccount.EmployeeID != employee.ID {
				return NewBizError(http.StatusConflict, "该微信身份已绑定到其他员工")
			}
			existingAccount.Nickname = firstNonEmpty(bindRequest.Nickname, existingAccount.Nickname)
			existingAccount.AvatarURL = firstNonEmpty(bindRequest.AvatarURL, existingAccount.AvatarURL)
			existingAccount.UnionID = firstNonEmpty(bindRequest.UnionID, existingAccount.UnionID)
			existingAccount.Status = model.EmployeeWechatAccountStatusActive
			if err := accountRepo.Update(existingAccount); err != nil {
				return err
			}
		} else {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			accounts, err := accountRepo.ListByEmployeeID(employee.ID)
			if err != nil {
				return err
			}
			account := &model.EmployeeWechatAccount{
				EmployeeID: employee.ID,
				Platform:   bindRequest.Platform,
				OpenID:     bindRequest.OpenID,
				UnionID:    bindRequest.UnionID,
				Nickname:   bindRequest.Nickname,
				AvatarURL:  bindRequest.AvatarURL,
				IsPrimary:  len(accounts) == 0,
				Status:     model.EmployeeWechatAccountStatusActive,
			}
			if err := HandleDBError(accountRepo.Create(account), "该微信身份已被其他员工绑定"); err != nil {
				return err
			}
		}

		now := time.Now()
		bindRequest.Status = model.EmployeeBindRequestStatusApproved
		bindRequest.EmployeeID = &employee.ID
		bindRequest.ReviewedBy = &adminID
		bindRequest.ReviewedAt = &now
		bindRequest.RejectReason = ""
		return requestRepo.Update(bindRequest)
	})
	if err != nil {
		return nil, err
	}

	return bindRequest, nil
}

func (s *AdminService) RejectBindRequest(ctx context.Context, adminID, requestID uint64, reason string) (*model.EmployeeBindRequest, error) {
	request, err := s.bindRequestRepo.WithDB(s.db.WithContext(ctx)).GetByID(requestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "绑定申请不存在")
		}
		return nil, err
	}
	if request.Status == model.EmployeeBindRequestStatusApproved {
		return nil, NewBizError(http.StatusBadRequest, "已审核通过的申请不能驳回")
	}

	now := time.Now()
	request.Status = model.EmployeeBindRequestStatusRejected
	request.ReviewedBy = &adminID
	request.ReviewedAt = &now
	request.RejectReason = strings.TrimSpace(reason)
	if err := s.bindRequestRepo.WithDB(s.db.WithContext(ctx)).Update(request); err != nil {
		return nil, err
	}
	return request, nil
}

func (s *AdminService) ListDoctors(ctx context.Context, keyword, status string, page, pageSize int) (*AdminDoctorListResult, error) {
	page, pageSize, offset := normalizePagination(page, pageSize)
	items, total, err := s.doctorRepo.WithDB(s.db.WithContext(ctx)).List(strings.TrimSpace(keyword), strings.TrimSpace(status), offset, pageSize)
	if err != nil {
		return nil, err
	}
	return &AdminDoctorListResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Message:  "医生列表获取成功",
	}, nil
}

func (s *AdminService) CreateDoctor(ctx context.Context, req AdminDoctorUpsertRequest) (*AdminDoctorResult, error) {
	if strings.TrimSpace(req.Password) == "" {
		return nil, NewBizError(http.StatusBadRequest, "新增医生时必须设置登录密码")
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	doctor := &model.Doctor{
		Name:         strings.TrimSpace(req.Name),
		Mobile:       strings.TrimSpace(req.Mobile),
		Title:        strings.TrimSpace(req.Title),
		Department:   strings.TrimSpace(req.Department),
		Introduction: strings.TrimSpace(req.Introduction),
		EmployeeNo:   strings.TrimSpace(req.EmployeeNo),
		PasswordHash: string(passwordHash),
		Status:       normalizeDoctorStatus(req.Status),
	}
	if err := HandleDBError(s.doctorRepo.WithDB(s.db.WithContext(ctx)).Create(doctor), "医生创建失败，请检查工号或手机号是否重复"); err != nil {
		return nil, err
	}
	return &AdminDoctorResult{Doctor: doctor, Message: "医生创建成功"}, nil
}

func (s *AdminService) UpdateDoctor(ctx context.Context, doctorID uint64, req AdminDoctorUpsertRequest) (*AdminDoctorResult, error) {
	doctor, err := s.doctorRepo.WithDB(s.db.WithContext(ctx)).GetByID(doctorID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "医生不存在")
		}
		return nil, err
	}

	doctor.Name = strings.TrimSpace(req.Name)
	doctor.Mobile = strings.TrimSpace(req.Mobile)
	doctor.Title = strings.TrimSpace(req.Title)
	doctor.Department = strings.TrimSpace(req.Department)
	doctor.Introduction = strings.TrimSpace(req.Introduction)
	doctor.EmployeeNo = strings.TrimSpace(req.EmployeeNo)
	doctor.Status = normalizeDoctorStatus(req.Status)
	if strings.TrimSpace(req.Password) != "" {
		passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		doctor.PasswordHash = string(passwordHash)
	}
	if err := HandleDBError(s.doctorRepo.WithDB(s.db.WithContext(ctx)).Update(doctor), "医生更新失败，请检查工号或手机号是否重复"); err != nil {
		return nil, err
	}
	return &AdminDoctorResult{Doctor: doctor, Message: "医生更新成功"}, nil
}

func (s *AdminService) ListDoctorEmployeeRelations(ctx context.Context, doctorID, employeeID uint64, status string) (*DoctorEmployeeRelationListResult, error) {
	items, err := s.relationRepo.WithDB(s.db.WithContext(ctx)).List(doctorID, employeeID, strings.TrimSpace(status))
	if err != nil {
		return nil, err
	}
	return &DoctorEmployeeRelationListResult{
		Items:   items,
		Message: "医生员工关系获取成功",
	}, nil
}

func (s *AdminService) CreateDoctorEmployeeRelation(ctx context.Context, req DoctorEmployeeRelationCreateRequest) (*DoctorEmployeeRelationResult, error) {
	if _, err := s.doctorRepo.WithDB(s.db.WithContext(ctx)).GetByID(req.DoctorID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "医生不存在")
		}
		return nil, err
	}
	if _, err := s.employeeRepo.WithDB(s.db.WithContext(ctx)).GetByID(req.EmployeeID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "员工不存在")
		}
		return nil, err
	}

	relation := &model.DoctorEmployeeRelation{
		DoctorID:   req.DoctorID,
		EmployeeID: req.EmployeeID,
		Status:     normalizeRelationStatus(req.Status),
	}
	if err := HandleDBError(s.relationRepo.WithDB(s.db.WithContext(ctx)).Create(relation), "医生与员工关系已存在"); err != nil {
		return nil, err
	}
	detail, err := s.relationRepo.WithDB(s.db.WithContext(ctx)).GetByID(relation.ID)
	if err == nil {
		relation = detail
	}
	return &DoctorEmployeeRelationResult{Relation: relation, Message: "医生员工关系创建成功"}, nil
}

func (s *AdminService) DeleteDoctorEmployeeRelation(ctx context.Context, relationID uint64) error {
	relation, err := s.relationRepo.WithDB(s.db.WithContext(ctx)).GetByID(relationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return NewBizError(http.StatusNotFound, "医生员工关系不存在")
		}
		return err
	}
	return s.relationRepo.WithDB(s.db.WithContext(ctx)).DeleteByID(relation.ID)
}

func (s *AdminService) ListConsultSessions(ctx context.Context, query SessionListQuery) (*SessionListResult, error) {
	return s.consultService.ListConsultSessionsForAdmin(ctx, query)
}

func (s *AdminService) GetConsultSession(ctx context.Context, sessionID uint64) (*SessionDetailResult, error) {
	return s.consultService.GetConsultSessionForAdmin(ctx, sessionID)
}

func normalizeEmployeeStatus(status string) string {
	if strings.TrimSpace(status) == model.EmployeeStatusDisabled {
		return model.EmployeeStatusDisabled
	}
	return model.EmployeeStatusActive
}

func normalizeDoctorStatus(status string) string {
	if strings.TrimSpace(status) == model.DoctorStatusDisabled {
		return model.DoctorStatusDisabled
	}
	return model.DoctorStatusEnabled
}

func normalizeRelationStatus(status string) string {
	if strings.TrimSpace(status) == model.DoctorEmployeeRelationStatusDisabled {
		return model.DoctorEmployeeRelationStatusDisabled
	}
	return model.DoctorEmployeeRelationStatusActive
}
