import 'dart:async';

import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

abstract interface class AccessTokenProvider {
  Future<String?> getAccessToken();
}

abstract interface class TokenManager implements AccessTokenProvider {
  Future<String?> getRefreshToken();

  Future<void> saveTokenPair(TokenPair tokens);

  Future<void> clearTokens();
}

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required Dio dio,
    required Dio refreshDio,
    required TokenManager tokenManager,
    required Future<void> Function() onSessionExpired,
  }) : _dio = dio,
       _refreshDio = refreshDio,
       _tokenManager = tokenManager,
       _onSessionExpired = onSessionExpired;

  static const _retriedKey = 'auth_retried';

  final Dio _dio;
  final Dio _refreshDio;
  final TokenManager _tokenManager;
  final Future<void> Function() _onSessionExpired;
  Completer<String?>? _refreshCompleter;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final accessToken = await _tokenManager.getAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final options = error.requestOptions;
    final shouldRefresh =
        error.response?.statusCode == 401 &&
        options.extra[_retriedKey] != true &&
        !_isPublicAuthPath(options.path);

    if (!shouldRefresh) {
      handler.next(error);
      return;
    }

    final accessToken = await _refreshAccessToken();
    if (accessToken == null) {
      await _expireSession();
      handler.next(error);
      return;
    }

    try {
      options.extra[_retriedKey] = true;
      options.headers['Authorization'] = 'Bearer $accessToken';
      final response = await _dio.fetch<Object?>(options);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  bool _isPublicAuthPath(String path) {
    return path.endsWith(ApiEndpoints.login) ||
        path.endsWith(ApiEndpoints.refresh) ||
        path.endsWith(ApiEndpoints.logout);
  }

  Future<String?> _refreshAccessToken() async {
    final activeRefresh = _refreshCompleter;
    if (activeRefresh != null) {
      return activeRefresh.future;
    }

    final completer = Completer<String?>();
    _refreshCompleter = completer;
    try {
      final refreshToken = await _tokenManager.getRefreshToken();
      if (refreshToken == null) {
        completer.complete(null);
        return completer.future;
      }

      final response = await _refreshDio.post<Object?>(
        ApiEndpoints.refresh,
        data: <String, dynamic>{'refreshToken': refreshToken},
      );
      final data = response.data;
      if (data is! Map<String, dynamic>) {
        completer.complete(null);
        return completer.future;
      }

      final tokens = TokenPair.fromJson(data);
      await _tokenManager.saveTokenPair(tokens);
      completer.complete(tokens.accessToken);
      return completer.future;
    } on Object {
      completer.complete(null);
      return completer.future;
    } finally {
      _refreshCompleter = null;
    }
  }

  Future<void> _expireSession() async {
    await _tokenManager.clearTokens();
    await _onSessionExpired();
  }
}
