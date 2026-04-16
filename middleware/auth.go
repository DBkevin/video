package middleware

import (
	"strings"

	jwtpkg "video-consult-mvp/pkg/jwt"
	"video-consult-mvp/pkg/response"

	"github.com/gin-gonic/gin"
)

const ContextClaimsKey = "auth_claims"

type AuthMiddleware struct {
	jwtManager *jwtpkg.Manager
}

func NewAuthMiddleware(jwtManager *jwtpkg.Manager) *AuthMiddleware {
	return &AuthMiddleware{jwtManager: jwtManager}
}

func (m *AuthMiddleware) Handle() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "请先登录")
			c.Abort()
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer"))
		if token == "" {
			response.Unauthorized(c, "令牌格式不正确")
			c.Abort()
			return
		}

		claims, err := m.jwtManager.ParseToken(token)
		if err != nil {
			response.Unauthorized(c, "令牌已失效，请重新登录")
			c.Abort()
			return
		}

		c.Set(ContextClaimsKey, claims)
		c.Next()
	}
}

func (m *AuthMiddleware) RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			response.Unauthorized(c, "登录状态无效")
			c.Abort()
			return
		}

		if claims.Role != role {
			response.Forbidden(c, "无权限访问当前接口")
			c.Abort()
			return
		}

		c.Next()
	}
}

func GetClaims(c *gin.Context) (*jwtpkg.Claims, bool) {
	rawClaims, exists := c.Get(ContextClaimsKey)
	if !exists {
		return nil, false
	}

	claims, ok := rawClaims.(*jwtpkg.Claims)
	return claims, ok
}
