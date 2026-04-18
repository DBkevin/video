package jwt

import (
	"fmt"
	"time"

	"video-consult-mvp/config"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID    uint64 `json:"user_id"`
	Role      string `json:"role"`
	Platform  string `json:"platform,omitempty"`
	OpenID    string `json:"openid,omitempty"`
	UnionID   string `json:"unionid,omitempty"`
	Nickname  string `json:"nickname,omitempty"`
	AvatarURL string `json:"avatar_url,omitempty"`
	jwtlib.RegisteredClaims
}

type TokenOptions struct {
	Platform  string
	OpenID    string
	UnionID   string
	Nickname  string
	AvatarURL string
}

type Manager struct {
	secret      string
	issuer      string
	expireHours int
}

func NewManager(cfg config.JWTConfig) *Manager {
	return &Manager{
		secret:      cfg.Secret,
		issuer:      cfg.Issuer,
		expireHours: cfg.ExpireHours,
	}
}

func (m *Manager) GenerateToken(userID uint64, role string) (string, int64, error) {
	return m.GenerateTokenWithOptions(userID, role, TokenOptions{})
}

func (m *Manager) GenerateTokenWithOptions(userID uint64, role string, options TokenOptions) (string, int64, error) {
	now := time.Now()
	expiresAt := now.Add(time.Duration(m.expireHours) * time.Hour)

	claims := &Claims{
		UserID:    userID,
		Role:      role,
		Platform:  options.Platform,
		OpenID:    options.OpenID,
		UnionID:   options.UnionID,
		Nickname:  options.Nickname,
		AvatarURL: options.AvatarURL,
		RegisteredClaims: jwtlib.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   fmt.Sprintf("%d", userID),
			IssuedAt:  jwtlib.NewNumericDate(now),
			ExpiresAt: jwtlib.NewNumericDate(expiresAt),
		},
	}

	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(m.secret))
	if err != nil {
		return "", 0, err
	}

	return tokenString, expiresAt.Unix(), nil
}

func (m *Manager) ParseToken(tokenString string) (*Claims, error) {
	token, err := jwtlib.ParseWithClaims(tokenString, &Claims{}, func(token *jwtlib.Token) (interface{}, error) {
		return []byte(m.secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("token 无效")
	}

	return claims, nil
}
