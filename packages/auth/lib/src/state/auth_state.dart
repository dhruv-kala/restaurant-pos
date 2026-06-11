import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated }

class AuthState {
  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.accessToken,
    this.refreshToken,
    this.errorMessage,
  });

  final AuthStatus status;
  final AuthenticatedUser? user;
  final String? accessToken;
  final String? refreshToken;
  final String? errorMessage;

  AuthState copyWith({
    required AuthStatus status,
    AuthenticatedUser? user,
    String? accessToken,
    String? refreshToken,
    String? errorMessage,
  }) {
    return AuthState(
      status: status,
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
      errorMessage: errorMessage,
    );
  }
}
