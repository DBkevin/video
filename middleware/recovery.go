package middleware

import (
	"fmt"
	"net/http"

	"video-consult-mvp/pkg/response"

	"github.com/gin-gonic/gin"
)

func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				response.Fail(c, http.StatusInternalServerError, fmt.Sprintf("服务内部错误: %v", err))
				c.Abort()
			}
		}()

		c.Next()
	}
}
