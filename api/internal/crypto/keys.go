package crypto

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"math/big"
)

const (
	KeySize = 2048
)

// KeyManager handles RSA key pair management for JWT signing
type KeyManager struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	keyID      string
}

// JWK represents a JSON Web Key
type JWK struct {
	Kty string `json:"kty"`
	Use string `json:"use"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// JWKSResponse represents the JWKS endpoint response
type JWKSResponse struct {
	Keys []JWK `json:"keys"`
}

// NewKeyManager creates a new KeyManager
func NewKeyManager() *KeyManager {
	return &KeyManager{}
}

// LoadFromPEM loads an RSA private key from PEM-encoded string
func (km *KeyManager) LoadFromPEM(privateKeyPEM string) error {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return fmt.Errorf("failed to decode PEM block")
	}

	var privateKey *rsa.PrivateKey
	var err error

	switch block.Type {
	case "RSA PRIVATE KEY":
		privateKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
	case "PRIVATE KEY":
		key, parseErr := x509.ParsePKCS8PrivateKey(block.Bytes)
		if parseErr != nil {
			return fmt.Errorf("failed to parse PKCS8 private key: %w", parseErr)
		}
		var ok bool
		privateKey, ok = key.(*rsa.PrivateKey)
		if !ok {
			return fmt.Errorf("key is not an RSA private key")
		}
	default:
		return fmt.Errorf("unsupported key type: %s", block.Type)
	}

	if err != nil {
		return fmt.Errorf("failed to parse private key: %w", err)
	}

	km.privateKey = privateKey
	km.publicKey = &privateKey.PublicKey
	km.keyID = km.generateKeyID()

	return nil
}

// GenerateKeyPair generates a new RSA key pair (for development)
func (km *KeyManager) GenerateKeyPair() error {
	privateKey, err := rsa.GenerateKey(rand.Reader, KeySize)
	if err != nil {
		return fmt.Errorf("failed to generate RSA key pair: %w", err)
	}

	km.privateKey = privateKey
	km.publicKey = &privateKey.PublicKey
	km.keyID = km.generateKeyID()

	return nil
}

// generateKeyID creates a unique key ID based on the public key thumbprint
func (km *KeyManager) generateKeyID() string {
	if km.publicKey == nil {
		return ""
	}

	// Create thumbprint from public key components
	nBytes := km.publicKey.N.Bytes()
	eBytes := big.NewInt(int64(km.publicKey.E)).Bytes()

	hash := sha256.New()
	hash.Write(nBytes)
	hash.Write(eBytes)

	return base64.RawURLEncoding.EncodeToString(hash.Sum(nil))[:16]
}

// GetPrivateKey returns the private key for signing
func (km *KeyManager) GetPrivateKey() *rsa.PrivateKey {
	return km.privateKey
}

// GetPublicKey returns the public key for verification
func (km *KeyManager) GetPublicKey() *rsa.PublicKey {
	return km.publicKey
}

// GetKeyID returns the key identifier
func (km *KeyManager) GetKeyID() string {
	return km.keyID
}

// GetJWKS returns the JSON Web Key Set for the public key
func (km *KeyManager) GetJWKS() JWKSResponse {
	if km.publicKey == nil {
		return JWKSResponse{Keys: []JWK{}}
	}

	jwk := JWK{
		Kty: "RSA",
		Use: "sig",
		Kid: km.keyID,
		Alg: "RS256",
		N:   base64.RawURLEncoding.EncodeToString(km.publicKey.N.Bytes()),
		E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(km.publicKey.E)).Bytes()),
	}

	return JWKSResponse{Keys: []JWK{jwk}}
}

// ExportPrivateKeyPEM exports the private key in PEM format (for backup/storage)
func (km *KeyManager) ExportPrivateKeyPEM() (string, error) {
	if km.privateKey == nil {
		return "", fmt.Errorf("no private key loaded")
	}

	privateKeyBytes := x509.MarshalPKCS1PrivateKey(km.privateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyBytes,
	})

	return string(privateKeyPEM), nil
}

// IsLoaded returns true if keys are loaded
func (km *KeyManager) IsLoaded() bool {
	return km.privateKey != nil && km.publicKey != nil
}
