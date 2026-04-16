package controller

import (
	"net/http"

	"video-consult-mvp/pkg/response"
	"video-consult-mvp/service"

	"github.com/gin-gonic/gin"
)

func writeServiceError(c *gin.Context, err error) {
	statusCode := service.GetStatusCode(err)
	message := err.Error()
	if statusCode >= http.StatusInternalServerError {
		message = "服务器繁忙，请稍后再试"
	}
	response.Fail(c, statusCode, message)
}
