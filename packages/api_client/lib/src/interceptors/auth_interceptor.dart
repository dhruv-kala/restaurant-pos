import 'package:dio/dio.dart';

abstract interface class AccessTokenProvider {
  Future<String?> getAccessToken();
}

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this.tokenProvider);

  final AccessTokenProvider tokenProvider;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final accessToken = await tokenProvider.getAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }
    handler.next(options);
  }
}
