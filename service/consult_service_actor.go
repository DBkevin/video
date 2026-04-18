package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"video-consult-mvp/model"

	"gorm.io/gorm"
)

type EmployeeCreateConsultSessionRequest struct {
	DoctorID       uint64 `json:"doctor_id" binding:"required"`
	ExpireMinutes  int64  `json:"expire_minutes"`
	CustomerName   string `json:"customer_name"`
	CustomerMobile string `json:"customer_mobile"`
	CustomerRemark string `json:"customer_remark"`
}

type SessionListQuery struct {
	Status     string
	SourceType string
	DoctorID   uint64
	EmployeeID uint64
	Page       int
	PageSize   int
}

type SessionListItem struct {
	Session          *model.ConsultSession `json:"session"`
	Doctor           *DoctorBasicInfo      `json:"doctor,omitempty"`
	Customer         *CustomerBasicInfo    `json:"customer,omitempty"`
	OperatorEmployee *EmployeeBasicInfo    `json:"operator_employee,omitempty"`
	RecordingTask    *RecordingTaskInfo    `json:"recording_task,omitempty"`
}

type SessionListResult struct {
	Items    []SessionListItem `json:"items"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"page_size"`
	Message  string            `json:"-"`
}

type SessionLogInfo struct {
	ID        uint64    `json:"id"`
	ActorType string    `json:"actor_type"`
	ActorID   uint64    `json:"actor_id"`
	Action    string    `json:"action"`
	Payload   string    `json:"payload"`
	CreatedAt time.Time `json:"created_at"`
}

type SessionDetailResult struct {
	Session          *model.ConsultSession `json:"session"`
	Doctor           *DoctorBasicInfo      `json:"doctor,omitempty"`
	Customer         *CustomerBasicInfo    `json:"customer,omitempty"`
	OperatorEmployee *EmployeeBasicInfo    `json:"operator_employee,omitempty"`
	RecordingTask    *RecordingTaskInfo    `json:"recording_task,omitempty"`
	Logs             []SessionLogInfo      `json:"logs,omitempty"`
	Message          string                `json:"-"`
}

func (s *ConsultService) CreateConsultSessionByEmployee(ctx context.Context, employeeID uint64, req EmployeeCreateConsultSessionRequest) (*ShareConsultSessionResult, error) {
	employee, err := s.employeeRepo.GetByID(employeeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "员工不存在")
		}
		return nil, err
	}
	if employee.Status != model.EmployeeStatusActive {
		return nil, NewBizError(http.StatusForbidden, "员工状态不可用")
	}

	doctor, err := s.doctorRepo.GetByID(req.DoctorID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "医生不存在")
		}
		return nil, err
	}
	if doctor.Status != model.DoctorStatusEnabled {
		return nil, NewBizError(http.StatusForbidden, "医生状态不可用")
	}

	var (
		session *model.ConsultSession
		token   string
	)

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		roomID, err := s.generateUniqueRoomID(ctx)
		if err != nil {
			return err
		}

		shareToken, err := generateShareToken()
		if err != nil {
			return err
		}
		token = shareToken

		session = &model.ConsultSession{
			SessionNo:          generateSessionNo(),
			DoctorID:           doctor.ID,
			OperatorEmployeeID: &employeeID,
			RoomID:             roomID,
			ShareToken:         &shareToken,
			ShareURLPath:       buildShareURLPath(s.cfg.EntryPagePath, shareToken),
			SourceType:         model.ConsultSessionSourceEmployeeInitiated,
			CustomerName:       strings.TrimSpace(req.CustomerName),
			CustomerMobile:     strings.TrimSpace(req.CustomerMobile),
			CustomerRemark:     strings.TrimSpace(req.CustomerRemark),
			Status:             model.ConsultSessionStatusShared,
			ExpiredAt:          time.Now().Add(time.Duration(s.normalizeExpireMinutes(req.ExpireMinutes)) * time.Minute),
		}

		if err := HandleDBError(s.sessionRepo.WithDB(tx).Create(session), "员工发起会话失败，请稍后重试"); err != nil {
			return err
		}

		s.appendSessionLogTx(tx, session.ID, model.SessionLogActorEmployee, employeeID, "employee_create_session", map[string]any{
			"doctor_id":       req.DoctorID,
			"customer_name":   session.CustomerName,
			"customer_mobile": session.CustomerMobile,
			"customer_remark": session.CustomerRemark,
			"source_type":     session.SourceType,
		})

		return nil
	})
	if err != nil {
		return nil, err
	}

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(session.ID)
	if err == nil {
		session = detail
	}

	return &ShareConsultSessionResult{
		Session:      session,
		ShareToken:   token,
		ShareURLPath: session.ShareURLPath,
		Message:      "员工发起会话成功",
	}, nil
}

func (s *ConsultService) ListConsultSessionsByEmployee(ctx context.Context, employeeID uint64, query SessionListQuery) (*SessionListResult, error) {
	page, pageSize, offset := normalizePagination(query.Page, query.PageSize)
	sessions, total, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).List(func(db *gorm.DB) *gorm.DB {
		db = db.Where("operator_employee_id = ?", employeeID)
		if query.Status != "" {
			db = db.Where("status = ?", query.Status)
		}
		if query.SourceType != "" {
			db = db.Where("source_type = ?", query.SourceType)
		}
		if query.DoctorID > 0 {
			db = db.Where("doctor_id = ?", query.DoctorID)
		}
		return db
	}, offset, pageSize)
	if err != nil {
		return nil, err
	}

	items, err := s.buildSessionListItems(ctx, sessions)
	if err != nil {
		return nil, err
	}

	return &SessionListResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Message:  "员工会话列表获取成功",
	}, nil
}

func (s *ConsultService) GetConsultSessionForEmployee(ctx context.Context, employeeID, sessionID uint64) (*SessionDetailResult, error) {
	session, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "会话不存在")
		}
		return nil, err
	}
	if session.OperatorEmployeeID == nil || *session.OperatorEmployeeID != employeeID {
		return nil, NewBizError(http.StatusForbidden, "当前员工无权查看该会话")
	}
	return s.buildSessionDetail(ctx, session, "会话详情获取成功")
}

func (s *ConsultService) ListConsultSessionsForAdmin(ctx context.Context, query SessionListQuery) (*SessionListResult, error) {
	page, pageSize, offset := normalizePagination(query.Page, query.PageSize)
	sessions, total, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).List(func(db *gorm.DB) *gorm.DB {
		if query.Status != "" {
			db = db.Where("status = ?", query.Status)
		}
		if query.SourceType != "" {
			db = db.Where("source_type = ?", query.SourceType)
		}
		if query.DoctorID > 0 {
			db = db.Where("doctor_id = ?", query.DoctorID)
		}
		if query.EmployeeID > 0 {
			db = db.Where("operator_employee_id = ?", query.EmployeeID)
		}
		return db
	}, offset, pageSize)
	if err != nil {
		return nil, err
	}

	items, err := s.buildSessionListItems(ctx, sessions)
	if err != nil {
		return nil, err
	}

	return &SessionListResult{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Message:  "后台会话列表获取成功",
	}, nil
}

func (s *ConsultService) GetConsultSessionForAdmin(ctx context.Context, sessionID uint64) (*SessionDetailResult, error) {
	session, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "会话不存在")
		}
		return nil, err
	}
	return s.buildSessionDetail(ctx, session, "后台会话详情获取成功")
}

func (s *ConsultService) buildSessionDetail(ctx context.Context, session *model.ConsultSession, message string) (*SessionDetailResult, error) {
	recordingInfo, err := s.safeGetRecordingInfo(ctx, session.ID)
	if err != nil {
		return nil, err
	}

	logs := make([]SessionLogInfo, 0)
	if s.sessionLogRepo != nil {
		sessionLogs, err := s.sessionLogRepo.WithDB(s.db.WithContext(ctx)).ListBySessionID(session.ID)
		if err != nil {
			return nil, err
		}
		for _, item := range sessionLogs {
			logs = append(logs, SessionLogInfo{
				ID:        item.ID,
				ActorType: item.ActorType,
				ActorID:   item.ActorID,
				Action:    item.Action,
				Payload:   item.Payload,
				CreatedAt: item.CreatedAt,
			})
		}
	}

	return &SessionDetailResult{
		Session:          session,
		Doctor:           buildDoctorBasicInfo(&session.Doctor),
		Customer:         buildCustomerBasicInfo(session.CustomerID, &session.Customer),
		OperatorEmployee: buildEmployeeBasicInfo(session.OperatorEmployeeID, &session.OperatorEmployee),
		RecordingTask:    recordingInfo,
		Logs:             logs,
		Message:          message,
	}, nil
}

func (s *ConsultService) buildSessionListItems(ctx context.Context, sessions []model.ConsultSession) ([]SessionListItem, error) {
	items := make([]SessionListItem, 0, len(sessions))
	for _, session := range sessions {
		current := session
		recordingInfo, err := s.safeGetRecordingInfo(ctx, current.ID)
		if err != nil {
			return nil, err
		}
		items = append(items, SessionListItem{
			Session:          &current,
			Doctor:           buildDoctorBasicInfo(&current.Doctor),
			Customer:         buildCustomerBasicInfo(current.CustomerID, &current.Customer),
			OperatorEmployee: buildEmployeeBasicInfo(current.OperatorEmployeeID, &current.OperatorEmployee),
			RecordingTask:    recordingInfo,
		})
	}
	return items, nil
}

func (s *ConsultService) appendSessionLog(ctx context.Context, sessionID uint64, actorType string, actorID uint64, action string, payload any) {
	if s.sessionLogRepo == nil || sessionID == 0 {
		return
	}
	s.appendSessionLogTx(s.db.WithContext(ctx), sessionID, actorType, actorID, action, payload)
}

func (s *ConsultService) appendSessionLogTx(tx *gorm.DB, sessionID uint64, actorType string, actorID uint64, action string, payload any) {
	if s.sessionLogRepo == nil || tx == nil || sessionID == 0 {
		return
	}

	payloadText := ""
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err == nil {
			payloadText = string(raw)
		}
	}

	_ = s.sessionLogRepo.WithDB(tx).Create(&model.SessionLog{
		SessionID: sessionID,
		ActorType: actorType,
		ActorID:   actorID,
		Action:    action,
		Payload:   payloadText,
	})
}

func normalizePagination(page, pageSize int) (int, int, int) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return page, pageSize, (page - 1) * pageSize
}
