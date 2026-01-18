# Permit API - (B2B2C - Business to Business to Consumer)

## Study

- Protocolos: Entender o básico de OAuth 2.0 e OIDC (especialmente o conceito de Authorization Code Flow e IdP).
- Criptografia: Entender a diferença entre assinatura simétrica (HS256) e assimétrica (RS256) em JWTs. Você vai precisar da assimétrica para os SDKs funcionarem offline.
- Segurança Web: Aprofundar em CORS, CSRF e Cookies HttpOnly.
- Arquitetura: Estudar Modular Monolith para não misturar o código do "Painel do Cliente" com o "Motor de Login".

## Foundation (Tenant)

### Projects

- [ ] Create Project

## Auth Core (OTP)

- [ ] hash de client secret key using argon2
- [ ] Send OTP 6 figures code by email
