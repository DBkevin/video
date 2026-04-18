package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server        ServerConfig
	MySQL         MySQLConfig
	Redis         RedisConfig
	JWT           JWTConfig
	Admin         AdminConfig
	TRTC          TRTCConfig
	TRTCRecording TRTCRecordingConfig
	Consult       ConsultConfig
	WeChat        WeChatMiniProgramConfig
}

type ServerConfig struct {
	Addr string
	Mode string
}

type MySQLConfig struct {
	DSN         string
	AutoMigrate bool
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

type AdminConfig struct {
	DefaultUsername string
	DefaultPassword string
	DefaultName     string
	AutoSeed        bool
}

type TRTCConfig struct {
	SDKAppID        uint32
	SecretKey       string
	UserSigExpireIn int64
}

type TRTCRecordingConfig struct {
	Enabled             bool
	SecretID            string
	SecretKey           string
	CallbackKey         string
	Region              string
	ResourceExpiredHour int64
	MaxIdleTime         int64
	MixWidth            int64
	MixHeight           int64
	MixFPS              int64
	MixBitrate          int64
	MixLayoutMode       int64
	VODSubAppID         uint64
	VODExpireTime       int64
	CallbackURL         string
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
			DSN:         getString("MYSQL_DSN", "root:123456@tcp(127.0.0.1:3306)/video_consult_mvp?charset=utf8mb4&parseTime=True&loc=Asia%2FShanghai"),
			AutoMigrate: getBool("MYSQL_AUTO_MIGRATE", true),
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
		Admin: AdminConfig{
			DefaultUsername: getString("ADMIN_DEFAULT_USERNAME", "admin"),
			DefaultPassword: getString("ADMIN_DEFAULT_PASSWORD", "admin123456"),
			DefaultName:     getString("ADMIN_DEFAULT_NAME", "系统管理员"),
			AutoSeed:        getBool("ADMIN_AUTO_SEED", true),
		},
		TRTC: TRTCConfig{
			SDKAppID:        uint32(getInt("TRTC_SDK_APP_ID", 0)),
			SecretKey:       getString("TRTC_SECRET_KEY", ""),
			UserSigExpireIn: getInt64("TRTC_USER_SIG_EXPIRE", 86400),
		},
		TRTCRecording: TRTCRecordingConfig{
			Enabled:             getBool("TRTC_RECORDING_ENABLED", true),
			SecretID:            getString("TRTC_RECORDING_SECRET_ID", ""),
			SecretKey:           getString("TRTC_RECORDING_SECRET_KEY", ""),
			CallbackKey:         getString("TRTC_RECORDING_CALLBACK_KEY", ""),
			Region:              getString("TRTC_RECORDING_REGION", "ap-shanghai"),
			ResourceExpiredHour: getInt64("TRTC_RECORDING_RESOURCE_EXPIRED_HOUR", 72),
			MaxIdleTime:         getInt64("TRTC_RECORDING_MAX_IDLE_TIME", 30),
			MixWidth:            getInt64("TRTC_RECORDING_MIX_WIDTH", 720),
			MixHeight:           getInt64("TRTC_RECORDING_MIX_HEIGHT", 1280),
			MixFPS:              getInt64("TRTC_RECORDING_MIX_FPS", 15),
			MixBitrate:          getInt64("TRTC_RECORDING_MIX_BITRATE", 1200),
			MixLayoutMode:       getInt64("TRTC_RECORDING_MIX_LAYOUT_MODE", 3),
			VODSubAppID:         getUint64("TRTC_RECORDING_VOD_SUB_APP_ID", 0),
			VODExpireTime:       getInt64("TRTC_RECORDING_VOD_EXPIRE_TIME", 0),
			CallbackURL:         getString("TRTC_RECORDING_CALLBACK_URL", ""),
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

func getUint64(key string, fallback uint64) uint64 {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseUint(value, 10, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func getBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
