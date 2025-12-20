# Permit - Auth as a Service

- Privy does Dogfooding
  response from /api/v1/apps/:id :

```json
{
  "id": "cla04x0d00002nyb6oofp5dqh",
  "name": "Privy",
  "logo_url": "https://auth.privy.io/logos/privy-logo.png",
  "icon_url": "https://imagedelivery.net/oHBRUd2clqykxgDWmeAyLg/2cdf059d-a7e2-4dde-19bc-528e8e726f00/icon",
  "terms_and_conditions_url": "https://www.privy.io/developer-terms-of-service",
  "privacy_policy_url": "https://www.privy.io/privacy-policy",
  "require_users_accept_terms": true,
  "theme": "System",
  "accent_color": "#696FFD",
  "show_wallet_login_first": false,
  "allowed_domains": [
    "https://dashboard.privy.io",
    "https://dashboard.privy-secondary.io"
  ],
  "allowed_native_app_ids": [],
  "allowed_native_app_url_schemes": [],
  "wallet_auth": false,
  "email_auth": true,
  "sms_auth": false,
  "guest_auth": true,
  "solana_wallet_auth": false,
  "telegram_auth": false,
  "disable_plus_emails": false,
  "google_oauth": false,
  "twitter_oauth": false,
  "discord_oauth": false,
  "github_oauth": false,
  "tiktok_oauth": false,
  "line_oauth": false,
  "twitch_oauth": false,
  "linkedin_oauth": false,
  "apple_oauth": false,
  "spotify_oauth": false,
  "instagram_oauth": false,
  "farcaster_auth": false,
  "passkey_auth": false,
  "passkeys_for_signup_enabled": false,
  "custom_jwt_auth": false,
  "allowlist_enabled": false,
  "allowlist_config": {
    "error_title": "Sign up to get access to Privy.",
    "error_detail": "We need some more information on your business in order to grant you access.",
    "cta_text": "Get started",
    "cta_link": "https://www.privy.io/signup"
  },
  "custom_oauth_providers": [],
  "wallet_connect_cloud_project_id": null,
  "custom_api_url": null,
  "embedded_wallet_config": {
    "create_on_login": "off",
    "ethereum": {
      "create_on_login": "off"
    },
    "solana": {
      "create_on_login": "off"
    },
    "user_owned_recovery_options": ["user-passcode"],
    "require_user_password_on_create": false,
    "require_user_owned_recovery_on_create": false,
    "mode": "legacy-embedded-wallets-only"
  },
  "enforce_wallet_uis": false,
  "legacy_wallet_ui_config": true,
  "fiat_on_ramp_enabled": false,
  "captcha_enabled": true,
  "enabled_captcha_provider": "hcaptcha",
  "twitter_oauth_on_mobile_enabled": false,
  "mfa_methods": ["totp", "passkey"],
  "captcha_site_key": "h:b9fc5a50-2e5c-457a-9582-80ce342c2534",
  "verification_key": "-----BEGIN PUBLIC KEY-----MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaMDYvl1scKQ+VDzknLBiq0OZuNlebF3sC3s2r9/IDixi4Em1ZDGm6FXe/Ncgw7gH7ir5e7mId3I81BX+MXmBsg==-----END PUBLIC KEY-----",
  "funding_config": {
    "default_recommended_currency": {
      "chain": "eip155:1",
      "asset": "native-currency"
    },
    "default_recommended_amount": "0.00033",
    "methods": ["moonpay", "coinbase-onramp"],
    "options": [],
    "prompt_funding_on_wallet_creation": false,
    "cross_chain_bridging_enabled": false
  },
  "max_linked_wallets_per_user": null,
  "farcaster_link_wallets_enabled": false,
  "whatsapp_enabled": false,
  "smart_wallet_config": {
    "enabled": false
  }
}
```

request from /api/v1/passwordless/init:
payload:

```json
{
  "email": "marcio.mj70@gmail.com",
  "token": "P1_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

# Auth com email ao invés de magic link, usam code de 6 digitos

# Project Permit (B2B2C - Business to Business to Consumer)
