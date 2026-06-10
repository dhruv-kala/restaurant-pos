class MenuItem {
  const MenuItem({
    required this.id,
    required this.name,
    required this.priceMinor,
    required this.category,
    required this.emoji,
  });

  final String id;
  final String name;
  final int priceMinor;
  final String category;
  final String emoji;
}
