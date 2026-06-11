import 'package:flutter/material.dart';

class AppButton extends StatelessWidget {
  const AppButton({
    required this.label,
    required this.onPressed,
    super.key,
    this.icon,
    this.isLoading = false,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? const SizedBox.square(
            dimension: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
        : Text(label);
    final button = icon == null
        ? FilledButton(onPressed: isLoading ? null : onPressed, child: child)
        : FilledButton.icon(
            onPressed: isLoading ? null : onPressed,
            icon: Icon(icon),
            label: child,
          );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}
