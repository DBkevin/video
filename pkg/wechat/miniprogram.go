package wechat

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"video-consult-mvp/config"
)

type Code2SessionResult struct {
	OpenID     string
	UnionID    string
	SessionKey string
	IsMock     bool
}

type MiniProgramClient struct {
	cfg        config.WeChatMiniProgramConfig
	httpClient *http.Client
}

type code2SessionResponse struct {
	OpenID     string `json:"openid"`
	UnionID    string `json:"unionid"`
	SessionKey string `json:"session_key"`
	ErrCode    int64  `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

func NewMiniProgramClient(cfg config.WeChatMiniProgramConfig) *MiniProgramClient {
	return &MiniProgramClient{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *MiniProgramClient) Code2Session(ctx context.Context, code string) (*Code2SessionResult, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return nil, fmt.Errorf("code 不能为空")
	}

	// 本地调试时允许通过 mock_ 前缀生成稳定的 OpenID，便于在未配置微信密钥时联调小程序链路。
	if strings.HasPrefix(code, "mock_") {
		mockIdentity := strings.TrimPrefix(code, "mock_")
		return c.mockCode2Session(mockIdentity), nil
	}

	// TODO: 生产环境请配置 WECHAT_MINIAPP_APP_ID / WECHAT_MINIAPP_APP_SECRET，
	// 然后通过微信官方 jscode2session 接口获取用户真实 openid/session_key。
	if c.cfg.AppID == "" || c.cfg.AppSecret == "" {
		return c.mockCode2Session(code), nil
	}

	endpoint := "https://api.weixin.qq.com/sns/jscode2session"
	query := url.Values{}
	query.Set("appid", c.cfg.AppID)
	query.Set("secret", c.cfg.AppSecret)
	query.Set("js_code", code)
	query.Set("grant_type", "authorization_code")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"?"+query.Encode(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result code2SessionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if result.ErrCode != 0 {
		return nil, fmt.Errorf("微信 code2session 失败: %s(%d)", result.ErrMsg, result.ErrCode)
	}
	if result.OpenID == "" {
		return nil, fmt.Errorf("微信 code2session 未返回 openid")
	}

	return &Code2SessionResult{
		OpenID:     result.OpenID,
		UnionID:    result.UnionID,
		SessionKey: result.SessionKey,
		IsMock:     false,
	}, nil
}

func (c *MiniProgramClient) mockCode2Session(seed string) *Code2SessionResult {
	digest := sha1.Sum([]byte(c.cfg.MockLoginSalt + ":" + seed))
	openID := "mock_" + hex.EncodeToString(digest[:])[:24]

	return &Code2SessionResult{
		OpenID:  openID,
		UnionID: "",
		IsMock:  true,
	}
}
