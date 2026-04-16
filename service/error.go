package service

import (
	"errors"
	"net/http"

	mysqlDriver "github.com/go-sql-driver/mysql"
)

type BizError struct {
	StatusCode int
	Message    string
}

func (e *BizError) Error() string {
	return e.Message
}

func NewBizError(statusCode int, message string) error {
	return &BizError{
		StatusCode: statusCode,
		Message:    message,
	}
}

func GetStatusCode(err error) int {
	var bizErr *BizError
	if errors.As(err, &bizErr) {
		return bizErr.StatusCode
	}
	return http.StatusInternalServerError
}

func HandleDBError(err error, duplicateMessage string) error {
	if err == nil {
		return nil
	}

	var mysqlErr *mysqlDriver.MySQLError
	if errors.As(err, &mysqlErr) {
		switch mysqlErr.Number {
		case 1062:
			if duplicateMessage == "" {
				duplicateMessage = "数据重复，请稍后重试"
			}
			return NewBizError(http.StatusConflict, duplicateMessage)
		}
	}

	return err
}
