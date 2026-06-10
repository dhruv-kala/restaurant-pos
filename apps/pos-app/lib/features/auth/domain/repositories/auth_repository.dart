import '../entities/authenticated_user.dart';

abstract interface class AuthRepository {
  Future<AuthenticatedUser> signIn({
    required String email,
    required String password,
  });
}
