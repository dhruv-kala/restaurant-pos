import 'authenticated_user.dart';
import 'token_pair.dart';

class AuthResponse {
  const AuthResponse({required this.user, required this.tokens});

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      user: AuthenticatedUser.fromJson(_requiredMap(json, 'user')),
      tokens: TokenPair.fromJson(json),
    );
  }

  final AuthenticatedUser user;
  final TokenPair tokens;

  Map<String, dynamic> toJson() => <String, dynamic>{
    'user': user.toJson(),
    ...tokens.toJson(),
  };
}

Map<String, dynamic> _requiredMap(Map<String, dynamic> json, String key) {
  final value = json[key];
  if (value is Map<String, dynamic>) {
    return value;
  }
  throw FormatException('Expected an object for "$key".');
}
