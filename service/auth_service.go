package service

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"video-consult-mvp/model"
	jwtpkg "video-consult-mvp/pkg/jwt"
	"video-consult-mvp/pkg/wechat"
	"video-consult-mvp/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserLoginRequest struct {
	Mobile   string `json:"mobile" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type DoctorLoginRequest struct {
	EmployeeNo string `json:"employee_no" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

type WXLoginRequest struct {
	Code      string `json:"code" binding:"required"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
}

type LoginResult struct {
	AccessToken string        `json:"access_token"`
	ExpiresAt   int64         `json:"expires_at"`
	Role        string        `json:"role"`
	User        *model.User   `json:"user,omitempty"`
	Doctor      *model.Doctor `json:"doctor,omitempty"`
}

type AuthService struct {
	userRepo          *repository.UserRepository
	doctorRepo        *repository.DoctorRepository
	jwtManager        *jwtpkg.Manager
	miniProgramClient *wechat.MiniProgramClient
}

func NewAuthService(
	userRepo *repository.UserRepository,
	doctorRepo *repository.DoctorRepository,
	jwtManager *jwtpkg.Manager,
	miniProgramClient *wechat.MiniProgramClient,
) *AuthService {
	return &AuthService{
		userRepo:          userRepo,
		doctorRepo:        doctorRepo,
		jwtManager:        jwtManager,
		miniProgramClient: miniProgramClient,
	}
}

func (s *AuthService) UserLogin(_ context.Context, req UserLoginRequest) (*LoginResult, error) {
	user, err := s.userRepo.GetByMobile(req.Mobile)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusUnauthorized, "手机号或密码错误")
		}
		return nil, err
	}

	if user.Status != model.UserStatusEnabled {
		return nil, NewBizError(http.StatusForbidden, "账号已被禁用")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, NewBizError(http.StatusUnauthorized, "手机号或密码错误")
	}

	now := time.Now()
	user.LastLoginAt = &now
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	token, expiresAt, err := s.jwtManager.GenerateToken(user.ID, "user")
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken: token,
		ExpiresAt:   expiresAt,
		Role:        "user",
		User:        user,
	}, nil
}

func (s *AuthService) DoctorLogin(_ context.Context, req DoctorLoginRequest) (*LoginResult, error) {
	doctor, err := s.doctorRepo.GetByEmployeeNo(req.EmployeeNo)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, NewBizError(http.StatusUnauthorized, "工号或密码错误")
		}
		return nil, err
	}

	if doctor.Status != model.DoctorStatusEnabled {
		return nil, NewBizError(http.StatusForbidden, "账号已被禁用")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(doctor.PasswordHash), []byte(req.Password)); err != nil {
		return nil, NewBizError(http.StatusUnauthorized, "工号或密码错误")
	}

	now := time.Now()
	doctor.LastLoginAt = &now
	if err := s.doctorRepo.Update(doctor); err != nil {
		return nil, err
	}

	token, expiresAt, err := s.jwtManager.GenerateToken(doctor.ID, "doctor")
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken: token,
		ExpiresAt:   expiresAt,
		Role:        "doctor",
		Doctor:      doctor,
	}, nil
}

func (s *AuthService) WXLogin(ctx context.Context, req WXLoginRequest) (*LoginResult, error) {
	if s.miniProgramClient == nil {
		return nil, NewBizError(http.StatusInternalServerError, "微信小程序登录能力未配置")
	}

	wxResult, err := s.miniProgramClient.Code2Session(ctx, req.Code)
	if err != nil {
		return nil, NewBizError(http.StatusBadRequest, "微信登录失败，请重新进入小程序后重试")
	}
	if wxResult.OpenID == "" {
		return nil, NewBizError(http.StatusBadRequest, "微信登录失败，未获取到用户标识")
	}

	user, err := s.userRepo.GetByOpenID(wxResult.OpenID)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		// 小程序顾客首次打开分享入口时自动创建基础用户，避免再走手机号密码登录。
		user = &model.User{
			UnionID:      strings.TrimSpace(wxResult.UnionID),
			OpenID:       wxResult.OpenID,
			Mobile:       buildWXPlaceholderMobile(wxResult.OpenID),
			Nickname:     normalizeWXNickname(req.Nickname),
			AvatarURL:    strings.TrimSpace(req.AvatarURL),
			PasswordHash: "",
			Status:       model.UserStatusEnabled,
		}

		if err := s.userRepo.Create(user); err != nil {
			handledErr := HandleDBError(err, "微信用户创建失败，请稍后重试")
			// 并发登录时可能已有同一个 openid 被创建，这里回查一次，尽量把登录做成幂等。
			var queryErr error
			user, queryErr = s.userRepo.GetByOpenID(wxResult.OpenID)
			if queryErr != nil {
				return nil, handledErr
			}
		}
	}

	if user.Status != model.UserStatusEnabled {
		return nil, NewBizError(http.StatusForbidden, "账号已被禁用")
	}

	now := time.Now()
	user.UnionID = mergeString(user.UnionID, wxResult.UnionID)
	user.Nickname = mergeString(user.Nickname, normalizeWXNickname(req.Nickname))
	user.AvatarURL = mergeString(user.AvatarURL, strings.TrimSpace(req.AvatarURL))
	user.LastLoginAt = &now
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	token, expiresAt, err := s.jwtManager.GenerateToken(user.ID, "user")
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken: token,
		ExpiresAt:   expiresAt,
		Role:        "user",
		User:        user,
	}, nil
}

func buildWXPlaceholderMobile(openID string) string {
	// users.mobile 当前仍是唯一非空字段，这里使用稳定占位值兼容现有表结构。
	sum := sha1.Sum([]byte(strings.TrimSpace(openID)))
	return "wxu" + hex.EncodeToString(sum[:])[:16]
}

func normalizeWXNickname(nickname string) string {
	nickname = strings.TrimSpace(nickname)
	if nickname == "" {
		return "微信用户"
	}
	return nickname
}

func mergeString(current, incoming string) string {
	incoming = strings.TrimSpace(incoming)
	if incoming == "" {
		return current
	}
	return incoming
}
