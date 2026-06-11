import 'package:restaurant_pos_auth/restaurant_pos_auth.dart'
    show AuthenticatedUser;

abstract interface class AuthRepository {
  Future<AuthenticatedUser> signIn({
    required String email,
    required String password,
  });
}
