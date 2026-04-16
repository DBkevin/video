package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server  ServerConfig
	MySQL   MySQLConfig
	Redis   RedisConfig
	JWT     JWTConfig
	TRTC    TRTCConfig
	Consult ConsultConfig
	WeChat  WeChatMiniProgramConfig
}

type ServerConfig struct {
	Addr string
	Mode string
}

type MySQLConfig struct {
	DSN string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret      string
	Issuer      string
	ExpireHours int
}

type TRTCConfig struct {
	SDKAppID        uint32
	SecretKey       string
	UserSigExpireIn int64
}

type ConsultConfig struct {
	SessionExpireMinutes int64
	EntryPagePath        string
}

type WeChatMiniProgramConfig struct {
	AppID         string
	AppSecret     string
	MockLoginSalt string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		Server: ServerConfig{
			Addr: getString("SERVER_ADDR", ":8080"),
			Mode: getString("GIN_MODE", "debug"),
		},
		MySQL: MySQLConfig{
			DSN: getString("MYSQL_DSN", "root:123456@tcp(127.0.0.1:3306)/video_consult_mvp?charset=utf8mb4&parseTime=True&loc=Local"),
		},
		Redis: RedisConfig{
			Addr:     getString("REDIS_ADDR", "127.0.0.1:6379"),
			Password: getString("REDIS_PASSWORD", ""),
			DB:       getInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:      getString("JWT_SECRET", "please-change-me"),
			Issuer:      getString("JWT_ISSUER", "video-consult-mvp"),
			ExpireHours: getInt("JWT_EXPIRE_HOURS", 72),
		},
		TRTC: TRTCConfig{
			SDKAppID:        uint32(getInt("TRTC_SDK_APP_ID", 0)),
			SecretKey:       getString("TRTC_SECRET_KEY", ""),
			UserSigExpireIn: getInt64("TRTC_USER_SIG_EXPIRE", 86400),
		},
		Consult: ConsultConfig{
			SessionExpireMinutes: getInt64("CONSULT_SESSION_EXPIRE_MINUTES", 120),
			EntryPagePath:        getString("CONSULT_ENTRY_PAGE_PATH", "/pages/customer-entry/index"),
		},
		WeChat: WeChatMiniProgramConfig{
			AppID:         getString("WECHAT_MINIAPP_APP_ID", ""),
			AppSecret:     getString("WECHAT_MINIAPP_APP_SECRET", ""),
			MockLoginSalt: getString("WECHAT_MINIAPP_MOCK_LOGIN_SALT", "video-consult-mvp"),
		},
	}, nil
}

func getString(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getInt64(key string, fallback int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}
