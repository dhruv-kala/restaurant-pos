import 'package:dio/dio.dart';

import 'api_client_config.dart';

class DioClient {
  DioClient({
    required ApiClientConfig config,
    Iterable<Interceptor> interceptors = const <Interceptor>[],
  }) : dio = Dio(
         BaseOptions(
           baseUrl: config.baseUrl,
           connectTimeout: config.connectTimeout,
           receiveTimeout: config.receiveTimeout,
           sendTimeout: config.sendTimeout,
           contentType: Headers.jsonContentType,
           responseType: ResponseType.json,
         ),
       ) {
    dio.interceptors.addAll(interceptors);
  }

  final Dio dio;
}
