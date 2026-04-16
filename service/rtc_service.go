package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"video-consult-mvp/config"
	"video-consult-mvp/pkg/usersig"

	"github.com/redis/go-redis/v9"
)

type GenerateUserSigRequest struct {
	ExpireSeconds int64 `json:"expire_seconds"`
}

type GenerateUserSigResult struct {
	SDKAppID      uint32 `json:"sdk_app_id"`
	UserID        string `json:"user_id"`
	UserSig       string `json:"user_sig"`
	ExpireSeconds int64  `json:"expire_seconds"`
	ExpireAt      int64  `json:"expire_at"`
}

type RTCService struct {
	cfg   config.TRTCConfig
	redis *redis.Client
}

func NewRTCService(cfg config.TRTCConfig, redisClient *redis.Client) *RTCService {
	return &RTCService{
		cfg:   cfg,
		redis: redisClient,
	}
}

func (s *RTCService) GenerateUserSig(ctx context.Context, role string, principalID uint64, req GenerateUserSigRequest) (*GenerateUserSigResult, error) {
	if s.cfg.SDKAppID == 0 || s.cfg.SecretKey == "" {
		return nil, NewBizError(http.StatusInternalServerError, "TRTC 服务端配置未完成")
	}

	expireSeconds := req.ExpireSeconds
	if expireSeconds <= 0 {
		expireSeconds = s.cfg.UserSigExpireIn
	}

	rtcUserID := buildRTCUserID(role, principalID)
	return s.GenerateUserSigByIdentifier(ctx, rtcUserID, expireSeconds)
}

func (s *RTCService) GenerateUserSigByIdentifier(ctx context.Context, rtcUserID string, expireSeconds int64) (*GenerateUserSigResult, error) {
	if s.cfg.SDKAppID == 0 || s.cfg.SecretKey == "" {
		return nil, NewBizError(http.StatusInternalServerError, "TRTC 服务端配置未完成")
	}
	if rtcUserID == "" {
		return nil, NewBizError(http.StatusBadRequest, "RTC 用户标识不能为空")
	}
	if expireSeconds <= 0 {
		expireSeconds = s.cfg.UserSigExpireIn
	}

	cacheKey := fmt.Sprintf("rtc:usersig:%s:%d", rtcUserID, expireSeconds)

	// 先查 Redis 缓存，减少高频重复签名带来的 CPU 消耗。
	if s.redis != nil {
		cached, err := s.redis.Get(ctx, cacheKey).Result()
		if err == nil {
			var result GenerateUserSigResult
			if json.Unmarshal([]byte(cached), &result) == nil {
				return &result, nil
			}
		}
	}

	userSig, err := usersig.Generate(s.cfg.SDKAppID, rtcUserID, s.cfg.SecretKey, expireSeconds)
	if err != nil {
		return nil, err
	}

	result := &GenerateUserSigResult{
		SDKAppID:      s.cfg.SDKAppID,
		UserID:        rtcUserID,
		UserSig:       userSig,
		ExpireSeconds: expireSeconds,
		ExpireAt:      time.Now().Add(time.Duration(expireSeconds) * time.Second).Unix(),
	}

	if s.redis != nil {
		bytes, _ := json.Marshal(result)
		ttl := time.Duration(expireSeconds) * time.Second
		if ttl > time.Minute {
			ttl -= time.Minute
		}
		_ = s.redis.Set(ctx, cacheKey, bytes, ttl).Err()
	}

	return result, nil
}

func (s *RTCService) SDKAppID() uint32 {
	return s.cfg.SDKAppID
}

func buildRTCUserID(role string, principalID uint64) string {
	if role == "doctor" {
		return fmt.Sprintf("doctor_%d", principalID)
	}
	return fmt.Sprintf("user_%d", principalID)
}
