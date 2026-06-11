import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart'
    as models;

import '../services/token_storage.dart';
import 'auth_repository.dart';

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({
    required AuthApiService apiService,
    required TokenStorage tokenStorage,
  }) : _apiService = apiService,
       _tokenStorage = tokenStorage;

  final AuthApiService _apiService;
  final TokenStorage _tokenStorage;

  @override
  Future<models.AuthenticatedUser> getCurrentUser() {
    return _apiService.currentUser();
  }

  @override
  Future<models.AuthResponse> login({
    required String email,
    required String password,
  }) {
    return _apiService.login(email: email, password: password);
  }

  @override
  Future<void> logout() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken != null) {
      await _apiService.logout(refreshToken);
    }
  }

  @override
  Future<models.TokenPair> refreshToken() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null) {
      throw const FormatException('No refresh token is available.');
    }
    final tokens = await _apiService.refresh(refreshToken);
    await _tokenStorage.saveTokens(tokens);
    return tokens;
  }
}
