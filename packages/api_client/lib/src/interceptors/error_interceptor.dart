import 'package:dio/dio.dart';
import 'package:restaurant_pos_core/restaurant_pos_core.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException error, ErrorInterceptorHandler handler) {
    error.requestOptions.extra['failure'] = mapFailure(error);
    handler.next(error);
  }

  static Failure mapFailure(DioException error) {
    final response = error.response;
    final data = response?.data;
    String message = error.message ?? 'The request failed.';
    String? code;

    if (data is Map<String, dynamic>) {
      final responseMessage = data['message'];
      final responseCode = data['code'];
      if (responseMessage is String) {
        message = responseMessage;
      } else if (responseMessage is List<dynamic>) {
        message = responseMessage.whereType<String>().join(', ');
      }
      if (responseCode is String) {
        code = responseCode;
      }
    }

    return Failure(
      message: message,
      code: code,
      statusCode: response?.statusCode,
      cause: error,
    );
  }
}
