import 'package:dio/dio.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:restaurant_pos_core/restaurant_pos_core.dart';

import '../repositories/auth_repository.dart';
import '../services/token_storage.dart';
import 'auth_state.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier({
    required AuthRepository repository,
    required TokenStorage tokenStorage,
  }) : _repository = repository,
       _tokenStorage = tokenStorage,
       super(const AuthState());

  final AuthRepository _repository;
  final TokenStorage _tokenStorage;

  Future<void> restoreSession() async {
    if (state.status == AuthStatus.loading) {
      return;
    }

    state = state.copyWith(status: AuthStatus.loading);
    final accessToken = await _tokenStorage.getAccessToken();
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (accessToken == null || refreshToken == null) {
      await _tokenStorage.clearTokens();
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    try {
      final user = await _repository.getCurrentUser();
      final currentAccessToken =
          await _tokenStorage.getAccessToken() ?? accessToken;
      final currentRefreshToken =
          await _tokenStorage.getRefreshToken() ?? refreshToken;
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
        accessToken: currentAccessToken,
        refreshToken: currentRefreshToken,
      );
    } on Object {
      await handleSessionExpired();
    }
  }

  Future<bool> login({required String email, required String password}) async {
    if (state.status == AuthStatus.loading) {
      return false;
    }

    state = state.copyWith(status: AuthStatus.loading);
    try {
      final response = await _repository.login(
        email: email.trim().toLowerCase(),
        password: password,
      );
      await _tokenStorage.saveTokens(response.tokens);
      state = AuthState(
        status: AuthStatus.authenticated,
        user: response.user,
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
      );
      return true;
    } on Object catch (error) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        errorMessage: _messageFor(error),
      );
      return false;
    }
  }

  Future<void> logout() async {
    if (state.status == AuthStatus.loading) {
      return;
    }

    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _repository.logout();
    } on Object {
      // Local logout must still complete when the API is unavailable.
    } finally {
      await handleSessionExpired();
    }
  }

  Future<void> handleSessionExpired() async {
    await _tokenStorage.clearTokens();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  void clearError() {
    if (state.errorMessage == null) {
      return;
    }
    state = AuthState(
      status: state.status,
      user: state.user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
    );
  }

  String _messageFor(Object error) {
    if (error is DioException) {
      final failure = error.requestOptions.extra['failure'];
      if (failure is Failure) {
        return switch (failure.statusCode) {
          401 => 'The email or password is incorrect.',
          408 => 'The request timed out. Try again.',
          500 || 502 || 503 || 504 => 'The service is temporarily unavailable.',
          _ => failure.message,
        };
      }
      return switch (error.type) {
        DioExceptionType.connectionError ||
        DioExceptionType.connectionTimeout ||
        DioExceptionType.receiveTimeout ||
        DioExceptionType.sendTimeout => 'Unable to reach the server.',
        _ => 'Authentication failed. Try again.',
      };
    }
    if (error is AppException) {
      return error.message;
    }
    return 'Authentication failed. Try again.';
  }
}
