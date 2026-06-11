# Kitchen Feature

Station-aware kitchen queue, item/order preparation transitions, realtime
refresh, station configuration, timers, SLA colors, and analytics foundation.

REST remains authoritative. Socket.IO events invalidate Riverpod projections
and cause a fresh scoped queue read.
