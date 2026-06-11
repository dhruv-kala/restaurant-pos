import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

abstract interface class TokenStorage implements TokenManager {
  Future<void> saveTokens(TokenPair tokens);

  @override
  Future<String?> getAccessToken();

  @override
  Future<String?> getRefreshToken();

  @override
  Future<void> clearTokens();
}

class SecureTokenStorage implements TokenStorage {
  const SecureTokenStorage({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
  }) : _storage = storage;

  static const _accessTokenKey = 'restaurant_pos_access_token';
  static const _refreshTokenKey = 'restaurant_pos_refresh_token';

  final FlutterSecureStorage _storage;

  @override
  Future<void> clearTokens() {
    return Future.wait<void>(<Future<void>>[
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
    ]);
  }

  @override
  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);

  @override
  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  @override
  Future<void> saveTokens(TokenPair tokens) {
    return Future.wait<void>(<Future<void>>[
      _storage.write(key: _accessTokenKey, value: tokens.accessToken),
      _storage.write(key: _refreshTokenKey, value: tokens.refreshToken),
    ]);
  }

  @override
  Future<void> saveTokenPair(TokenPair tokens) => saveTokens(tokens);
}
