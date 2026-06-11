import 'package:restaurant_pos_shared_models/restaurant_pos_shared_models.dart'
    as models;

abstract interface class AuthRepository {
  Future<models.AuthResponse> login({
    required String email,
    required String password,
  });

  Future<models.TokenPair> refreshToken();

  Future<models.AuthenticatedUser> getCurrentUser();

  Future<void> logout();
}
