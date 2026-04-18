package controller

import (
	"net/http"
	"strconv"

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

func parsePageQuery(c *gin.Context) (int, int) {
	page := 1
	pageSize := 10

	if raw := c.Query("page"); raw != "" {
		if value, err := strconv.Atoi(raw); err == nil && value > 0 {
			page = value
		}
	}
	if raw := c.Query("page_size"); raw != "" {
		if value, err := strconv.Atoi(raw); err == nil && value > 0 {
			pageSize = value
		}
	}
	return page, pageSize
}

func parseUintQuery(c *gin.Context, key string) uint64 {
	value, err := strconv.ParseUint(c.Query(key), 10, 64)
	if err != nil {
		return 0
	}
	return value
}
