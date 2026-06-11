import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart'
    as models;

sealed class AuthState {
  const AuthState();
}

final class AuthUnknown extends AuthState {
  const AuthUnknown();
}

final class AuthLoading extends AuthState {
  const AuthLoading();
}

final class Authenticated extends AuthState {
  const Authenticated({
    required this.user,
    required this.tokens,
  });

  final models.AuthenticatedUser user;
  final models.TokenPair tokens;
}

final class Unauthenticated extends AuthState {
  const Unauthenticated();
}

final class AuthFailed extends AuthState {
  const AuthFailed(this.message);

  final String message;
}
