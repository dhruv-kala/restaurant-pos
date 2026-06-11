import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:restaurant_pos_api_client/restaurant_pos_api_client.dart';

import '../repositories/auth_repository.dart';
import '../repositories/auth_repository_impl.dart';
import '../services/token_storage.dart';
import '../state/auth_notifier.dart';
import '../state/auth_state.dart';

final Provider<ApiClientConfig> apiClientConfigProvider =
    Provider<ApiClientConfig>((ref) {
      throw StateError(
        'apiClientConfigProvider must be overridden by the app.',
      );
    });

final Provider<TokenStorage> tokenStorageProvider = Provider<TokenStorage>((
  ref,
) {
  return const SecureTokenStorage();
});

final Provider<Dio> dioProvider = Provider<Dio>((ref) {
  final config = ref.watch(apiClientConfigProvider);
  final tokenStorage = ref.watch(tokenStorageProvider);
  final client = DioClient(config: config);
  final refreshClient = DioClient(config: config);

  client.dio.interceptors.addAll(<Interceptor>[
    AuthInterceptor(
      dio: client.dio,
      refreshDio: refreshClient.dio,
      tokenManager: tokenStorage,
      onSessionExpired: () async {
        await ref.read(authNotifierProvider.notifier).handleSessionExpired();
      },
    ),
    ErrorInterceptor(),
  ]);

  ref.onDispose(() {
    client.dio.close(force: true);
    refreshClient.dio.close(force: true);
  });
  return client.dio;
});

final Provider<AuthApiService> authApiServiceProvider =
    Provider<AuthApiService>((ref) {
      return AuthApiService(ref.watch(dioProvider));
    });

final Provider<AuthRepository> authRepositoryProvider =
    Provider<AuthRepository>((ref) {
      return AuthRepositoryImpl(
        apiService: ref.watch(authApiServiceProvider),
        tokenStorage: ref.watch(tokenStorageProvider),
      );
    });

final StateNotifierProvider<AuthNotifier, AuthState> authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
      return AuthNotifier(
        repository: ref.watch(authRepositoryProvider),
        tokenStorage: ref.watch(tokenStorageProvider),
      );
    });
