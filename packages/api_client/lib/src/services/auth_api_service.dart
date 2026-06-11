import 'package:dio/dio.dart';
import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

import '../api_endpoints.dart';

class AuthApiService {
  const AuthApiService(this._dio);

  final Dio _dio;

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.login,
      data: <String, dynamic>{'email': email, 'password': password},
    );
    return AuthResponse.fromJson(_responseMap(response));
  }

  Future<TokenPair> refresh(String refreshToken) async {
    final response = await _dio.post<Object?>(
      ApiEndpoints.refresh,
      data: <String, dynamic>{'refreshToken': refreshToken},
    );
    return TokenPair.fromJson(_responseMap(response));
  }

  Future<void> logout(String refreshToken) async {
    await _dio.post<Object?>(
      ApiEndpoints.logout,
      data: <String, dynamic>{'refreshToken': refreshToken},
    );
  }

  Future<AuthenticatedUser> currentUser() async {
    final response = await _dio.get<Object?>(ApiEndpoints.currentUser);
    return AuthenticatedUser.fromJson(_responseMap(response));
  }
}

Map<String, dynamic> _responseMap(Response<Object?> response) {
  final data = response.data;
  if (data is Map<String, dynamic>) {
    return data;
  }
  throw const FormatException('Expected an object response.');
}
