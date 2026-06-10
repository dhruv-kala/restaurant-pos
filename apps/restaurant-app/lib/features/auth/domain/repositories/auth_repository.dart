import 'package:serveiq_auth/serveiq_auth.dart';

abstract interface class AuthRepository {
  Future<AuthenticatedUser> signIn({
    required String email,
    required String password,
  });
}
