class CartTotals {
  const CartTotals({
    required this.subtotalMinor,
    required this.taxMinor,
    required this.serviceChargeMinor,
  });

  final int subtotalMinor;
  final int taxMinor;
  final int serviceChargeMinor;

  int get totalMinor => subtotalMinor + taxMinor + serviceChargeMinor;
}
