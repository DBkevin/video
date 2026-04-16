package usersig

import (
	"bytes"
	"compress/zlib"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type payload struct {
	Version    string `json:"TLS.ver"`
	Identifier string `json:"TLS.identifier"`
	SDKAppID   uint32 `json:"TLS.sdkappid"`
	Expire     int64  `json:"TLS.expire"`
	Timestamp  int64  `json:"TLS.time"`
	Signature  string `json:"TLS.sig"`
}

func Generate(sdkAppID uint32, identifier, secretKey string, expireSeconds int64) (string, error) {
	if sdkAppID == 0 {
		return "", fmt.Errorf("TRTC SDKAppID 未配置")
	}
	if identifier == "" {
		return "", fmt.Errorf("identifier 不能为空")
	}
	if secretKey == "" {
		return "", fmt.Errorf("TRTC SecretKey 未配置")
	}
	if expireSeconds <= 0 {
		return "", fmt.Errorf("expireSeconds 必须大于 0")
	}

	now := time.Now().Unix()

	// 这里按腾讯云 UserSig 规范拼接待签名字符串，确保密钥只在服务端参与签名。
	contentToBeSigned := fmt.Sprintf(
		"TLS.identifier:%s\nTLS.sdkappid:%d\nTLS.time:%d\nTLS.expire:%d\n",
		identifier,
		sdkAppID,
		now,
		expireSeconds,
	)

	mac := hmac.New(sha256.New, []byte(secretKey))
	if _, err := mac.Write([]byte(contentToBeSigned)); err != nil {
		return "", err
	}

	data := payload{
		Version:    "2.0",
		Identifier: identifier,
		SDKAppID:   sdkAppID,
		Expire:     expireSeconds,
		Timestamp:  now,
		Signature:  base64.StdEncoding.EncodeToString(mac.Sum(nil)),
	}

	jsonBytes, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	// 官方算法要求先 zlib 压缩，再做特殊字符替换后的 Base64 编码。
	var buffer bytes.Buffer
	writer := zlib.NewWriter(&buffer)
	if _, err = writer.Write(jsonBytes); err != nil {
		return "", err
	}
	if err = writer.Close(); err != nil {
		return "", err
	}

	encoded := base64.StdEncoding.EncodeToString(buffer.Bytes())
	encoded = strings.NewReplacer("+", "*", "/", "-", "=", "_").Replace(encoded)

	return encoded, nil
}
