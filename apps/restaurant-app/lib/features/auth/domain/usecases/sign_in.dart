import 'package:restaurant_pos_auth/restaurant_pos_auth.dart'
    show AuthenticatedUser;
import 'package:restaurant_pos_core/restaurant_pos_core.dart';

import '../repositories/auth_repository.dart';

class SignIn {
  const SignIn(this._repository);

  final AuthRepository _repository;

  Future<AuthenticatedUser> call({
    required String email,
    required String password,
  }) {
    final normalizedEmail = email.trim();

    if (normalizedEmail.isEmpty || password.isEmpty) {
      throw const AppException('Email and password are required.');
    }

    return _repository.signIn(email: normalizedEmail, password: password);
  }
}
