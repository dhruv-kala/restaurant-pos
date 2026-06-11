abstract final class EmailValidator {
  static final RegExp _pattern = RegExp(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$",
  );

  static bool isValid(String value) => _pattern.hasMatch(value.trim());
}
