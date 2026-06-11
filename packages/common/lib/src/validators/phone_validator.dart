abstract final class PhoneValidator {
  static final RegExp _e164Pattern = RegExp(r'^\+[1-9][0-9]{7,14}$');

  static bool isValidE164(String value) => _e164Pattern.hasMatch(value.trim());
}
