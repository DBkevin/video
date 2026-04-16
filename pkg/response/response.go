package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Envelope struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, message string, data interface{}) {
	JSON(c, http.StatusOK, message, data)
}

func BadRequest(c *gin.Context, message string) {
	JSON(c, http.StatusBadRequest, message, nil)
}

func Unauthorized(c *gin.Context, message string) {
	JSON(c, http.StatusUnauthorized, message, nil)
}

func Forbidden(c *gin.Context, message string) {
	JSON(c, http.StatusForbidden, message, nil)
}

func Fail(c *gin.Context, statusCode int, message string) {
	JSON(c, statusCode, message, nil)
}

func JSON(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, Envelope{
		Code:    statusCode,
		Message: message,
		Data:    data,
	})
}
