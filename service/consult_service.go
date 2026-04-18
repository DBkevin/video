package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"math/big"
	"net/http"
	"strings"
	"time"

	"video-consult-mvp/config"
	"video-consult-mvp/model"
	"video-consult-mvp/repository"

	"gorm.io/gorm"
)

type CreateConsultSessionRequest struct {
	ExpireMinutes int64 `json:"expire_minutes"`
}

type ShareConsultSessionRequest struct {
	ExpireMinutes int64 `json:"expire_minutes"`
}

type JoinConsultSessionRequest struct {
	ShareToken string `json:"share_token" binding:"required"`
}

type FinishConsultSessionRequest struct {
	Summary         string `json:"summary"`
	Diagnosis       string `json:"diagnosis"`
	Advice          string `json:"advice"`
	DurationSeconds int64  `json:"duration_seconds"`
}

type DoctorBasicInfo struct {
	ID           uint64 `json:"id"`
	Name         string `json:"name"`
	Title        string `json:"title"`
	Department   string `json:"department"`
	Introduction string `json:"introduction"`
}

type CustomerBasicInfo struct {
	ID        uint64 `json:"id"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
	Mobile    string `json:"mobile"`
}

type EmployeeBasicInfo struct {
	ID           uint64 `json:"id"`
	RealName     string `json:"real_name"`
	Mobile       string `json:"mobile"`
	EmployeeCode string `json:"employee_code"`
	Status       string `json:"status"`
}

type SessionRTCInfo struct {
	RoomID          int32  `json:"room_id"`
	RTCUserID       string `json:"rtc_user_id"`
	UserSig         string `json:"user_sig"`
	SDKAppID        uint32 `json:"sdk_app_id"`
	UserSigExpireAt int64  `json:"user_sig_expire_at"`
}

type CreateConsultSessionResult struct {
	Session *model.ConsultSession `json:"session"`
	Message string                `json:"-"`
}

type ShareConsultSessionResult struct {
	Session      *model.ConsultSession `json:"session"`
	ShareToken   string                `json:"share_token"`
	ShareURLPath string                `json:"share_url_path"`
	Message      string                `json:"-"`
}

type GetConsultEntryResult struct {
	SessionID uint64           `json:"session_id"`
	SessionNo string           `json:"session_no"`
	Status    string           `json:"status"`
	ExpiredAt time.Time        `json:"expired_at"`
	CanJoin   bool             `json:"can_join"`
	Doctor    *DoctorBasicInfo `json:"doctor,omitempty"`
	Message   string           `json:"-"`
}

type GetConsultSessionResult struct {
	Session          *model.ConsultSession `json:"session"`
	Customer         *CustomerBasicInfo    `json:"customer,omitempty"`
	OperatorEmployee *EmployeeBasicInfo    `json:"operator_employee,omitempty"`
	CanStart         bool                  `json:"can_start"`
	RecordingTask    *RecordingTaskInfo    `json:"recording_task,omitempty"`
	Message          string                `json:"-"`
}

type JoinConsultSessionResult struct {
	Session     *model.ConsultSession `json:"session"`
	RTC         *SessionRTCInfo       `json:"rtc"`
	CurrentRole string                `json:"current_role"`
	Doctor      *DoctorBasicInfo      `json:"doctor,omitempty"`
	Message     string                `json:"-"`
}

type StartConsultSessionResult struct {
	Session     *model.ConsultSession `json:"session"`
	RTC         *SessionRTCInfo       `json:"rtc"`
	CurrentRole string                `json:"current_role"`
	Customer    *CustomerBasicInfo    `json:"customer,omitempty"`
	Message     string                `json:"-"`
}

type FinishConsultSessionResult struct {
	Session *model.ConsultSession `json:"session"`
	Record  *model.ConsultRecord  `json:"record,omitempty"`
	Message string                `json:"-"`
}

type CancelConsultSessionResult struct {
	Session *model.ConsultSession `json:"session"`
	Message string                `json:"-"`
}

type LeaveConsultSessionResult struct {
	Session   *model.ConsultSession `json:"session"`
	CanRejoin bool                  `json:"can_rejoin"`
	Message   string                `json:"-"`
}

type ConsultService struct {
	db               *gorm.DB
	cfg              config.ConsultConfig
	userRepo         *repository.UserRepository
	doctorRepo       *repository.DoctorRepository
	employeeRepo     *repository.EmployeeRepository
	sessionRepo      *repository.ConsultSessionRepository
	recordRepo       *repository.ConsultRecordRepository
	sessionLogRepo   *repository.SessionLogRepository
	rtcService       *RTCService
	recordingService *TRTCRecordingService
}

func NewConsultService(
	db *gorm.DB,
	cfg config.ConsultConfig,
	userRepo *repository.UserRepository,
	doctorRepo *repository.DoctorRepository,
	employeeRepo *repository.EmployeeRepository,
	sessionRepo *repository.ConsultSessionRepository,
	recordRepo *repository.ConsultRecordRepository,
	sessionLogRepo *repository.SessionLogRepository,
	rtcService *RTCService,
	recordingService *TRTCRecordingService,
) *ConsultService {
	return &ConsultService{
		db:               db,
		cfg:              cfg,
		userRepo:         userRepo,
		doctorRepo:       doctorRepo,
		employeeRepo:     employeeRepo,
		sessionRepo:      sessionRepo,
		recordRepo:       recordRepo,
		sessionLogRepo:   sessionLogRepo,
		rtcService:       rtcService,
		recordingService: recordingService,
	}
}

func (s *ConsultService) CreateConsultSession(ctx context.Context, doctorID uint64, req CreateConsultSessionRequest) (*CreateConsultSessionResult, error) {
	doctor, err := s.doctorRepo.GetByID(doctorID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "医生不存在")
		}
		return nil, err
	}
	if doctor.Status != model.DoctorStatusEnabled {
		return nil, NewBizError(http.StatusForbidden, "医生状态不可用")
	}

	expireMinutes := s.normalizeExpireMinutes(req.ExpireMinutes)

	// 会话创建阶段就分配独立房间号，后续分享、加入、开始面诊都围绕同一个会话进行。
	roomID, err := s.generateUniqueRoomID(ctx)
	if err != nil {
		return nil, err
	}

	session := &model.ConsultSession{
		SessionNo:  generateSessionNo(),
		DoctorID:   doctorID,
		RoomID:     roomID,
		SourceType: model.ConsultSessionSourceDoctorInitiated,
		Status:     model.ConsultSessionStatusCreated,
		ExpiredAt:  time.Now().Add(time.Duration(expireMinutes) * time.Minute),
	}

	if err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).Create(session); err != nil {
		return nil, HandleDBError(err, "会话创建失败，请稍后重试")
	}
	s.appendSessionLog(ctx, session.ID, model.SessionLogActorDoctor, doctorID, "doctor_create_session", map[string]any{
		"source_type": session.SourceType,
	})

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(session.ID)
	if err != nil {
		detail = session
	}

	return &CreateConsultSessionResult{
		Session: detail,
		Message: "会话创建成功",
	}, nil
}

func (s *ConsultService) ShareConsultSession(ctx context.Context, sessionID, doctorID uint64, req ShareConsultSessionRequest) (*ShareConsultSessionResult, error) {
	var session *model.ConsultSession

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sessionRepo := s.sessionRepo.WithDB(tx)

		var err error
		session, err = sessionRepo.GetByIDForUpdate(sessionID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return NewBizError(http.StatusNotFound, "面诊会话不存在")
			}
			return err
		}

		if session.DoctorID != doctorID {
			return NewBizError(http.StatusForbidden, "当前医生无权分享该会话")
		}

		if err := s.touchSessionExpired(sessionRepo, session); err != nil {
			return err
		}

		switch session.Status {
		case model.ConsultSessionStatusFinished:
			return NewBizError(http.StatusBadRequest, "会话已结束，不能再次分享")
		case model.ConsultSessionStatusCancelled:
			return NewBizError(http.StatusBadRequest, "会话已取消，不能再次分享")
		case model.ConsultSessionStatusJoined, model.ConsultSessionStatusInConsult:
			return NewBizError(http.StatusBadRequest, "顾客已加入当前会话，不能重新分享")
		}

		token, err := generateShareToken()
		if err != nil {
			return err
		}

		expireMinutes := s.normalizeExpireMinutes(req.ExpireMinutes)
		// 每次分享都重新生成 token，旧 token 会因数据库中的当前 token 被覆盖而自动失效。
		session.ShareToken = &token
		session.ShareURLPath = buildShareURLPath(s.cfg.EntryPagePath, token)
		session.ExpiredAt = time.Now().Add(time.Duration(expireMinutes) * time.Minute)
		session.Status = model.ConsultSessionStatusShared

		return HandleDBError(sessionRepo.Update(session), "分享入口生成失败，请稍后重试")
	})
	if err != nil {
		return nil, err
	}

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err == nil {
		session = detail
	}
	s.appendSessionLog(ctx, session.ID, model.SessionLogActorDoctor, doctorID, "share_session", map[string]any{
		"share_url_path": session.ShareURLPath,
	})

	return &ShareConsultSessionResult{
		Session:      session,
		ShareToken:   derefString(session.ShareToken),
		ShareURLPath: session.ShareURLPath,
		Message:      "分享入口生成成功",
	}, nil
}

func (s *ConsultService) GetConsultEntryByToken(ctx context.Context, shareToken string) (*GetConsultEntryResult, error) {
	shareToken = strings.TrimSpace(shareToken)
	if shareToken == "" {
		return nil, NewBizError(http.StatusBadRequest, "缺少分享 token")
	}

	session, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByShareToken(shareToken)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusBadRequest, "分享入口无效或已失效")
		}
		return nil, err
	}

	if err := s.touchSessionExpired(s.sessionRepo.WithDB(s.db.WithContext(ctx)), session); err != nil {
		return nil, err
	}

	switch session.Status {
	case model.ConsultSessionStatusExpired:
		return nil, NewBizError(http.StatusGone, "分享入口已过期，请联系医生重新分享")
	case model.ConsultSessionStatusFinished:
		return nil, NewBizError(http.StatusBadRequest, "本次面诊已结束")
	case model.ConsultSessionStatusCancelled:
		return nil, NewBizError(http.StatusBadRequest, "本次面诊已取消")
	}

	return &GetConsultEntryResult{
		SessionID: session.ID,
		SessionNo: session.SessionNo,
		Status:    session.Status,
		ExpiredAt: session.ExpiredAt,
		CanJoin:   session.Status == model.ConsultSessionStatusShared || session.Status == model.ConsultSessionStatusJoined || session.Status == model.ConsultSessionStatusInConsult,
		Doctor:    buildDoctorBasicInfo(&session.Doctor),
		Message:   "入口信息获取成功",
	}, nil
}

func (s *ConsultService) GetConsultSession(ctx context.Context, sessionID, doctorID uint64) (*GetConsultSessionResult, error) {
	session, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "面诊会话不存在")
		}
		return nil, err
	}

	if session.DoctorID != doctorID {
		return nil, NewBizError(http.StatusForbidden, "当前医生无权查看该会话")
	}

	if err := s.touchSessionExpired(s.sessionRepo.WithDB(s.db.WithContext(ctx)), session); err != nil {
		return nil, err
	}

	recordInfo, err := s.safeGetRecordingInfo(ctx, session.ID)
	if err != nil {
		return nil, err
	}

	return &GetConsultSessionResult{
		Session:          session,
		Customer:         buildCustomerBasicInfo(session.CustomerID, &session.Customer),
		OperatorEmployee: buildEmployeeBasicInfo(session.OperatorEmployeeID, &session.OperatorEmployee),
		CanStart:         session.Status == model.ConsultSessionStatusJoined,
		RecordingTask:    recordInfo,
		Message:          "会话信息获取成功",
	}, nil
}

func (s *ConsultService) JoinConsultSession(ctx context.Context, sessionID, customerID uint64, req JoinConsultSessionRequest) (*JoinConsultSessionResult, error) {
	user, err := s.userRepo.GetByID(customerID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusNotFound, "顾客不存在")
		}
		return nil, err
	}
	if user.Status != model.UserStatusEnabled {
		return nil, NewBizError(http.StatusForbidden, "顾客状态不可用")
	}

	var (
		session *model.ConsultSession
		message = "加入成功，请等待医生开始面诊"
	)

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sessionRepo := s.sessionRepo.WithDB(tx)

		var err error
		session, err = sessionRepo.GetByIDForUpdate(sessionID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return NewBizError(http.StatusNotFound, "面诊会话不存在")
			}
			return err
		}

		if session.ShareToken == nil || derefString(session.ShareToken) != strings.TrimSpace(req.ShareToken) {
			return NewBizError(http.StatusBadRequest, "分享 token 无效，请重新打开医生分享的入口")
		}

		// 顾客加入前先判断 token 是否过期，避免失效链接继续进入候诊或通话。
		if err := s.touchSessionExpired(sessionRepo, session); err != nil {
			return err
		}

		switch session.Status {
		case model.ConsultSessionStatusCreated:
			return NewBizError(http.StatusBadRequest, "会话尚未分享，暂时不能加入")
		case model.ConsultSessionStatusExpired:
			return NewBizError(http.StatusGone, "分享入口已过期，请联系医生重新分享")
		case model.ConsultSessionStatusFinished:
			return NewBizError(http.StatusBadRequest, "本次面诊已结束，不能再加入")
		case model.ConsultSessionStatusCancelled:
			return NewBizError(http.StatusBadRequest, "本次面诊已取消，不能再加入")
		}

		if session.CustomerID != nil && *session.CustomerID != customerID {
			return NewBizError(http.StatusForbidden, "该会话已被其他顾客占用")
		}

		if session.CustomerID == nil {
			// 首次进入时绑定顾客身份，后续只允许同一顾客重复进入或断线重连。
			session.CustomerID = &customerID
		}

		switch session.Status {
		case model.ConsultSessionStatusShared:
			if session.CustomerID != nil && *session.CustomerID == customerID {
				message = "已重新进入候诊会话，请等待医生开始面诊"
			}
			session.Status = model.ConsultSessionStatusJoined
		case model.ConsultSessionStatusJoined:
			if session.StartedAt != nil {
				message = "已重新进入当前面诊，请等待医生重新接入"
			} else {
				message = "已返回当前候诊会话，可继续等待医生接入"
			}
		case model.ConsultSessionStatusInConsult:
			message = "已返回当前通话会话，可直接继续面诊"
		}

		return HandleDBError(sessionRepo.Update(session), "加入会话失败，请稍后重试")
	})
	if err != nil {
		return nil, err
	}

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err == nil {
		session = detail
	}
	s.appendSessionLog(ctx, session.ID, model.SessionLogActorCustomer, customerID, "customer_join_session", map[string]any{
		"status": session.Status,
	})

	// 顾客侧不从分享链接直接拿 userSig，而是在 join 成功后由服务端临时签发。
	rtcInfo, err := s.buildRTCInfo(ctx, session.RoomID, buildCustomerSessionRTCUserID(session.ID, customerID))
	if err != nil {
		return nil, err
	}

	return &JoinConsultSessionResult{
		Session:     session,
		RTC:         rtcInfo,
		CurrentRole: "customer",
		Doctor:      buildDoctorBasicInfo(&session.Doctor),
		Message:     message,
	}, nil
}

func (s *ConsultService) StartConsultSession(ctx context.Context, sessionID, doctorID uint64) (*StartConsultSessionResult, error) {
	var (
		session *model.ConsultSession
		message = "开始面诊成功"
	)

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sessionRepo := s.sessionRepo.WithDB(tx)

		var err error
		session, err = sessionRepo.GetByIDForUpdate(sessionID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return NewBizError(http.StatusNotFound, "面诊会话不存在")
			}
			return err
		}

		if session.DoctorID != doctorID {
			return NewBizError(http.StatusForbidden, "当前医生无权开始该会话")
		}

		if err := s.touchSessionExpired(sessionRepo, session); err != nil {
			return err
		}

		switch session.Status {
		case model.ConsultSessionStatusCreated, model.ConsultSessionStatusShared:
			return NewBizError(http.StatusBadRequest, "顾客尚未加入，不能开始面诊")
		case model.ConsultSessionStatusExpired:
			return NewBizError(http.StatusGone, "当前会话已过期，请重新创建或分享")
		case model.ConsultSessionStatusFinished:
			return NewBizError(http.StatusBadRequest, "当前会话已结束，不能重复开始")
		case model.ConsultSessionStatusCancelled:
			return NewBizError(http.StatusBadRequest, "当前会话已取消，不能开始面诊")
		case model.ConsultSessionStatusInConsult:
			message = "会话已在面诊中，已返回当前通话信息"
			return nil
		}

		now := time.Now()
		// 只有顾客已加入的会话才能真正进入面诊中状态。
		session.Status = model.ConsultSessionStatusInConsult
		if session.StartedAt == nil {
			session.StartedAt = &now
		}

		return HandleDBError(sessionRepo.Update(session), "开始面诊失败，请稍后重试")
	})
	if err != nil {
		return nil, err
	}

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err == nil {
		session = detail
	}
	s.appendSessionLog(ctx, session.ID, model.SessionLogActorDoctor, doctorID, "doctor_start_session", map[string]any{
		"status": session.Status,
	})

	// 医生开始面诊后，同样由服务端下发当前会话专属的 RTC 入房参数。
	rtcInfo, err := s.buildRTCInfo(ctx, session.RoomID, buildDoctorSessionRTCUserID(session.ID, doctorID))
	if err != nil {
		return nil, err
	}

	return &StartConsultSessionResult{
		Session:     session,
		RTC:         rtcInfo,
		CurrentRole: "doctor",
		Customer:    buildCustomerBasicInfo(session.CustomerID, &session.Customer),
		Message:     s.startRecordingAfterConsultStart(ctx, session, message),
	}, nil
}

func (s *ConsultService) FinishConsultSession(ctx context.Context, sessionID, doctorID uint64, req FinishConsultSessionRequest) (*FinishConsultSessionResult, error) {
	var (
		session         *model.ConsultSession
		record          *model.ConsultRecord
		resultMessage   = "结束面诊成功"
		recordEndedAt   time.Time
		durationSeconds int64
	)

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sessionRepo := s.sessionRepo.WithDB(tx)
		recordRepo := s.recordRepo.WithDB(tx)

		var err error
		session, err = sessionRepo.GetByIDForUpdate(sessionID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return NewBizError(http.StatusNotFound, "面诊会话不存在")
			}
			return err
		}

		if session.DoctorID != doctorID {
			return NewBizError(http.StatusForbidden, "当前医生无权结束该会话")
		}

		if err := s.touchSessionExpired(sessionRepo, session); err != nil {
			return err
		}

		switch session.Status {
		case model.ConsultSessionStatusCreated, model.ConsultSessionStatusShared, model.ConsultSessionStatusJoined:
			return NewBizError(http.StatusBadRequest, "当前会话尚未开始，不能结束面诊")
		case model.ConsultSessionStatusExpired:
			return NewBizError(http.StatusGone, "当前会话已过期，不能结束面诊")
		case model.ConsultSessionStatusCancelled:
			return NewBizError(http.StatusBadRequest, "当前会话已取消，不能结束面诊")
		case model.ConsultSessionStatusFinished:
			// finish 要求幂等，已经结束时直接返回当前会话和已存在的记录。
			resultMessage = "会话已结束，已返回当前结果"
		}

		if session.EndedAt != nil {
			recordEndedAt = *session.EndedAt
		} else {
			recordEndedAt = time.Now()
		}
		durationSeconds = s.calculateDurationSeconds(session, recordEndedAt, req.DurationSeconds)

		if session.Status != model.ConsultSessionStatusFinished {
			session.Status = model.ConsultSessionStatusFinished
			session.EndedAt = &recordEndedAt
			if err := HandleDBError(sessionRepo.Update(session), "结束面诊失败，请稍后重试"); err != nil {
				return err
			}
		}

		record, err = recordRepo.GetBySessionID(session.ID)
		if err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}

			// 只有在记录不存在时才创建，避免重复 finish 时生成多条面诊记录。
			record = &model.ConsultRecord{
				SessionID:       session.ID,
				CustomerID:      session.CustomerID,
				DoctorID:        doctorID,
				Summary:         strings.TrimSpace(req.Summary),
				Diagnosis:       strings.TrimSpace(req.Diagnosis),
				Advice:          strings.TrimSpace(req.Advice),
				DurationSeconds: durationSeconds,
				EndedAt:         recordEndedAt,
			}
			return HandleDBError(recordRepo.Create(record), "保存面诊记录失败，请稍后重试")
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err == nil {
		session = detail
	}
	s.appendSessionLog(ctx, session.ID, model.SessionLogActorDoctor, doctorID, "doctor_finish_session", map[string]any{
		"record_id": func() uint64 {
			if record == nil {
				return 0
			}
			return record.ID
		}(),
	})

	return &FinishConsultSessionResult{
		Session: session,
		Record:  record,
		Message: s.stopRecordingAfterConsultFinish(ctx, session, resultMessage),
	}, nil
}

func (s *ConsultService) CancelConsultSession(ctx context.Context, sessionID, doctorID uint64) (*CancelConsultSessionResult, error) {
	var (
		session *model.ConsultSession
		message = "会话已取消"
	)

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sessionRepo := s.sessionRepo.WithDB(tx)

		var err error
		session, err = sessionRepo.GetByIDForUpdate(sessionID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return NewBizError(http.StatusNotFound, "面诊会话不存在")
			}
			return err
		}

		if session.DoctorID != doctorID {
			return NewBizError(http.StatusForbidden, "当前医生无权取消该会话")
		}

		if err := s.touchSessionExpired(sessionRepo, session); err != nil {
			return err
		}

		switch session.Status {
		case model.ConsultSessionStatusFinished:
			return NewBizError(http.StatusBadRequest, "当前会话已结束，不能取消")
		case model.ConsultSessionStatusExpired:
			return NewBizError(http.StatusGone, "当前会话已过期，无需取消")
		case model.ConsultSessionStatusCancelled:
			message = "会话已取消，已返回当前结果"
			return nil
		}

		now := time.Now()
		session.Status = model.ConsultSessionStatusCancelled
		if session.EndedAt == nil {
			session.EndedAt = &now
		}

		return HandleDBError(sessionRepo.Update(session), "取消会话失败，请稍后重试")
	})
	if err != nil {
		return nil, err
	}

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err == nil {
		session = detail
	}
	s.appendSessionLog(ctx, session.ID, model.SessionLogActorDoctor, doctorID, "doctor_cancel_session", map[string]any{
		"status": session.Status,
	})

	return &CancelConsultSessionResult{
		Session: session,
		Message: message,
	}, nil
}

func (s *ConsultService) LeaveConsultSession(ctx context.Context, sessionID, customerID uint64) (*LeaveConsultSessionResult, error) {
	var (
		session   *model.ConsultSession
		message   = "已离开当前会话"
		canRejoin = true
	)

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		sessionRepo := s.sessionRepo.WithDB(tx)

		var err error
		session, err = sessionRepo.GetByIDForUpdate(sessionID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return NewBizError(http.StatusNotFound, "面诊会话不存在")
			}
			return err
		}

		if session.CustomerID == nil || *session.CustomerID != customerID {
			return NewBizError(http.StatusForbidden, "当前顾客无权离开该会话")
		}

		if err := s.touchSessionExpired(sessionRepo, session); err != nil {
			return err
		}

		switch session.Status {
		case model.ConsultSessionStatusCreated, model.ConsultSessionStatusShared:
			return NewBizError(http.StatusBadRequest, "当前会话尚未进入候诊，无需离开")
		case model.ConsultSessionStatusExpired:
			message = "会话已过期，请联系医生重新分享入口"
			canRejoin = false
			return nil
		case model.ConsultSessionStatusCancelled:
			message = "会话已取消，已返回当前结果"
			canRejoin = false
			return nil
		case model.ConsultSessionStatusFinished:
			message = "会话已结束，已返回当前结果"
			canRejoin = false
			return nil
		case model.ConsultSessionStatusJoined:
			// 顾客离开候诊页后，把会话恢复为 shared，医生端能看到顾客暂时离线，顾客也能用原入口重新进入。
			session.Status = model.ConsultSessionStatusShared
			message = "已离开候诊，稍后可通过原分享入口重新进入"
		case model.ConsultSessionStatusInConsult:
			// 通话中离开页面时回退到 joined，表示会话仍有效，但需要医生重新发起接入。
			session.Status = model.ConsultSessionStatusJoined
			message = "已离开当前通话，请重新进入并等待医生再次发起"
		}

		return HandleDBError(sessionRepo.Update(session), "离开会话失败，请稍后重试")
	})
	if err != nil {
		return nil, err
	}

	detail, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).GetByID(sessionID)
	if err == nil {
		session = detail
	}
	s.appendSessionLog(ctx, session.ID, model.SessionLogActorCustomer, customerID, "customer_leave_session", map[string]any{
		"status":     session.Status,
		"can_rejoin": canRejoin,
	})

	return &LeaveConsultSessionResult{
		Session:   session,
		CanRejoin: canRejoin,
		Message:   message,
	}, nil
}

func (s *ConsultService) normalizeExpireMinutes(expireMinutes int64) int64 {
	if expireMinutes > 0 {
		return expireMinutes
	}
	if s.cfg.SessionExpireMinutes > 0 {
		return s.cfg.SessionExpireMinutes
	}
	return 120
}

func (s *ConsultService) touchSessionExpired(sessionRepo *repository.ConsultSessionRepository, session *model.ConsultSession) error {
	if session == nil {
		return nil
	}

	if time.Now().Before(session.ExpiredAt) {
		return nil
	}

	switch session.Status {
	case model.ConsultSessionStatusCreated, model.ConsultSessionStatusShared, model.ConsultSessionStatusJoined:
		// 候诊前阶段一旦超过过期时间，就统一标记为 expired，避免失效 token 再次进入。
		session.Status = model.ConsultSessionStatusExpired
		return HandleDBError(sessionRepo.Update(session), "更新会话过期状态失败，请稍后重试")
	}

	return nil
}

func (s *ConsultService) generateUniqueRoomID(ctx context.Context) (int32, error) {
	const minRoomID int64 = 100000
	const maxRoomID int64 = math.MaxInt32

	for attempt := 0; attempt < 10; attempt++ {
		delta, err := rand.Int(rand.Reader, big.NewInt(maxRoomID-minRoomID+1))
		if err != nil {
			return 0, err
		}

		candidate := int32(minRoomID + delta.Int64())
		// 房间号需要处于 int32 合法范围内，并且在 consult_sessions 中保持唯一。
		exists, err := s.sessionRepo.WithDB(s.db.WithContext(ctx)).ExistsByRoomID(candidate)
		if err != nil {
			return 0, err
		}
		if !exists {
			return candidate, nil
		}
	}

	return 0, NewBizError(http.StatusInternalServerError, "生成房间号失败，请稍后重试")
}

func (s *ConsultService) buildRTCInfo(ctx context.Context, roomID int32, rtcUserID string) (*SessionRTCInfo, error) {
	result, err := s.rtcService.GenerateUserSigByIdentifier(ctx, rtcUserID, 0)
	if err != nil {
		return nil, err
	}

	return &SessionRTCInfo{
		RoomID:          roomID,
		RTCUserID:       result.UserID,
		UserSig:         result.UserSig,
		SDKAppID:        result.SDKAppID,
		UserSigExpireAt: result.ExpireAt,
	}, nil
}

func (s *ConsultService) safeGetRecordingInfo(ctx context.Context, sessionID uint64) (*RecordingTaskInfo, error) {
	if s.recordingService == nil {
		return nil, nil
	}

	return s.recordingService.GetRecordingInfo(ctx, sessionID)
}

func (s *ConsultService) startRecordingAfterConsultStart(ctx context.Context, session *model.ConsultSession, successMessage string) string {
	if s.recordingService == nil || session == nil {
		return successMessage
	}

	if _, err := s.recordingService.CreateCloudRecordingForSession(ctx, session); err != nil {
		return fmt.Sprintf("%s，但云端录制启动失败：%s", successMessage, err.Error())
	}

	return fmt.Sprintf("%s，已自动启动云端录制", successMessage)
}

func (s *ConsultService) stopRecordingAfterConsultFinish(ctx context.Context, session *model.ConsultSession, successMessage string) string {
	if s.recordingService == nil || session == nil {
		return successMessage
	}

	if _, err := s.recordingService.StopCloudRecordingForSession(ctx, session); err != nil {
		return fmt.Sprintf("%s，但录制停止请求失败：%s", successMessage, err.Error())
	}

	return fmt.Sprintf("%s，已发送录制停止请求", successMessage)
}

func (s *ConsultService) calculateDurationSeconds(session *model.ConsultSession, endedAt time.Time, requestedDuration int64) int64 {
	if requestedDuration > 0 {
		return requestedDuration
	}
	if session != nil && session.StartedAt != nil {
		duration := int64(endedAt.Sub(*session.StartedAt).Seconds())
		if duration > 0 {
			return duration
		}
	}
	return 0
}

func buildDoctorBasicInfo(doctor *model.Doctor) *DoctorBasicInfo {
	if doctor == nil || doctor.ID == 0 {
		return nil
	}

	return &DoctorBasicInfo{
		ID:           doctor.ID,
		Name:         doctor.Name,
		Title:        doctor.Title,
		Department:   doctor.Department,
		Introduction: doctor.Introduction,
	}
}

func buildCustomerBasicInfo(customerID *uint64, user *model.User) *CustomerBasicInfo {
	if customerID == nil || user == nil || user.ID == 0 {
		return nil
	}

	return &CustomerBasicInfo{
		ID:        user.ID,
		Nickname:  user.Nickname,
		AvatarURL: user.AvatarURL,
		Mobile:    user.Mobile,
	}
}

func buildEmployeeBasicInfo(employeeID *uint64, employee *model.Employee) *EmployeeBasicInfo {
	if employeeID == nil || employee == nil || employee.ID == 0 {
		return nil
	}

	return &EmployeeBasicInfo{
		ID:           employee.ID,
		RealName:     employee.RealName,
		Mobile:       employee.Mobile,
		EmployeeCode: employee.EmployeeCode,
		Status:       employee.Status,
	}
}

func buildShareURLPath(pagePath, token string) string {
	pagePath = strings.TrimSpace(pagePath)
	if pagePath == "" {
		pagePath = "/pages/customer-entry/index"
	}

	separator := "?"
	if strings.Contains(pagePath, "?") {
		separator = "&"
	}

	return fmt.Sprintf("%s%stoken=%s", pagePath, separator, token)
}

func generateSessionNo() string {
	return fmt.Sprintf("CS%s%06d", time.Now().Format("20060102150405"), time.Now().UnixNano()%1000000)
}

func generateShareToken() (string, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw), nil
}

func buildCustomerSessionRTCUserID(sessionID, customerID uint64) string {
	return fmt.Sprintf("consult_customer_%d_%d", sessionID, customerID)
}

func buildDoctorSessionRTCUserID(sessionID, doctorID uint64) string {
	return fmt.Sprintf("consult_doctor_%d_%d", sessionID, doctorID)
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
